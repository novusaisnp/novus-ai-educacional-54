import { supabase } from '@/integrations/supabase/client';
import { erpEmit } from '@/integrations/erp/emit';
import { getEmpresaLogoUrl } from '@/integrations/erp/getEmpresaLogo';
import {
  DEFAULT_TEMPLATE_BODY,
  renderContractText,
  hashContractText,
} from './enrollmentContractTemplate';
import { generateEnrollmentContractPdf } from './generateEnrollmentContractPdf';
import { toLocalISODate } from '@/lib/utils';

// Logo é decoração do PDF, nunca deve travar a assinatura do contrato — se o
// fetch falhar ou demorar, segue sem logo. Prioridade: logo real do ERP
// (mesma identidade visual cadastrada no onboarding de empresa representada);
// se a integração ERP não estiver configurada pra esta organização, cai pro
// `organizations.logo_url` (definido manualmente, fallback pra quem roda sem
// integração ERP nenhuma).
async function fetchLogoBytesSafely(orgId: string, fallbackLogoUrl?: string | null): Promise<Uint8Array | null> {
  const urlToTry = (await getEmpresaLogoUrl(orgId)) || fallbackLogoUrl || null;
  if (!urlToTry) return null;

  try {
    const response = await fetch(urlToTry);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (error) {
    console.warn('[ERP] Falha ao baixar logo da empresa:', error);
    return null;
  }
}

interface SignEnrollmentContractInput {
  orgId: string;
  organizationName: string;
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentBirthDate?: string;
  guardianId?: string;
  guardianName?: string;
  guardianCpf?: string | null;
  className: string;
  monthlyFeeAmount: number;
  dueDay: number;
  enrollmentDate: string;
  signerName: string;
  activeTemplate?: { id: string; body: string } | null;
  fallbackLogoUrl?: string | null;
}

// Vencimento: dia `dueDay` do mês corrente, ou do mês seguinte se esse dia já
// passou (regra simples pra 1ª mensalidade/taxa avulsa gerada no ato da matrícula).
function computeNextDueDate(dueDay: number): string {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (candidate < now) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return toLocalISODate(candidate);
}

/**
 * Assina eletronicamente o contrato de matrícula (nome digitado + aceite +
 * hash do texto + timestamp do servidor), gera e anexa o PDF, e dispara um
 * título avulso no ERP (1ª mensalidade). A gravação do contrato (passos 1-4)
 * precisa funcionar pra matrícula ser considerada concluída; a chamada ao ERP
 * (passo 5) nunca quebra o fluxo principal, mesmo padrão de
 * createGuardianForStudent.ts.
 */
export async function signEnrollmentContract(input: SignEnrollmentContractInput) {
  const templateBody = input.activeTemplate?.body || DEFAULT_TEMPLATE_BODY;
  const contractText = renderContractText(templateBody, {
    organizationName: input.organizationName,
    studentName: input.studentName,
    studentBirthDate: input.studentBirthDate,
    guardianName: input.guardianName,
    guardianCpf: input.guardianCpf || undefined,
    className: input.className,
    monthlyFeeAmount: input.monthlyFeeAmount,
    dueDay: input.dueDay,
    enrollmentDate: input.enrollmentDate,
  });
  const contractHash = await hashContractText(contractText);

  // 1) Insere o contrato primeiro (sem document_id ainda) — signed_at vem do
  // DEFAULT now() do Postgres, não do relógio do navegador.
  const { data: contract, error: contractError } = await supabase
    .from('enrollment_contracts')
    .insert({
      organization_id: input.orgId,
      enrollment_id: input.enrollmentId,
      student_id: input.studentId,
      guardian_id: input.guardianId || null,
      template_id: input.activeTemplate?.id || null,
      contract_text: contractText,
      contract_hash: contractHash,
      monthly_fee_amount: input.monthlyFeeAmount,
      due_day: input.dueDay,
      signer_name: input.signerName,
      signer_accepted_terms: true,
    })
    .select()
    .single();
  if (contractError) throw contractError;

  // 2) Gera o PDF usando o signed_at autoritativo retornado pelo insert
  const logoBytes = await fetchLogoBytesSafely(input.orgId, input.fallbackLogoUrl);
  const pdfBytes = await generateEnrollmentContractPdf({
    contractText,
    signerName: input.signerName,
    signedAt: contract.signed_at,
    contractHash,
    organizationName: input.organizationName,
    logoBytes,
  });

  // 3) Upload + registro em `documents` (mesmo padrão de src/lib/storage.ts)
  const path = `${input.orgId}/students/${input.studentId}/contrato-matricula-${input.enrollmentId}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from('docs')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (uploadError) throw uploadError;

  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      organization_id: input.orgId,
      owner_type: 'student',
      owner_id: input.studentId,
      title: 'Contrato de Matrícula',
      file_path: `docs/${path}`,
      tags: ['contrato_matricula'],
      document_type: 'Contrato de Matrícula',
    })
    .select()
    .single();
  if (docError) throw docError;

  // 4) Vincula o document_id ao contrato
  const { error: linkError } = await supabase
    .from('enrollment_contracts')
    .update({ document_id: document.id })
    .eq('id', contract.id);
  if (linkError) throw linkError;

  // 5) Dispara título avulso no ERP — fora do fluxo crítico: se falhar, a
  // matrícula e o contrato já gravados continuam válidos, só o resultado da
  // sincronização é registrado pra auditoria/retry manual futuro.
  const dueDate = computeNextDueDate(input.dueDay);
  const numeroDocumento = `MAT-${input.enrollmentId.slice(0, 8).toUpperCase()}`;

  try {
    const erpResult = await erpEmit.createReceivable(input.orgId, {
      numeroDocumento,
      valorOriginal: input.monthlyFeeAmount,
      dataVencimento: dueDate,
      status: 'PENDENTE',
      observacoes: `1ª mensalidade - Matrícula ${input.studentName} - Turma ${input.className}`,
      clienteCpfCnpj: input.guardianCpf || undefined,
      recorrente: true,
      periodicidade: 'MENSAL',
      idempotencyKey: `novus-educacional:${input.orgId}:${numeroDocumento}`,
    });

    await supabase
      .from('enrollment_contracts')
      .update({
        numero_documento: numeroDocumento,
        erp_receivable_status: erpResult.skipped ? 'skipped' : erpResult.mock ? 'mock' : erpResult.ok ? 'ok' : 'error',
        erp_receivable_error: erpResult.error || null,
        erp_receivable_synced_at: new Date().toISOString(),
      })
      .eq('id', contract.id);

    if (!erpResult.ok) {
      console.warn('[ERP] Falha ao criar título avulso da matrícula:', erpResult.error);
    }
  } catch (erpError) {
    console.error('[ERP] Erro na integração ao criar título avulso:', erpError);
    await supabase
      .from('enrollment_contracts')
      .update({
        erp_receivable_status: 'error',
        erp_receivable_error: erpError instanceof Error ? erpError.message : 'Erro desconhecido',
        erp_receivable_synced_at: new Date().toISOString(),
      })
      .eq('id', contract.id);
  }

  // 6) Registra o Contrato em si no ERP (entidade separada de título/cliente)
  // — visível/consultável na tela de Contratos de lá, registro documental da
  // matrícula. `gera_financeiro: false` (default de erpEmit.upsertContract) é
  // proposital: a cobrança já acontece 100% pelo título avulso recorrente do
  // passo 5 acima — mandar o Contrato com gera_financeiro:true duplicaria a
  // cobrança da 1ª mensalidade (o ERP tem um trigger que gera título
  // automaticamente a partir do Contrato quando essa flag é true). Também
  // fora do fluxo crítico, mesmo padrão não-bloqueante do passo 5.
  const numeroContrato = `CONT-${input.enrollmentId.slice(0, 8).toUpperCase()}`;

  try {
    const contractResult = await erpEmit.upsertContract(input.orgId, {
      numeroContrato,
      titulo: `Contrato de Matrícula - ${input.studentName}`,
      clienteCpfCnpj: input.guardianCpf || undefined,
      dataInicio: input.enrollmentDate,
      valorMensal: input.monthlyFeeAmount,
      diaVencimento: input.dueDay,
      observacoes: `Contrato de matrícula assinado eletronicamente (hash ${contractHash.slice(0, 12)}...). Cobrança via mensalidade avulsa recorrente (Título), não via este Contrato.`,
      idempotencyKey: numeroContrato,
    });

    await supabase
      .from('enrollment_contracts')
      .update({
        erp_contract_id: numeroContrato,
        erp_contract_status: contractResult.skipped ? 'skipped' : contractResult.mock ? 'mock' : contractResult.ok ? 'ok' : 'error',
        erp_contract_error: contractResult.error || null,
        erp_contract_synced_at: new Date().toISOString(),
      })
      .eq('id', contract.id);

    if (!contractResult.ok) {
      console.warn('[ERP] Falha ao registrar Contrato da matrícula:', contractResult.error);
    }
  } catch (contractErr) {
    console.error('[ERP] Erro na integração ao registrar Contrato:', contractErr);
    await supabase
      .from('enrollment_contracts')
      .update({
        erp_contract_status: 'error',
        erp_contract_error: contractErr instanceof Error ? contractErr.message : 'Erro desconhecido',
        erp_contract_synced_at: new Date().toISOString(),
      })
      .eq('id', contract.id);
  }

  return contract;
}
