import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

export interface StudentPei {
  id: string;
  student_id: string;
  diagnosis: string | null;
  needs: string | null;
  goals: string | null;
  accommodations: string[];
  responsible_professional: string | null;
  status: 'ativo' | 'encerrado';
  start_date: string;
  review_date: string | null;
  laudo_document_id: string | null;
}

export interface StudentPeiInput {
  studentId: string;
  diagnosis: string | null;
  needs: string | null;
  goals: string | null;
  accommodations: string[];
  responsibleProfessional: string | null;
  status: 'ativo' | 'encerrado';
  startDate: string;
  reviewDate: string | null;
  laudoDocumentId: string | null;
}

// Histórico completo do aluno (mais de um PEI ao longo do tempo é normal —
// revisão anual gera registro novo). Mais recente primeiro; a UI decide o
// que exibir como "atual".
export const useStudentPei = (studentId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['student_pei', orgData?.organization_id, studentId ?? null],
    queryFn: async (): Promise<StudentPei[]> => {
      if (!orgData?.organization_id || !studentId) return [];

      const { data, error } = await supabase
        .from('student_pei')
        .select(
          'id, student_id, diagnosis, needs, goals, accommodations, responsible_professional, status, start_date, review_date, laudo_document_id'
        )
        .eq('organization_id', orgData.organization_id)
        .eq('student_id', studentId)
        .order('start_date', { ascending: false });

      if (error) throw error;
      return (data || []) as StudentPei[];
    },
    enabled: !!orgData?.organization_id && !!studentId,
  });
};

export const useUpsertStudentPei = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: StudentPeiInput & { id?: string }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const payload = {
        organization_id: orgData.organization_id,
        student_id: input.studentId,
        diagnosis: input.diagnosis,
        needs: input.needs,
        goals: input.goals,
        accommodations: input.accommodations,
        responsible_professional: input.responsibleProfessional,
        status: input.status,
        start_date: input.startDate,
        review_date: input.reviewDate,
        laudo_document_id: input.laudoDocumentId,
      };

      const { error } = id
        ? await supabase.from('student_pei').update(payload).eq('id', id)
        : await supabase.from('student_pei').insert(payload);

      if (error) throw error;
      return { studentId: input.studentId };
    },
    onSuccess: ({ studentId }) => {
      queryClient.invalidateQueries({ queryKey: ['student_pei', orgData?.organization_id, studentId] });
      toast({ title: 'PEI salvo com sucesso.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar PEI',
        description: error.message,
      });
    },
  });
};
