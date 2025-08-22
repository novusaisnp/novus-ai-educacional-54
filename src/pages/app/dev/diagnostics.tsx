import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Download, Play, AlertCircle, CheckCircle, XCircle, SkipForward, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import { useLeads, useDemandas, usePendenciasDoc, useInadimplencia } from '@/hooks/useCRM';
import { useChatbot, useRiskAnalysis, useAssessmentFeedback } from '@/hooks/useAI';
import { useUserRole } from '@/hooks/useUserRole';
import { auditPII } from '@/lib/pii';
import { safeToast } from '@/lib/safeToast';

type TestResult = {
  id: string;                
  title: string;             
  status: 'PASS' | 'FAIL' | 'SKIP';
  durationMs: number;
  details?: string;          
  error?: string;            
};

type DiagnosticsReport = {
  timestamp: string;
  orgId: string;
  orgName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  tests: TestResult[];
  secondRun?: {
    passedSameCounts: boolean;
    diffs: string[];
    tests: TestResult[];
  };
};

export default function DevDiagnosticsPage() {
  const { user } = useSession();
  const { data: organization } = useOrganization();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();

  useEffect(() => {
    logger.info('open_diagnostics_ia');
    if (organization?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_diagnostics_ia', 
        diff: {}, 
        organization_id: organization.organization_id 
      });
    }
  }, [organization?.organization_id]);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<TestResult[]>([]);
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [aiResults, setAiResults] = useState<any>({});
  const [securityResults, setSecurityResults] = useState<TestResult[]>([]);

  // Hooks de IA
  const chatbot = useChatbot();
  const riskAnalysis = useRiskAnalysis();
  const assessmentFeedback = useAssessmentFeedback();

  const orgId = organization?.organization_id;

  // Função para executar um teste individual com informações detalhadas
  const runSingleTest = async (
    id: string, 
    title: string, 
    testFn: () => Promise<{ details: string; createdIds?: string[]; deletedIds?: string[]; readCount?: number; }>
  ): Promise<TestResult> => {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const durationMs = Math.round(performance.now() - startTime);
      return {
        id,
        title,
        status: 'PASS',
        durationMs,
        details: result.details
      };
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      if (error instanceof Error && error.message.includes('SKIP:')) {
        return {
          id,
          title,
          status: 'SKIP',
          durationMs,
          details: error.message.replace('SKIP: ', '')
        };
      }
      return {
        id,
        title,
        status: 'FAIL',
        durationMs,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  // 1. Auth/Sessão
  const testAuthSession = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data.user) throw new Error('Usuário não autenticado');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', data.user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile.organization_id) throw new Error('organization_id não encontrado no perfil');

    return {
      details: `Usuário autenticado: ${data.user.email}, Org ID: ${profile.organization_id}`
    };
  };

  // 2. Organizations
  const testOrganizations = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    const { data, error } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    if (error) throw error;
    if (!data.name) throw new Error('Nome da organização não encontrado');

    return {
      details: `Organização encontrada: ${data.name} (ID: ${orgId})`
    };
  };

  // 3. Students (CRUD mínimo)
  const testStudentsCRUD = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    let studentId: string | null = null;
    const createdIds: string[] = [];
    const deletedIds: string[] = [];
    
    try {
      // INSERT
      const { data, error } = await supabase
        .from('students')
        .insert({
          first_name: 'Teste',
          last_name: 'Diagnóstico',
          organization_id: orgId
        })
        .select('id')
        .single();

      if (error) throw error;
      studentId = data.id;
      createdIds.push(studentId);
      
    } finally {
      // DELETE (cleanup)
      if (studentId) {
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .eq('id', studentId)
          .eq('organization_id', orgId);
        
        if (deleteError) throw deleteError;
        deletedIds.push(studentId);
      }
    }

    return {
      details: `CRUD completo: criado e removido ID ${studentId}`,
      createdIds,
      deletedIds
    };
  };

  // 4. Guardians (CRUD mínimo)
  const testGuardiansCRUD = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    let guardianId: string | null = null;
    const createdIds: string[] = [];
    const deletedIds: string[] = [];
    
    try {
      // INSERT
      const { data, error } = await supabase
        .from('guardians')
        .insert({
          name: 'Responsável Teste',
          organization_id: orgId
        })
        .select('id')
        .single();

      if (error) throw error;
      guardianId = data.id;
      createdIds.push(guardianId);
      
    } finally {
      // DELETE (cleanup)
      if (guardianId) {
        const { error: deleteError } = await supabase
          .from('guardians')
          .delete()
          .eq('id', guardianId)
          .eq('organization_id', orgId);
        
        if (deleteError) throw deleteError;
        deletedIds.push(guardianId);
      }
    }

    return {
      details: `CRUD completo: criado e removido ID ${guardianId}`,
      createdIds,
      deletedIds
    };
  };

  // 5. Classes (read)
  const testClassesRead = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    const { data, error } = await supabase
      .from('classes')
      .select('id, name')
      .eq('organization_id', orgId)
      .limit(10);

    if (error) throw error;
    if (data.length === 0) throw new Error('SKIP: sem turmas');

    return {
      details: `${data.length} turmas encontradas`,
      readCount: data.length
    };
  };

  // 6. Subjects (read)
  const testSubjectsRead = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    const { data, error } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('organization_id', orgId)
      .limit(10);

    if (error) throw error;
    if (data.length === 0) throw new Error('SKIP: sem disciplinas');

    return {
      details: `${data.length} disciplinas encontradas`,
      readCount: data.length
    };
  };

  // 7. Enrollments (read)
  const testEnrollmentsRead = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, student_id, class_id')
      .eq('organization_id', orgId)
      .limit(10);

    if (error) throw error;

    return {
      details: `${data.length} matrículas encontradas`,
      readCount: data.length
    };
  };

  // 8. Assessments (CRUD mínimo)
  const testAssessmentsCRUD = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    // Verificar pré-requisitos
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    if (!classes || classes.length === 0 || !subjects || subjects.length === 0) {
      throw new Error('SKIP: sem class ou subject');
    }

    let assessmentId: string | null = null;
    const createdIds: string[] = [];
    const deletedIds: string[] = [];
    
    try {
      // INSERT
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          title: 'Avaliação Teste',
          class_id: classes[0].id,
          subject_id: subjects[0].id,
          date: new Date().toISOString().split('T')[0],
          organization_id: orgId
        })
        .select('id')
        .single();

      if (error) throw error;
      assessmentId = data.id;
      createdIds.push(assessmentId);
      
    } finally {
      // DELETE (cleanup)
      if (assessmentId) {
        const { error: deleteError } = await supabase
          .from('assessments')
          .delete()
          .eq('id', assessmentId)
          .eq('organization_id', orgId);
        
        if (deleteError) throw deleteError;
        deletedIds.push(assessmentId);
      }
    }

    return {
      details: `CRUD completo: criado e removido ID ${assessmentId}`,
      createdIds,
      deletedIds
    };
  };

  // 9. Grades (constraint/index)
  const testGradesConstraint = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    // Verificar pré-requisitos
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    if (!classes || classes.length === 0 || !subjects || subjects.length === 0 || !students || students.length === 0) {
      throw new Error('SKIP: sem class, subject ou student');
    }

    let assessmentId: string | null = null;
    let gradeId: string | null = null;
    const createdIds: string[] = [];
    const deletedIds: string[] = [];
    
    try {
      // Criar assessment primeiro
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          title: 'Avaliação Grade Teste',
          class_id: classes[0].id,
          subject_id: subjects[0].id,
          date: new Date().toISOString().split('T')[0],
          organization_id: orgId
        })
        .select('id')
        .single();

      if (assessmentError) throw assessmentError;
      assessmentId = assessment.id;
      createdIds.push(assessmentId);

      // INSERT grade
      const { data, error } = await supabase
        .from('grades')
        .insert({
          assessment_id: assessmentId,
          student_id: students[0].id,
          grade: 8.5,
          organization_id: orgId
        })
        .select('id')
        .single();

      if (error) throw error;
      gradeId = data.id;
      createdIds.push(gradeId);
      
    } finally {
      // DELETE (cleanup em ordem reversa)
      if (gradeId) {
        await supabase
          .from('grades')
          .delete()
          .eq('id', gradeId)
          .eq('organization_id', orgId);
        deletedIds.push(gradeId);
      }
      if (assessmentId) {
        await supabase
          .from('assessments')
          .delete()
          .eq('id', assessmentId)
          .eq('organization_id', orgId);
        deletedIds.push(assessmentId);
      }
    }

    return {
      details: `CRUD completo: criado assessment ${assessmentId} e grade ${gradeId}, ambos removidos`,
      createdIds,
      deletedIds
    };
  };

  // 10. Attendance (CRUD mínimo)
  const testAttendanceCRUD = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    // Verificar pré-requisitos
    const { data: classes } = await supabase
      .from('classes')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1);

    if (!classes || classes.length === 0 || !students || students.length === 0 || !subjects || subjects.length === 0) {
      throw new Error('SKIP: sem class, student ou subject');
    }

    let attendanceId: string | null = null;
    const createdIds: string[] = [];
    const deletedIds: string[] = [];
    
    try {
      // INSERT
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          class_id: classes[0].id,
          subject_id: subjects[0].id,
          student_id: students[0].id,
          date: new Date().toISOString().split('T')[0],
          status: 'presente',
          organization_id: orgId
        })
        .select('id')
        .single();

      if (error) throw error;
      attendanceId = data.id;
      createdIds.push(attendanceId);
      
    } finally {
      // DELETE (cleanup)
      if (attendanceId) {
        const { error: deleteError } = await supabase
          .from('attendance')
          .delete()
          .eq('id', attendanceId)
          .eq('organization_id', orgId);
        
        if (deleteError) throw deleteError;
        deletedIds.push(attendanceId);
      }
    }

    return {
      details: `CRUD completo: criado e removido attendance ID ${attendanceId}`,
      createdIds,
      deletedIds
    };
  };

  // 11. Documents (read)
  const testDocumentsRead = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    const { data, error } = await supabase
      .from('documents')
      .select('id, title')
      .eq('organization_id', orgId)
      .limit(10);

    if (error) throw error;

    return {
      details: `${data.length} documentos encontrados`,
      readCount: data.length
    };
  };

  // 12. Requests (CRUD mínimo)
  const testRequestsCRUD = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    
    let requestId: string | null = null;
    const createdIds: string[] = [];
    const deletedIds: string[] = [];
    
    try {
      // INSERT
      const { data, error } = await supabase
        .from('requests')
        .insert({
          request_type: 'teste',
          requester_type: 'system',
          payload: { teste: 'diagnóstico' },
          organization_id: orgId
        })
        .select('id')
        .single();

      if (error) {
        if (error.message.includes('does not exist')) {
          throw new Error('SKIP: tabela requests não existe');
        }
        throw error;
      }
      requestId = data.id;
      createdIds.push(requestId);
      
    } finally {
      // DELETE (cleanup)
      if (requestId) {
        const { error: deleteError } = await supabase
          .from('requests')
          .delete()
          .eq('id', requestId)
          .eq('organization_id', orgId);
        
        if (deleteError) throw deleteError;
        deletedIds.push(requestId);
      }
    }

    return {
      details: `CRUD completo: criado e removido request ID ${requestId}`,
      createdIds,
      deletedIds
    };
  };

  // Função para executar uma bateria de testes
  const runTestsBatch = async (): Promise<TestResult[]> => {
    const tests = [
      { id: 'auth-session', title: 'Auth/Sessão', fn: testAuthSession },
      { id: 'organizations', title: 'Organizations', fn: testOrganizations },
      { id: 'students-crud', title: 'Students (CRUD mínimo)', fn: testStudentsCRUD },
      { id: 'guardians-crud', title: 'Guardians (CRUD mínimo)', fn: testGuardiansCRUD },
      { id: 'classes-read', title: 'Classes (read)', fn: testClassesRead },
      { id: 'subjects-read', title: 'Subjects (read)', fn: testSubjectsRead },
      { id: 'enrollments-read', title: 'Enrollments (read)', fn: testEnrollmentsRead },
      { id: 'assessments-crud', title: 'Assessments (CRUD mínimo)', fn: testAssessmentsCRUD },
      { id: 'grades-constraint', title: 'Grades (constraint/index)', fn: testGradesConstraint },
      { id: 'attendance-crud', title: 'Attendance (CRUD mínimo)', fn: testAttendanceCRUD },
      { id: 'documents-read', title: 'Documents (read)', fn: testDocumentsRead },
      { id: 'requests-crud', title: 'Requests (CRUD mínimo)', fn: testRequestsCRUD },
    ];

    const batchResults: TestResult[] = [];

    for (const test of tests) {
      const result = await runSingleTest(test.id, test.title, test.fn);
      batchResults.push(result);
    }

    return batchResults;
  };

  // Função para comparar duas execuções de testes
  const compareTestRuns = (firstRun: TestResult[], secondRun: TestResult[]) => {
    const diffs: string[] = [];
    let passedSameCounts = true;

    // Comparar contagens de PASS
    const firstPassCount = firstRun.filter(t => t.status === 'PASS').length;
    const secondPassCount = secondRun.filter(t => t.status === 'PASS').length;
    
    if (firstPassCount !== secondPassCount) {
      passedSameCounts = false;
      diffs.push(`Primeira execução: ${firstPassCount} PASS, Segunda execução: ${secondPassCount} PASS`);
    }

    // Comparar resultados individuais
    firstRun.forEach((firstTest, index) => {
      const secondTest = secondRun[index];
      if (firstTest.status !== secondTest.status) {
        diffs.push(`${firstTest.title}: ${firstTest.status} → ${secondTest.status}`);
      }
    });

    return { passedSameCounts, diffs };
  };

  // ========== TESTES DE SEGURANÇA & RLS ==========

  // Teste 1: SELECT students com org diferente deve falhar/zerar
  const testStudentsOrgIsolation = async () => {
    const fakeOrgId = '00000000-0000-0000-0000-000000000000';
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id')
        .eq('organization_id', fakeOrgId)
        .limit(1);

      // Se não deu erro mas retornou vazio, RLS funcionando
      if (!error && data && data.length === 0) {
        return {
          details: 'RLS OK: não retornou dados de outra organização'
        };
      }

      // Se deu erro de RLS, também é bom
      if (error && error.message.includes('RLS')) {
        return {
          details: 'RLS OK: erro de policy ao acessar outra org'
        };
      }

      // Se retornou dados, é problema de segurança
      if (data && data.length > 0) {
        throw new Error(`VULNERABILIDADE: retornou ${data.length} students de outra org`);
      }

      return { details: 'RLS funcionando corretamente' };
    } catch (error: any) {
      if (error.message.includes('VULNERABILIDADE')) {
        throw error;
      }
      return { details: 'RLS OK: acesso negado conforme esperado' };
    }
  };

  // Teste 2: v_guardians_safe deve mascarar PII conforme role
  const testGuardiansPIIMasking = async () => {
    if (!orgId) throw new Error('organization_id não disponível');

    const { data, error } = await supabase
      .from('v_guardians_safe')
      .select('*')
      .limit(5);

    if (error) throw error;

    if (data.length === 0) {
      return { details: 'Sem dados de responsáveis para testar PII' };
    }

    const sampleGuardian = data[0];
    const hasPhone = sampleGuardian.phone !== null;
    const hasEmail = sampleGuardian.email !== null;

    let expectedBehavior = '';
    if (userRole && ['admin', 'coordenacao', 'secretario'].includes(userRole)) {
      expectedBehavior = 'dados completos visíveis (admin/coord/secretario)';
    } else if (userRole === 'professor') {
      expectedBehavior = 'email visível, phone mascarado (professor)';
    } else {
      expectedBehavior = 'dados mascarados (role limitado)';
    }

    return {
      details: `${data.length} responsáveis - ${expectedBehavior}. Phone: ${hasPhone ? 'visível' : 'mascarado'}, Email: ${hasEmail ? 'visível' : 'mascarado'}`
    };
  };

  // Teste 3: Auditoria PII - registrar acesso em audit_logs
  const testPIIAuditing = async () => {
    if (!orgId) throw new Error('organization_id não disponível');
    if (!userRole || !['admin', 'coordenacao', 'secretario'].includes(userRole)) {
      throw new Error('SKIP: usuário sem permissão para acessar PII completo');
    }

    // Buscar um responsável para testar
    const { data: guardians, error } = await supabase
      .from('v_guardians_safe')
      .select('id, phone, email')
      .limit(1);

    if (error) throw error;
    if (guardians.length === 0) throw new Error('SKIP: sem responsáveis para testar');

    const guardian = guardians[0];
    const testColumns = [];
    if (guardian.phone) testColumns.push('phone');
    if (guardian.email) testColumns.push('email');

    if (testColumns.length === 0) {
      return { details: 'Responsável encontrado mas sem PII para auditar' };
    }

    // Registrar auditoria
    await auditPII('guardians', guardian.id, testColumns);

    // Verificar se foi registrado
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'guardians')
      .eq('action', 'READ_PII')
      .order('created_at', { ascending: false })
      .limit(1);

    if (auditError) throw auditError;

    if (auditLogs.length > 0) {
      const recentLog = auditLogs[0];
      return {
        details: `PII auditado com sucesso. Log ID: ${recentLog.id}, Colunas: ${JSON.stringify(testColumns)}`
      };
    }

    throw new Error('Auditoria não registrada em audit_logs');
  };

  // Função para executar todos os testes de segurança
  const runSecurityTests = async () => {
    if (!user || !orgId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado ou organização não encontrada.',
      });
      return;
    }

    setIsRunning(true);
    
    const securityTestsConfig = [
      { id: 'students-org-isolation', title: 'Isolamento Students por Org', fn: testStudentsOrgIsolation },
      { id: 'guardians-pii-masking', title: 'Mascaramento PII Responsáveis', fn: testGuardiansPIIMasking },
      { id: 'pii-auditing', title: 'Auditoria de Acesso PII', fn: testPIIAuditing },
    ];

    const securityTestResults: TestResult[] = [];

    try {
      for (const test of securityTestsConfig) {
        const result = await runSingleTest(test.id, test.title, test.fn);
        securityTestResults.push(result);
      }

      setSecurityResults(securityTestResults);

      const passedCount = securityTestResults.filter(t => t.status === 'PASS').length;
      toast({
        title: 'Testes de Segurança Concluídos',
        description: `${passedCount}/${securityTestResults.length} testes de segurança passaram.`,
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro nos testes de segurança',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Função principal para executar todos os 12 testes
  const runAllTests = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de autenticação',
        description: 'Usuário não autenticado. Faça login primeiro.',
      });
      return;
    }

    if (!orgId) {
      toast({
        variant: 'destructive',
        title: 'Erro de organização',
        description: 'Organização não encontrada.',
      });
      return;
    }

    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const startTime = performance.now();

    try {
      // Primeira execução
      setProgress(10);
      const firstRunResults = await runTestsBatch();
      setResults(firstRunResults);
      setProgress(50);

      // Segunda execução para comparação
      const secondRunResults = await runTestsBatch();
      setProgress(90);

      // Comparar execuções
      const comparison = compareTestRuns(firstRunResults, secondRunResults);

      const totalDuration = Math.round(performance.now() - startTime);
      const passedTests = firstRunResults.filter(test => test.status === 'PASS').length;
      const failedTests = firstRunResults.filter(test => test.status === 'FAIL').length;

      const finalReport: DiagnosticsReport = {
        timestamp: new Date().toISOString(),
        orgId,
        orgName: organization?.organizations?.name || 'N/A',
        totalTests: firstRunResults.length,
        passedTests,
        failedTests,
        totalDuration,
        tests: firstRunResults,
        secondRun: {
          passedSameCounts: comparison.passedSameCounts,
          diffs: comparison.diffs,
          tests: secondRunResults
        }
      };

      setReport(finalReport);
      setProgress(100);

      toast({
        title: 'Testes concluídos',
        description: `${passedTests}/${firstRunResults.length} testes passaram. Segunda execução: ${comparison.passedSameCounts ? 'consistente' : 'inconsistente'}.`,
      });

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro durante os testes',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Função para download do relatório
  const downloadReport = () => {
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-${report.timestamp.split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Relatório baixado',
      description: 'O arquivo JSON foi baixado com sucesso.',
    });
  };

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diagnósticos do Sistema</h1>
          <p className="text-muted-foreground">
            Validação integral com dados reais
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você precisa estar logado para executar os diagnósticos.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const skipCount = results.filter(test => test.status === 'SKIP').length;

  const { data: leads = [] } = useLeads();
  const { data: demandas = [] } = useDemandas();
  const { data: pendenciasDoc = [] } = usePendenciasDoc();
  const { data: inadimplencia } = useInadimplencia();

  const crmDiagnostics = [
    { 
      name: "v_leads acessível", 
      status: leads.length >= 0 ? "success" : "error",
      details: `${leads.length} leads encontrados`
    },
    { 
      name: "v_demandas filtrável", 
      status: demandas.length >= 0 ? "success" : "error",
      details: `${demandas.length} demandas encontradas`
    },
    { 
      name: "v_pendencias_doc funcional", 
      status: pendenciasDoc.length >= 0 ? "success" : "error",
      details: `${pendenciasDoc.length} pendências encontradas`
    },
    { 
      name: "v_inadimplencia disponível", 
      status: inadimplencia ? "success" : "error",
      details: inadimplencia ? 
        `${inadimplencia.total_inadimplentes} inadimplentes${inadimplencia.is_mock_data ? ' (mock)' : ''}` : 
        "Não disponível"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Diagnósticos do Sistema</h1>
        <p className="text-muted-foreground">
          Auditoria forte - 12 testes específicos com execução dupla para validação
        </p>
      </div>

      {/* Informações da organização */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Usuário</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Organização</p>
              <p className="text-sm text-muted-foreground">
                {organization?.organizations?.name || 'Carregando...'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle>Controles de Teste</CardTitle>
          <CardDescription>
            Execute dupla bateria de testes para auditoria forte ou baixe o relatório da última execução
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={runAllTests}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Executando...' : 'Executar testes (com dados reais)'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={downloadReport}
              disabled={!report}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Baixar relatório (JSON)
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Adicionar diagnósticos CRM */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            CRM Educacional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {crmDiagnostics.map((diagnostic) => (
              <div key={diagnostic.name} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <span className="font-medium">{diagnostic.name}</span>
                  <p className="text-sm text-muted-foreground">{diagnostic.details}</p>
                </div>
                <Badge variant={diagnostic.status === "success" ? "default" : "destructive"}>
                  {diagnostic.status === "success" ? "✓" : "✗"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seção de Segurança & RLS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔒 Segurança & RLS
          </CardTitle>
          <CardDescription>
            Testes de isolamento por organização, PII mascarada e auditoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={runSecurityTests}
                disabled={isRunning}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Play className="h-4 w-4" />
                Executar Testes de Segurança
              </Button>
            </div>

            {securityResults.length > 0 && (
              <div className="space-y-3">
                {securityResults.map((test) => (
                  <div key={test.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{test.title}</span>
                      <p className="text-sm text-muted-foreground">{test.details || test.error}</p>
                      <p className="text-xs text-muted-foreground">{test.durationMs}ms</p>
                    </div>
                    <Badge 
                      variant={
                        test.status === 'PASS' ? "default" : 
                        test.status === 'FAIL' ? "destructive" : 
                        "secondary"
                      }
                    >
                      {test.status === 'PASS' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {test.status === 'FAIL' && <XCircle className="h-3 w-3 mr-1" />}
                      {test.status === 'SKIP' && <SkipForward className="h-3 w-3 mr-1" />}
                      {test.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumo dos resultados */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos Resultados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div>
                <p className="text-2xl font-bold">{report.totalTests}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{report.passedTests}</p>
                <p className="text-sm text-muted-foreground">Pass</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{report.failedTests}</p>
                <p className="text-sm text-muted-foreground">Fail</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{skipCount}</p>
                <p className="text-sm text-muted-foreground">Skip</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{report.totalDuration}ms</p>
                <p className="text-sm text-muted-foreground">Tempo total</p>
              </div>
            </div>

            {report.secondRun && (
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={report.secondRun.passedSameCounts ? 'default' : 'destructive'}>
                    {report.secondRun.passedSameCounts ? 'Consistente' : 'Inconsistente'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Segunda execução</span>
                </div>
                {report.secondRun.diffs.length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium mb-1">Diferenças encontradas:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {report.secondRun.diffs.map((diff, index) => (
                        <li key={index} className="text-muted-foreground">{diff}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabela de resultados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teste</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração (ms)</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          test.status === 'PASS' ? 'default' :
                          test.status === 'FAIL' ? 'destructive' :
                          'secondary'
                        }
                        className="flex items-center gap-1 w-fit"
                      >
                        {test.status === 'PASS' && <CheckCircle className="h-3 w-3" />}
                        {test.status === 'FAIL' && <XCircle className="h-3 w-3" />}
                        {test.status === 'SKIP' && <SkipForward className="h-3 w-3" />}
                        {test.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{test.durationMs}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {test.details || test.error}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {/* Seção de Diagnósticos de IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🤖 Diagnósticos de IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Teste do Chatbot */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Chatbot Educacional</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    try {
                      const result = await chatbot.mutateAsync({
                        message: "Olá, quais documentos preciso para matrícula?",
                        entity_type: "general"
                      });
                      
                      setAiResults(prev => ({
                        ...prev,
                        chatbot: {
                          status: 'success',
                          message: result.response || 'Resposta recebida',
                          timestamp: new Date().toISOString()
                        }
                      }));
                      
                      logger.info('Teste do chatbot concluído', { result });
                      safeToast({
                        title: 'Chatbot testado',
                        description: 'Resposta recebida com sucesso'
                      });
                    } catch (error) {
                      logger.error('Erro no teste do chatbot', { error });
                      setAiResults(prev => ({
                        ...prev,
                        chatbot: {
                          status: 'error',
                          error: error instanceof Error ? error.message : 'Erro desconhecido',
                          timestamp: new Date().toISOString()
                        }
                      }));
                      safeToast({
                        variant: 'destructive',
                        title: 'Erro no chatbot',
                        description: 'Sistema de IA indisponível'
                      });
                    }
                  }}
                  disabled={chatbot.isPending}
                  className="w-full mb-3"
                >
                  {chatbot.isPending ? 'Testando...' : 'Testar Chatbot'}
                </Button>
                
                {aiResults.chatbot && (
                  <div className="text-xs space-y-1">
                    <Badge variant={aiResults.chatbot.status === 'success' ? 'default' : 'destructive'}>
                      {aiResults.chatbot.status === 'success' ? '✓ Funcionando' : '✗ Erro'}
                    </Badge>
                    <p className="text-muted-foreground">
                      {aiResults.chatbot.message || aiResults.chatbot.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teste de Análise de Risco */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Análise de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    try {
                      const result = await riskAnalysis.mutateAsync({
                        model_type: 'evasao',
                        force_update: false
                      });
                      
                      setAiResults(prev => ({
                        ...prev,
                        riskAnalysis: {
                          status: 'success',
                          studentsAnalyzed: result.students_analyzed || 0,
                          highRiskCount: result.high_risk_count || 0,
                          timestamp: new Date().toISOString()
                        }
                      }));
                      
                      logger.info('Teste de análise de risco concluído', { result });
                      safeToast({
                        title: 'Análise de risco testada',
                        description: `${result.students_analyzed || 0} alunos analisados`
                      });
                    } catch (error) {
                      logger.error('Erro no teste de análise de risco', { error });
                      setAiResults(prev => ({
                        ...prev,
                        riskAnalysis: {
                          status: 'error',
                          error: error instanceof Error ? error.message : 'Erro desconhecido',
                          timestamp: new Date().toISOString()
                        }
                      }));
                      safeToast({
                        variant: 'destructive',
                        title: 'Erro na análise de risco',
                        description: 'Sistema de predição indisponível'
                      });
                    }
                  }}
                  disabled={riskAnalysis.isPending}
                  className="w-full mb-3"
                >
                  {riskAnalysis.isPending ? 'Analisando...' : 'Testar Análise'}
                </Button>
                
                {aiResults.riskAnalysis && (
                  <div className="text-xs space-y-1">
                    <Badge variant={aiResults.riskAnalysis.status === 'success' ? 'default' : 'destructive'}>
                      {aiResults.riskAnalysis.status === 'success' ? '✓ Funcionando' : '✗ Erro'}
                    </Badge>
                    <p className="text-muted-foreground">
                      {aiResults.riskAnalysis.status === 'success' 
                        ? `${aiResults.riskAnalysis.studentsAnalyzed} alunos, ${aiResults.riskAnalysis.highRiskCount} em risco alto`
                        : aiResults.riskAnalysis.error
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teste de Feedback de Avaliações */}
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Feedback Automático</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    try {
                      const dummyText = "Este é um texto de exemplo para testar o sistema de correção automática. O texto apresenta estrutura básica, mas pode ser melhorado em diversos aspectos como coesão, coerência e organização das ideias principais.";
                      
                      const result = await assessmentFeedback.mutateAsync({
                        assessment_id: 'test-assessment-id',
                        student_id: 'test-student-id',
                        text_content: dummyText
                      });
                      
                      setAiResults(prev => ({
                        ...prev,
                        assessmentFeedback: {
                          status: 'success',
                          grammarScore: result.ai_analysis?.grammar_score || 0,
                          coherenceScore: result.ai_analysis?.coherence_score || 0,
                          suggestionsCount: result.ai_analysis?.suggestions?.length || 0,
                          timestamp: new Date().toISOString()
                        }
                      }));
                      
                      logger.info('Teste de feedback automático concluído', { result });
                      safeToast({
                        title: 'Feedback automático testado',
                        description: 'Análise de texto concluída'
                      });
                    } catch (error) {
                      logger.error('Erro no teste de feedback automático', { error });
                      setAiResults(prev => ({
                        ...prev,
                        assessmentFeedback: {
                          status: 'error',
                          error: error instanceof Error ? error.message : 'Erro desconhecido',
                          timestamp: new Date().toISOString()
                        }
                      }));
                      safeToast({
                        variant: 'destructive',
                        title: 'Erro no feedback automático',
                        description: 'Sistema de correção indisponível'
                      });
                    }
                  }}
                  disabled={assessmentFeedback.isPending}
                  className="w-full mb-3"
                >
                  {assessmentFeedback.isPending ? 'Processando...' : 'Testar Feedback'}
                </Button>
                
                {aiResults.assessmentFeedback && (
                  <div className="text-xs space-y-1">
                    <Badge variant={aiResults.assessmentFeedback.status === 'success' ? 'default' : 'destructive'}>
                      {aiResults.assessmentFeedback.status === 'success' ? '✓ Funcionando' : '✗ Erro'}
                    </Badge>
                    <p className="text-muted-foreground">
                      {aiResults.assessmentFeedback.status === 'success' 
                        ? `Gramática: ${aiResults.assessmentFeedback.grammarScore?.toFixed(1)}, Coerência: ${aiResults.assessmentFeedback.coherenceScore?.toFixed(1)}`
                        : aiResults.assessmentFeedback.error
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
