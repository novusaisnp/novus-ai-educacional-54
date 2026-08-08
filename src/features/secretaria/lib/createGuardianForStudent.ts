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
 * como cliente (Porta 1). Mesma sequência já usada em SubmodalResponsaveis.tsx —
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

  const { data: guardian, error: guardianError } = await supabase
    .from('guardians')
    .insert({
      name,
      email: email || null,
      phone: phone || null,
      relationship: relationship || null,
      cpf: normalizedCpf,
      organization_id: orgId,
    })
    .select()
    .single();

  if (guardianError) throw guardianError;

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
