import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

export type AssessmentType = 'regular' | 'recuperacao';

export interface Assessment {
  id: string;
  title: string;
  date: string;
  weight: number;
  class_id: string;
  subject_id: string;
  term_id: string | null;
  assessment_type: string;
  recovers_term_id: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface CreateAssessmentData {
  title: string;
  date: string;
  weight: number;
  class_id: string;
  subject_id: string;
  term_id?: string | null;
  assessment_type?: AssessmentType;
  recovers_term_id?: string | null;
}

interface AssessmentFilters {
  classId?: string;
  subjectId?: string;
  termId?: string;
  assessmentType?: AssessmentType;
  dateStart?: string;
  dateEnd?: string;
}

export const useAssessments = (filters?: AssessmentFilters) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['assessments.listBy', orgData?.organization_id, filters?.classId ?? null, filters?.subjectId ?? null, filters?.termId ?? null, filters?.assessmentType ?? null, filters?.dateStart ?? null, filters?.dateEnd ?? null],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      let query = supabase
        .from('assessments')
        .select(`
          *,
          classes!inner(id, name, series:series_id(name)),
          subjects!inner(id, name, code)
        `)
        .eq('organization_id', orgData.organization_id);

      if (filters?.classId) {
        query = query.eq('class_id', filters.classId);
      }
      if (filters?.subjectId) {
        query = query.eq('subject_id', filters.subjectId);
      }
      if (filters?.termId) {
        query = query.eq('term_id', filters.termId);
      }
      if (filters?.assessmentType) {
        query = query.eq('assessment_type', filters.assessmentType);
      }
      if (filters?.dateStart) {
        query = query.gte('date', filters.dateStart);
      }
      if (filters?.dateEnd) {
        query = query.lte('date', filters.dateEnd);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useAssessmentMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useOrganization();

  const createMutation = useMutation({
    mutationFn: async (data: CreateAssessmentData) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const { error } = await supabase
        .from('assessments')
        .insert({
          ...data,
          organization_id: orgData.organization_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Avaliação criada com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['assessments.listBy'] });
    },
    onError: (error) => {
      console.error('Erro ao criar avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar avaliação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateAssessmentData> }) => {
      const { error } = await supabase
        .from('assessments')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgData?.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Avaliação atualizada com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['assessments.listBy'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar avaliação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgData?.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Avaliação excluída com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['assessments.listBy'] });
    },
    onError: (error) => {
      console.error('Erro ao excluir avaliação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir avaliação. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
};