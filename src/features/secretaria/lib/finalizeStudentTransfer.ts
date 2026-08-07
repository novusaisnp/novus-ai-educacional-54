import { supabase } from '@/integrations/supabase/client';
import { generateTransferGuidePdf, type TransferGuideTermGroup } from './generateTransferGuidePdf';

export interface FinalizeStudentTransferInput {
  orgId: string;
  organizationName: string;
  transferId: string;
  studentId: string;
  studentName: string;
  studentBirthDate: string | null;
  studentDocumentId: string | null;
  originClassName: string | null;
  destinationSchool: string | null;
  reason: string | null;
  transferDate: string;
  signerName: string;
  termGroups: TransferGuideTermGroup[];
}

async function hashContent(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function buildCanonicalText(input: FinalizeStudentTransferInput): string {
  const lines: string[] = [
    `GUIA DE TRANSFERÊNCIA ESCOLAR — ${input.organizationName}`,
    `Aluno: ${input.studentName}`,
    `Transferência em: ${input.transferDate}`,
    `Escola de destino: ${input.destinationSchool || '-'}`,
    `Motivo: ${input.reason || '-'}`,
    '',
  ];
  for (const group of input.termGroups) {
    lines.push(`${group.periodName} — ${group.termName}`);
    for (const subject of group.subjects) {
      lines.push(`  ${subject.subjectName}: ${subject.finalGrade.toFixed(2)} (${subject.status})`);
    }
  }
  return lines.join('\n');
}

/**
 * Finaliza e assina eletronicamente a guia de transferência (nome digitado +
 * timestamp do servidor + hash do conteúdo), gera e anexa o PDF. Mesmo padrão
 * de finalizeClassCouncil.ts: UPDATE condicional (WHERE status='rascunho')
 * evita corrida de dupla finalização. A mudança de status do aluno/matrícula
 * pra 'transferido'/'transferida' acontece via trigger no banco
 * (student_transfers_apply_status), não aqui no client — garante atomicidade
 * mesmo se o passo de gerar/anexar o PDF falhar depois.
 */
export async function finalizeStudentTransfer(input: FinalizeStudentTransferInput) {
  const contentHash = await hashContent(buildCanonicalText(input));

  const { data: transfer, error: updateError } = await supabase
    .from('student_transfers')
    .update({ status: 'concluida', signer_name: input.signerName })
    .eq('id', input.transferId)
    .eq('status', 'rascunho')
    .select('id, status, signer_name, finalized_at, document_id')
    .maybeSingle();
  if (updateError) throw updateError;
  if (!transfer) {
    throw new Error('Esta transferência já foi finalizada (ou não foi encontrada). Recarregue a página.');
  }

  const pdfBytes = await generateTransferGuidePdf({
    organizationName: input.organizationName,
    studentName: input.studentName,
    studentBirthDate: input.studentBirthDate,
    studentDocumentId: input.studentDocumentId,
    originClassName: input.originClassName,
    destinationSchool: input.destinationSchool,
    reason: input.reason,
    transferDate: input.transferDate,
    signerName: input.signerName,
    finalizedAt: transfer.finalized_at as string,
    contentHash,
    termGroups: input.termGroups,
  });

  const path = `${input.orgId}/students/${input.studentId}/guia-transferencia-${input.transferId}.pdf`;
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
      title: 'Guia de Transferência Escolar',
      file_path: `docs/${path}`,
      tags: ['guia_transferencia'],
      document_type: 'Guia de Transferência Escolar',
    })
    .select()
    .single();
  if (docError) throw docError;

  const { error: linkError } = await supabase
    .from('student_transfers')
    .update({ document_id: document.id })
    .eq('id', input.transferId);
  if (linkError) throw linkError;

  return { ...transfer, document_id: document.id };
}
