import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

const DEFAULT_MINIMUM_PASSING_AVERAGE = 6.0;

export type TermResultStatus = 'aprovado' | 'progressao_parcial';

export interface TermResultRow {
  id: string;
  student_id: string;
  original_average: number;
  recovery_grade: number | null;
  final_grade: number;
  status: TermResultStatus;
  calculated_at: string;
  students: { first_name: string; last_name: string } | null;
}

export const useTermResults = (termId?: string, classId?: string, subjectId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['term_results', orgData?.organization_id, termId ?? null, classId ?? null, subjectId ?? null],
    queryFn: async (): Promise<TermResultRow[]> => {
      if (!orgData?.organization_id || !termId || !classId || !subjectId) return [];

      const { data, error } = await supabase
        .from('term_results')
        .select('id, student_id, original_average, recovery_grade, final_grade, status, calculated_at, students(first_name, last_name)')
        .eq('organization_id', orgData.organization_id)
        .eq('term_id', termId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId);

      if (error) throw error;
      return (data || []) as unknown as TermResultRow[];
    },
    enabled: !!orgData?.organization_id && !!termId && !!classId && !!subjectId,
  });
};

export const useCalculateTermResults = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ termId, classId, subjectId }: { termId: string; classId: string; subjectId: string }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }
      const organizationId = orgData.organization_id;

      // Alunos ativos matriculados na turma
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'ativa');
      if (enrollmentsError) throw enrollmentsError;

      const studentIds = (enrollments || []).map((e) => e.student_id);
      if (studentIds.length === 0) {
        return { calculated: 0 };
      }

      // Avaliações regulares do período (disciplina + turma)
      const { data: regularAssessments, error: regularError } = await supabase
        .from('assessments')
        .select('id, weight')
        .eq('organization_id', organizationId)
        .eq('term_id', termId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('assessment_type', 'regular');
      if (regularError) throw regularError;

      // Avaliação(ões) de recuperação que resgatam este período
      const { data: recoveryAssessments, error: recoveryError } = await supabase
        .from('assessments')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('recovers_term_id', termId)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('assessment_type', 'recuperacao');
      if (recoveryError) throw recoveryError;

      const regularIds = (regularAssessments || []).map((a) => a.id);
      const recoveryIds = (recoveryAssessments || []).map((a) => a.id);

      const allAssessmentIds = [...regularIds, ...recoveryIds];
      let grades: { assessment_id: string; student_id: string; grade: number | null }[] = [];
      if (allAssessmentIds.length > 0) {
        const { data: gradesData, error: gradesError } = await supabase
          .from('grades')
          .select('assessment_id, student_id, grade')
          .eq('organization_id', organizationId)
          .in('assessment_id', allAssessmentIds);
        if (gradesError) throw gradesError;
        grades = gradesData || [];
      }

      const { data: settings, error: settingsError } = await supabase
        .from('academic_settings')
        .select('minimum_passing_average')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (settingsError) throw settingsError;
      const minimumPassingAverage = settings?.minimum_passing_average ?? DEFAULT_MINIMUM_PASSING_AVERAGE;

      const weightByAssessment = new Map((regularAssessments || []).map((a) => [a.id, Number(a.weight) || 1]));

      const results: {
        organization_id: string;
        term_id: string;
        class_id: string;
        subject_id: string;
        student_id: string;
        original_average: number;
        recovery_grade: number | null;
        final_grade: number;
        status: TermResultStatus;
      }[] = [];

      for (const studentId of studentIds) {
        const regularGrades = grades.filter(
          (g) => g.student_id === studentId && regularIds.includes(g.assessment_id) && g.grade !== null
        );
        if (regularGrades.length === 0) continue; // sem nota lançada, nada a calcular ainda

        let weightedSum = 0;
        let weightTotal = 0;
        for (const g of regularGrades) {
          const weight = weightByAssessment.get(g.assessment_id) ?? 1;
          weightedSum += (g.grade as number) * weight;
          weightTotal += weight;
        }
        const originalAverage = weightTotal > 0 ? weightedSum / weightTotal : 0;

        const recoveryGrades = grades
          .filter((g) => g.student_id === studentId && recoveryIds.includes(g.assessment_id) && g.grade !== null)
          .map((g) => g.grade as number);
        const recoveryGrade = recoveryGrades.length > 0 ? Math.max(...recoveryGrades) : null;

        const finalGrade = recoveryGrade !== null ? Math.max(originalAverage, recoveryGrade) : originalAverage;
        const status: TermResultStatus = finalGrade >= minimumPassingAverage ? 'aprovado' : 'progressao_parcial';

        results.push({
          organization_id: organizationId,
          term_id: termId,
          class_id: classId,
          subject_id: subjectId,
          student_id: studentId,
          original_average: Number(originalAverage.toFixed(2)),
          recovery_grade: recoveryGrade !== null ? Number(recoveryGrade.toFixed(2)) : null,
          final_grade: Number(finalGrade.toFixed(2)),
          status,
        });
      }

      if (results.length === 0) {
        return { calculated: 0 };
      }

      // Constraint UNIQUE real de term_results é (term_id, class_id, subject_id,
      // student_id) — conferido via pg_get_constraintdef antes de codar este upsert.
      const { error: upsertError } = await supabase
        .from('term_results')
        .upsert(results, { onConflict: 'term_id,class_id,subject_id,student_id' });
      if (upsertError) {
        logger.error('Erro ao calcular resultados do período', { error: upsertError.message, termId, classId, subjectId });
        throw upsertError;
      }

      return { calculated: results.length };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['term_results', orgData?.organization_id, variables.termId, variables.classId, variables.subjectId],
      });
      toast({
        title: 'Resultados calculados',
        description: `${data.calculated} aluno(s) com resultado atualizado.`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao calcular resultados',
        description: error.message,
      });
    },
  });
};
