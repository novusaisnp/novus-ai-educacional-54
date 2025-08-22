import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';

// Hook para chatbot IA
export const useChatbot = () => {
  return useMutation({
    mutationFn: async ({ message, entity_type = 'general', entity_id }: {
      message: string;
      entity_type?: string;
      entity_id?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: { message, entity_type, entity_id }
      });

      if (error) {
        logger.error('Erro no chatbot IA', { error });
        throw error;
      }

      return data;
    }
  });
};

// Hook para análise de risco
export const useRiskAnalysis = () => {
  return useMutation({
    mutationFn: async ({ model_type = 'evasao', force_update = false }: {
      model_type?: 'evasao' | 'inadimplencia';
      force_update?: boolean;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-risk-analysis', {
        body: { model_type, force_update }
      });

      if (error) {
        logger.error('Erro na análise de risco', { error });
        throw error;
      }

      return data;
    }
  });
};

// Hook para correção automática
export const useAssessmentFeedback = () => {
  return useMutation({
    mutationFn: async ({ assessment_id, student_id, text_content }: {
      assessment_id: string;
      student_id: string;
      text_content: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('ai-assessment-feedback', {
        body: { assessment_id, student_id, text_content }
      });

      if (error) {
        logger.error('Erro na correção automática', { error });
        throw error;
      }

      return data;
    }
  });
};

// Hook para consultar risco de evasão
export const useRiscoEvasao = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['risco-evasao', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_risco_evasao')
        .select('*')
        .order('risco_score', { ascending: false });

      if (error) {
        logger.error('Erro ao consultar risco de evasão', { error });
        throw error;
      }

      return data;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para consultar logs de predição
export const usePredictionLogs = (filters?: { model_type?: string; entity_id?: string }) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['prediction-logs', orgData?.organization_id, filters],
    queryFn: async () => {
      let query = supabase.from('prediction_logs').select('*');

      if (filters?.model_type) {
        query = query.eq('model_type', filters.model_type);
      }

      if (filters?.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Erro ao consultar logs de predição', { error });
        throw error;
      }

      return data;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para consultar feedback de avaliações
export const useAssessmentsFeedback = (filters?: { assessment_id?: string; student_id?: string }) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['assessments-feedback', orgData?.organization_id, filters],
    queryFn: async () => {
      let query = supabase.from('assessments_feedback').select(`
        *,
        assessments(title, date),
        students(first_name, last_name)
      `);

      if (filters?.assessment_id) {
        query = query.eq('assessment_id', filters.assessment_id);
      }

      if (filters?.student_id) {
        query = query.eq('student_id', filters.student_id);
      }

      const { data, error } = await query.order('processed_at', { ascending: false });

      if (error) {
        logger.error('Erro ao consultar feedback de avaliações', { error });
        throw error;
      }

      return data;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};