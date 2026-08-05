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

  try {
    const cpf = normalizedCpf || phone?.replace(/\D/g, '').padStart(11, '0') || '00000000000';
    const erpResult = await erpEmit.upsertClient(orgId, {
      cpf,
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

  return guardian;
}
