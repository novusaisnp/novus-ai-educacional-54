import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

const DEFAULT_MINIMUM_PASSING_AVERAGE = 6.0;

export const useAcademicSettings = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['academic_settings', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return null;

      const { data, error } = await supabase
        .from('academic_settings')
        .select('id, minimum_passing_average')
        .eq('organization_id', orgData.organization_id)
        .maybeSingle();

      if (error) throw error;

      return {
        minimumPassingAverage: data?.minimum_passing_average ?? DEFAULT_MINIMUM_PASSING_AVERAGE,
      };
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useUpdateAcademicSettings = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (minimumPassingAverage: number) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      // academic_settings tem UNIQUE(organization_id) — onConflict bate com
      // essa constraint real (conferido via pg_get_constraintdef).
      const { error } = await supabase
        .from('academic_settings')
        .upsert(
          {
            organization_id: orgData.organization_id,
            minimum_passing_average: minimumPassingAverage,
          },
          { onConflict: 'organization_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['academic_settings'] });
      toast({ title: 'Média mínima atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar média mínima',
        description: error.message,
      });
    },
  });
};
