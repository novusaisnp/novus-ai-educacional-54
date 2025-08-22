import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useStudents } from '@/hooks/useStudents';
import { useGrades } from '@/hooks/useGrades';
import { useCanEditGrades } from '@/hooks/useUserRole';
import { GradesFilters } from '@/components/academico/notas/GradesFilters';
import { GradeInputCell } from '@/components/academico/notas/GradeInputCell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';

// Interface para filtros com tipos flexíveis
interface FiltersState {
  class: string;
  subject: string;
  assessment: string;
}

// Defaults estáveis para evitar re-renders
const DEFAULT_FILTERS: FiltersState = {
  class: 'all',
  subject: 'all',
  assessment: 'all',
};

// Adapter puro para normalizar dados de grades
const createGradesAdapter = (grades: any[]) => {
  const gradesMap = new Map<string, { grade?: number; comments?: string }>();
  
  grades.forEach(grade => {
    const key = `${grade.assessment_id}-${grade.student_id}`;
    gradesMap.set(key, {
      grade: grade.grade,
      comments: grade.comments,
    });
  });
  
  return gradesMap;
};

export default function NotasPage() {
  const { data: orgData } = useOrganization();
  const canEdit = useCanEditGrades();

  // Estados com valores estáveis
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);

  // Filtros memorizados com dependências estáveis
  const memoizedFilters = useMemo(() => ({
    classId: filters.class !== 'all' ? filters.class : undefined,
    subjectId: filters.subject !== 'all' ? filters.subject : undefined,
    assessmentId: filters.assessment !== 'all' ? filters.assessment : undefined,
  }), [filters.class, filters.subject, filters.assessment]);

  // Auditoria: registrar abertura da página com filtros atuais
  useEffect(() => {
    if (orgData?.organization_id) {
      logAudit({
        table_name: 'grades',
        action: 'open_notas_page',
        diff: {
          class: DEFAULT_FILTERS.class,
          subject: DEFAULT_FILTERS.subject,
          assessment: DEFAULT_FILTERS.assessment,
        },
        organization_id: orgData.organization_id,
      }).catch((err) => {
        logger.warn('Falha ao auditar abertura da tela de notas', { error: err?.message });
      });
    }
    // Executa uma vez quando orgId estiver disponível
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgData?.organization_id]);

  // Query para turmas com cache otimizada
  const { data: classes = [], isLoading: isLoadingClasses } = useQuery({
    queryKey: ['classes', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year')
        .eq('organization_id', orgData.organization_id)
        .order('name');

      if (error) {
        logger.error('Erro ao buscar turmas', { error: error.message });
        throw error;
      }
      
      return data || [];
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query para disciplinas com cache otimizada
  const { data: subjects = [], isLoading: isLoadingSubjects } = useQuery({
    queryKey: ['subjects', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('organization_id', orgData.organization_id)
        .order('name');

      if (error) {
        logger.error('Erro ao buscar disciplinas', { error: error.message });
        throw error;
      }
      
      return data || [];
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query para avaliações (condicionada ao subject selecionado)
  const { data: assessments = [], isLoading: isLoadingAssessments } = useQuery({
    queryKey: ['assessments', orgData?.organization_id, memoizedFilters.classId, memoizedFilters.subjectId],
    queryFn: async () => {
      if (!orgData?.organization_id || !memoizedFilters.subjectId) return [];
      
      let query = supabase
        .from('assessments')
        .select('id, title, date, weight')
        .eq('organization_id', orgData.organization_id)
        .eq('subject_id', memoizedFilters.subjectId);

      if (memoizedFilters.classId) {
        query = query.eq('class_id', memoizedFilters.classId);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        logger.error('Erro ao buscar avaliações', { error: error.message });
        throw error;
      }
      
      return data || [];
    },
    enabled: !!orgData?.organization_id && !!memoizedFilters.subjectId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Hook para estudantes
  const { data: students = [], isLoading: isLoadingStudents } = useStudents(memoizedFilters.classId);

  // Hook para notas (usa query key estável 'grades.byAssessment')
  const { data: grades = [], isLoading: isLoadingGrades } = useGrades(
    memoizedFilters.assessmentId,
    undefined
  );

  // Adapter para notas (memorizado)
  const gradesAdapter = useMemo(() => createGradesAdapter(grades), [grades]);

  // Handlers estáveis (useCallback para evitar re-renders)
  const handleClassChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, class: value, assessment: 'all' }));
  }, []);

  const handleSubjectChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, subject: value, assessment: 'all' }));
  }, []);

  const handleAssessmentChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, assessment: value }));
  }, []);

  // Estados de loading
  const isLoading = isLoadingClasses || isLoadingSubjects || isLoadingStudents || isLoadingGrades;

  // Render condicional para estados de loading/erro
  if (!orgData) {
    return (
      <Alert>
        <AlertDescription>
          Erro ao carregar dados da organização. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canEdit) {
    return (
      <Alert>
        <AlertDescription>
          Você não tem permissão para visualizar ou editar notas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Notas</h1>
        <p className="text-muted-foreground">
          Visualize e edite as notas dos estudantes por turma e disciplina.
        </p>
      </div>

      <GradesFilters
        selectedClass={filters.class}
        selectedSubject={filters.subject}
        selectedAssessment={filters.assessment}
        onClassChange={handleClassChange}
        onSubjectChange={handleSubjectChange}
        onAssessmentChange={handleAssessmentChange}
        classes={classes}
        subjects={subjects}
        assessments={assessments}
        isLoading={isLoading}
      />

      {memoizedFilters.assessmentId && (
        <Card>
          <CardHeader>
            <CardTitle>Notas dos Estudantes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhum estudante encontrado para os filtros selecionados.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estudante</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead className="text-center">Nota</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const gradeKey = `${memoizedFilters.assessmentId}-${student.id}`;
                      const gradeData = gradesAdapter.get(gradeKey);
                      
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {student.document_id || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <GradeInputCell
                              assessmentId={memoizedFilters.assessmentId!}
                              studentId={student.id}
                              initialGrade={gradeData?.grade}
                              initialComments={gradeData?.comments}
                              disabled={!canEdit}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!memoizedFilters.assessmentId && memoizedFilters.subjectId !== 'all' && (
        <Alert>
          <AlertDescription>
            Selecione uma avaliação específica para visualizar e editar as notas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
