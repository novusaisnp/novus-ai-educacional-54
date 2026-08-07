import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { finalizeStudentTransfer } from '@/features/secretaria/lib/finalizeStudentTransfer';

export type StudentTransferStatus = 'rascunho' | 'concluida';

export interface StudentTransfer {
  id: string;
  student_id: string;
  enrollment_id: string;
  destination_school: string | null;
  reason: string | null;
  transfer_date: string;
  status: StudentTransferStatus;
  signer_name: string | null;
  finalized_at: string | null;
  document_id: string | null;
  created_at: string;
  students: { first_name: string; last_name: string; birth_date: string | null; document_id: string | null } | null;
  enrollments: { classes: { name: string; year: number } | null } | null;
}

export const useStudentTransfers = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['student_transfers', orgData?.organization_id],
    queryFn: async (): Promise<StudentTransfer[]> => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('student_transfers')
        .select(
          'id, student_id, enrollment_id, destination_school, reason, transfer_date, status, signer_name, finalized_at, document_id, created_at, students(first_name, last_name, birth_date, document_id), enrollments(classes(name, year))'
        )
        .eq('organization_id', orgData.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StudentTransfer[];
    },
    enabled: !!orgData?.organization_id,
  });
};

// Alunos elegíveis pra abrir uma transferência: precisam de uma matrícula
// ativa (é ela que vira "transferida" ao finalizar) — students sem matrícula
// (ver correção de 2026-08-07 em alunos.tsx) não aparecem aqui de propósito.
export const useTransferableStudents = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['students_with_active_enrollment', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, enrollments!inner(id, status, classes(name, year))')
        .eq('organization_id', orgData.organization_id)
        .eq('status', 'ativo')
        .eq('enrollments.status', 'ativa')
        .order('first_name');

      if (error) throw error;
      return (data || []) as unknown as {
        id: string;
        first_name: string;
        last_name: string;
        enrollments: { id: string; status: string; classes: { name: string; year: number } | null }[];
      }[];
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useCreateStudentTransfer = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      studentId: string;
      enrollmentId: string;
      destinationSchool: string;
      reason: string;
      transferDate: string;
    }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const { data, error } = await supabase
        .from('student_transfers')
        .insert({
          organization_id: orgData.organization_id,
          student_id: input.studentId,
          enrollment_id: input.enrollmentId,
          destination_school: input.destinationSchool || null,
          reason: input.reason || null,
          transfer_date: input.transferDate,
        })
        .select('id, student_id, enrollment_id, destination_school, reason, transfer_date, status, signer_name, finalized_at, document_id, created_at')
        .single();

      if (error) throw error;
      return data as unknown as StudentTransfer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_transfers', orgData?.organization_id] });
      toast({ title: 'Transferência iniciada — gere a guia e assine para concluir.' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao iniciar transferência',
        description: error.message,
      });
    },
  });
};

export const useFinalizeStudentTransfer = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof finalizeStudentTransfer>[0], 'orgId'>) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }
      return finalizeStudentTransfer({ ...input, orgId: orgData.organization_id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student_transfers'] });
      queryClient.invalidateQueries({ queryKey: ['students.list'] });
      queryClient.invalidateQueries({ queryKey: ['students_with_active_enrollment'] });
      toast({ title: 'Transferência finalizada e guia assinada com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar transferência',
        description: error.message,
      });
    },
  });
};
