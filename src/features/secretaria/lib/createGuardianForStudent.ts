import { supabase } from '@/integrations/supabase/client';
import { erpEmit } from '@/integrations/erp/emit';

interface CreateGuardianForStudentInput {
  orgId: string;
  studentId: string;
  name: string;
  relationship?: string;
  documentId?: string;
  email?: string;
  phone?: string;
}

/**
 * Cria um responsável, vincula ao aluno em student_guardians e sincroniza com o ERP
 * como cliente (Porta 1). Mesma sequência já usada em FormEntidade.tsx —
 * extraída aqui para reuso no cadastro direto de aluno e na conversão de reserva.
 */
export async function createGuardianForStudent({
  orgId,
  studentId,
  name,
  relationship,
  documentId,
  email,
  phone,
}: CreateGuardianForStudentInput) {
  const normalizedCpf = documentId?.replace(/\D/g, '') || null;

  const { data: entidade, error: entidadeError } = await supabase
    .from('entidades')
    .insert({
      tipo_pessoa: 'PF',
      nome: name,
      email: email || null,
      telefone: phone || null,
      cpf: normalizedCpf,
      organization_id: orgId,
    })
    .select()
    .single();

  if (entidadeError) throw entidadeError;

  const { error: papelError } = await supabase
    .from('entidade_papeis')
    .insert({
      entidade_id: entidade.id,
      organization_id: orgId,
      papel: 'RESPONSAVEL',
      dados_papel: relationship ? { relationship } : null,
    });

  if (papelError) throw papelError;

  const guardian = { id: entidade.id, name, email: email || null, phone: phone || null, cpf: normalizedCpf, relationship: relationship || null };

  const { error: linkError } = await supabase
    .from('student_guardians')
    .insert({
      guardian_id: guardian.id,
      student_id: studentId,
      organization_id: orgId,
      is_primary: true,
      legal_consent: false,
    });

  if (linkError) throw linkError;

  // upsertClientByCPF usa o CPF como chave de identidade do cliente no ERP — sem
  // CPF real não há como sincronizar sem risco de colidir com outro responsável
  // (ex.: dois sem telefone cadastrado cairiam no mesmo valor fabricado).
  if (normalizedCpf) {
    try {
      const erpResult = await erpEmit.upsertClient(orgId, {
        cpf: normalizedCpf,
        name,
        email: email || undefined,
        phone: phone || undefined,
      });

      if (erpResult.error) {
        console.warn('[ERP] Falha na sincronização do responsável:', erpResult.error);
      }
    } catch (erpError) {
      console.error('[ERP] Erro na integração ao criar responsável:', erpError);
    }
  } else {
    console.warn('[ERP] Responsável sem CPF — sincronização com o ERP pulada.');
  }

  return guardian;
}
