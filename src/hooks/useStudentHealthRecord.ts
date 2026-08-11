import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/hooks/use-toast';

export interface StudentHealthRecord {
  id: string;
  student_id: string;
  blood_type: string | null;
  allergies: string | null;
  medical_conditions: string | null;
  medications: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  notes: string | null;
  updated_at: string;
}

export interface StudentHealthRecordInput {
  studentId: string;
  bloodType: string | null;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  notes: string | null;
}

// Registro único "vivo" por aluno (não histórico versionado, diferente de
// student_pei) — null quando o aluno ainda não tem prontuário preenchido.
export const useStudentHealthRecord = (studentId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['student_health_record', orgData?.organization_id, studentId ?? null],
    queryFn: async (): Promise<StudentHealthRecord | null> => {
      if (!orgData?.organization_id || !studentId) return null;

      const { data, error } = await supabase
        .from('student_health_records')
        .select(
          'id, student_id, blood_type, allergies, medical_conditions, medications, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, notes, updated_at'
        )
        .eq('organization_id', orgData.organization_id)
        .eq('student_id', studentId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id && !!studentId,
  });
};

export const useUpsertStudentHealthRecord = () => {
  const { data: orgData } = useOrganization();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: StudentHealthRecordInput) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const payload = {
        organization_id: orgData.organization_id,
        student_id: input.studentId,
        blood_type: input.bloodType,
        allergies: input.allergies,
        medical_conditions: input.medicalConditions,
        medications: input.medications,
        emergency_contact_name: input.emergencyContactName,
        emergency_contact_phone: input.emergencyContactPhone,
        emergency_contact_relationship: input.emergencyContactRelationship,
        notes: input.notes,
        updated_by: user?.id,
      };

      const { error } = await supabase
        .from('student_health_records')
        .upsert(payload, { onConflict: 'student_id' });

      if (error) throw error;
      return { studentId: input.studentId };
    },
    onSuccess: ({ studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['student_health_record', orgData?.organization_id, studentId] });
      toast({ title: 'Prontuário salvo com sucesso.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar prontuário',
        description: error.message,
      });
    },
  });
};
