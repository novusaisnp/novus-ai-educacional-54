import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

export interface ClassSubjectAssignment {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string | null;
  subjects: { id: string; name: string; code: string | null } | null;
  profiles: { id: string; full_name: string } | null;
}

// Grade curricular de uma turma: uma linha por disciplina atribuída, com o professor
// responsável (se já definido). teacher_id nulo é estado válido — currículo definido
// antes da alocação de professor.
export const useClassSubjects = (classId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['class_subjects', orgData?.organization_id, classId ?? null],
    queryFn: async (): Promise<ClassSubjectAssignment[]> => {
      if (!orgData?.organization_id || !classId) return [];

      const { data, error } = await supabase
        .from('class_subjects')
        .select('id, class_id, subject_id, teacher_id, subjects(id, name, code), profiles(id, full_name)')
        .eq('organization_id', orgData.organization_id)
        .eq('class_id', classId);

      if (error) throw error;

      const rows = (data || []) as unknown as ClassSubjectAssignment[];
      return rows.sort((a, b) => (a.subjects?.name || '').localeCompare(b.subjects?.name || ''));
    },
    enabled: !!orgData?.organization_id && !!classId,
  });
};

export const useUpsertClassSubject = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      classId,
      subjectId,
      teacherId,
    }: {
      classId: string;
      subjectId: string;
      teacherId: string | null;
    }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      // onConflict bate com a UNIQUE(class_id, subject_id) real da tabela (migration
      // 20260808120000) — confirmado antes de usar, não é um onConflict inventado.
      const { error } = await supabase.from('class_subjects').upsert(
        {
          organization_id: orgData.organization_id,
          class_id: classId,
          subject_id: subjectId,
          teacher_id: teacherId,
        },
        { onConflict: 'class_id,subject_id' }
      );

      if (error) throw error;
      return { classId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', orgData?.organization_id, classId] });
      toast({ title: 'Atribuição salva com sucesso.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar atribuição',
        description: error.message,
      });
    },
  });
};

export const useDeleteClassSubject = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, classId }: { id: string; classId: string }) => {
      const { error } = await supabase
        .from('class_subjects')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgData?.organization_id);

      if (error) throw error;
      return { classId };
    },
    onSuccess: ({ classId }) => {
      queryClient.invalidateQueries({ queryKey: ['class_subjects', orgData?.organization_id, classId] });
      toast({ title: 'Atribuição removida.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover atribuição',
        description: error.message,
      });
    },
  });
};
