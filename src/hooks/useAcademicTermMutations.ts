import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

interface AcademicTermData {
  period_id: string;
  name: string;
  term_number: number;
  date_start: string;
  date_end: string;
}

export const useAcademicTermMutations = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['academic_terms'] });

  const create = useMutation({
    mutationFn: async (data: AcademicTermData) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const { error } = await supabase
        .from('academic_terms')
        .insert({ ...data, organization_id: orgData.organization_id });

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Período de avaliação criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar período de avaliação',
        description: error.message,
      });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AcademicTermData> }) => {
      const { error } = await supabase
        .from('academic_terms')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgData?.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Período de avaliação atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar período de avaliação',
        description: error.message,
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('academic_terms')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgData?.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Período de avaliação excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir período de avaliação',
        description: error.message,
      });
    },
  });

  return { create, update, remove };
};
