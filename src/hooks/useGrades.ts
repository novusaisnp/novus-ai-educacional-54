
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

export const useGrades = (assessmentId?: string, studentId?: string) => {
  const { data: orgData } = useOrganization();

  // Chave de cache estável e serializável (TanStack v5)
  const queryKey = ['grades.byAssessment', orgData?.organization_id ?? null, assessmentId ?? null, studentId ?? null];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }
      if (!assessmentId) {
        return [];
      }

      let query = supabase
        .from('grades')
        .select('id, grade, student_id, assessment_id, comments, created_at, updated_at')
        .eq('organization_id', orgData.organization_id)
        .eq('assessment_id', assessmentId);

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar notas', { error: error.message, assessmentId, studentId });
        throw error;
      }

      return data || [];
    },
    enabled: !!orgData?.organization_id && !!assessmentId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useUpsertGrade = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    // Idempotente por (organization_id, assessment_id, student_id)
    mutationFn: async (gradeData: {
      assessment_id: string;
      student_id: string;
      grade?: number;
      comments?: string;
    }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      const payload = {
        organization_id: orgData.organization_id,
        assessment_id: gradeData.assessment_id,
        student_id: gradeData.student_id,
        grade: gradeData.grade,
        comments: gradeData.comments,
      };

      // A constraint UNIQUE real em public.grades é (assessment_id, student_id) —
      // sem organization_id. onConflict com coluna fora de qualquer constraint
      // única faz o Postgres rejeitar com 400 (42P10).
      const { data, error } = await supabase
        .from('grades')
        .upsert(payload, { onConflict: 'assessment_id,student_id' })
        .select('id, assessment_id, student_id, grade, updated_at')
        .single();

      if (error) {
        logger.error('Erro no upsert de nota', { error: error.message, payload });
        throw error;
      }

      return data!;
    },
    onSuccess: async (data) => {
      // Invalidar queries relacionadas com chaves estáveis
      queryClient.invalidateQueries({
        queryKey: ['grades.byAssessment', orgData?.organization_id ?? null, data.assessment_id, null],
      });

      logger.info('Nota salva com sucesso', {
        gradeId: data.id,
        assessmentId: data.assessment_id,
        studentId: data.student_id,
      });

      // Auditoria de salvamento
      if (orgData?.organization_id) {
        await logAudit({
          table_name: 'grades',
          action: 'upsert_grade',
          diff: { assessmentId: data.assessment_id, studentId: data.student_id, grade: data.grade },
          organization_id: orgData.organization_id,
          row_id: data.id,
        });
      }
    },
    onError: (error: Error) => {
      // Erro tratado pelo componente com toast; aqui registramos log
      logger.error('Erro ao salvar nota', { error: error.message });
    },
  });
};
