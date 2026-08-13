import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type LessonPlanRow = Database['public']['Tables']['lesson_plans']['Row'];
type TrackingNoteRow = Database['public']['Tables']['student_tracking_notes']['Row'];
type ProjectRow = Database['public']['Tables']['pedagogical_projects']['Row'];
type GoalRow = Database['public']['Tables']['pedagogical_goals']['Row'];

export const useStudentsLite = () => {
  const { orgId } = useOrganization();
  return useQuery({
    queryKey: ['students.lite', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('organization_id', orgId)
        .eq('status', 'ativo')
        .order('first_name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
};

function useCrud<T extends { id: string }>(table: 'lesson_plans' | 'student_tracking_notes' | 'pedagogical_projects' | 'pedagogical_goals', orderBy: string, ascending = false) {
  const { orgId } = useOrganization();
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = [table, orgId];

  // Tabela escolhida por union de literais confunde a inferência de tipo do
  // supabase-js pra insert/update/select genérico — cast explícito, único
  // ponto não-tipado do arquivo, os 4 hooks exportados no fim continuam
  // fortemente tipados (T concreto por chamada).
  const client = supabase as unknown as {
    from: (t: string) => {
      select: (q: string) => { order: (c: string, o: { ascending: boolean }) => Promise<{ data: unknown; error: Error | null }> };
      insert: (rows: unknown[]) => Promise<{ error: Error | null }>;
      update: (payload: unknown) => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
      delete: () => { eq: (c: string, v: string) => Promise<{ error: Error | null }> };
    };
  };

  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await client.from(table).select('*').order(orderBy, { ascending });
      if (error) throw error;
      return data as T[];
    },
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!orgId) throw new Error('Organização não encontrada');
      const { error } = await client.from(table).insert([{ ...payload, organization_id: orgId, created_by: user?.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Criado com sucesso' });
    },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Erro ao criar', description: error.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { error } = await client.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Atualizado com sucesso' });
    },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Removido com sucesso' });
    },
    onError: (error: Error) => toast({ variant: 'destructive', title: 'Erro ao remover', description: error.message }),
  });

  return { list, create, update, remove };
}

export const useLessonPlans = () => useCrud<LessonPlanRow>('lesson_plans', 'lesson_date', false);
export const useTrackingNotes = () => useCrud<TrackingNoteRow>('student_tracking_notes', 'note_date', false);
export const usePedagogicalProjects = () => useCrud<ProjectRow>('pedagogical_projects', 'created_at', false);
export const usePedagogicalGoals = () => useCrud<GoalRow>('pedagogical_goals', 'created_at', false);

export type { LessonPlanRow, TrackingNoteRow, ProjectRow, GoalRow };
