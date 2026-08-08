import { useMemo, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { usePeriods, useAcademicTerms, useClasses } from '@/hooks/useAppQueries';
import { useStudents } from '@/hooks/useStudents';
import { useClassSubjects } from '@/hooks/useClassSubjects';
import { useTermResultsByClass } from '@/hooks/useTermResults';
import { useIssueBoletim, useIssueHistorico } from '@/hooks/useAcademicReports';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import EmptyState from '@/components/EmptyState';

type LoadingKey = `${string}:${'boletim' | 'historico'}`;

export default function BoletinsPage() {
  const { data: role, isLoading: isLoadingRole } = useUserRole();
  const canIssue = role === 'admin' || role === 'coordenacao' || role === 'secretario';

  const { data: orgData } = useOrganization();
  const orgId = orgData?.organization_id;
  const organizationName = orgData?.organizations?.name || 'Instituição';
  const logoUrl = orgData?.organizations?.logo_url;

  const [periodId, setPeriodId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [classId, setClassId] = useState<string>('');
  const [loadingKey, setLoadingKey] = useState<LoadingKey | null>(null);

  const { data: periods = [] } = usePeriods();
  const { data: terms = [] } = useAcademicTerms(periodId || undefined);
  const { data: classes = [] } = useClasses();
  const { data: students = [], isLoading: isLoadingStudents } = useStudents(classId || undefined);
  const { data: classSubjects = [] } = useClassSubjects(classId || undefined);
  const { data: termResults = [] } = useTermResultsByClass(termId || undefined, classId || undefined);

  const issueBoletimMutation = useIssueBoletim();
  const issueHistoricoMutation = useIssueHistorico();

  const pendingSubjects = useMemo(() => {
    if (!termId || !classId || classSubjects.length === 0) return [];
    const subjectsWithResult = new Set(termResults.map((r) => r.subject_id));
    return classSubjects.filter((cs) => !subjectsWithResult.has(cs.subject_id));
  }, [classSubjects, termResults, termId, classId]);

  const handleGenerateBoletim = async (studentId: string) => {
    if (!orgId || !classId || !termId) return;
    const key: LoadingKey = `${studentId}:boletim`;
    setLoadingKey(key);
    try {
      await issueBoletimMutation.mutateAsync({ orgId, organizationName, logoUrl, studentId, classId, termId });
    } finally {
      setLoadingKey((current) => (current === key ? null : current));
    }
  };

  const handleGenerateHistorico = async (studentId: string) => {
    if (!orgId) return;
    const key: LoadingKey = `${studentId}:historico`;
    setLoadingKey(key);
    try {
      await issueHistoricoMutation.mutateAsync({ orgId, organizationName, logoUrl, studentId });
    } finally {
      setLoadingKey((current) => (current === key ? null : current));
    }
  };

  if (isLoadingRole) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!canIssue) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="A emissão de boletim/histórico é visível apenas para administração, coordenação e secretaria."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={FileText} tone="info" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Boletim & Histórico Escolar</h1>
          <p className="text-muted-foreground">
            Gere e anexe automaticamente o boletim de um bimestre/trimestre ou o histórico acadêmico completo de um aluno.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={periodId}
              onValueChange={(value) => {
                setPeriodId(value);
                setTermId('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Período Letivo" />
              </SelectTrigger>
              <SelectContent>
                {periods.map((period) => (
                  <SelectItem key={period.id} value={period.id}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={termId} onValueChange={setTermId} disabled={!periodId}>
              <SelectTrigger>
                <SelectValue placeholder="Bimestre/Trimestre" />
              </SelectTrigger>
              <SelectContent>
                {terms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Turma" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.series?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!classId && (
        <Alert>
          <AlertDescription>Selecione ao menos a turma para ver os alunos. O boletim também exige período e bimestre/trimestre.</AlertDescription>
        </Alert>
      )}

      {classId && termId && pendingSubjects.length > 0 && (
        <Alert className="border-warning/50 bg-warning/5">
          <AlertDescription>
            {pendingSubjects.length === 1 ? '1 disciplina' : `${pendingSubjects.length} disciplinas`} desta turma ainda não teve resultado
            calculado para este bimestre/trimestre — o boletim mostrará "Pendente" até que{' '}
            <Link to="/app/academico/resultados-periodo" className="underline font-medium">
              Resultados do Período
            </Link>{' '}
            seja calculado.
          </AlertDescription>
        </Alert>
      )}

      {classId && (
        <Card>
          <CardHeader>
            <CardTitle>Alunos da Turma</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : students.length === 0 ? (
              <EmptyState title="Nenhum aluno matriculado" description="Esta turma não tem alunos com matrícula ativa." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const isGeneratingBoletim = loadingKey === `${student.id}:boletim`;
                      const isGeneratingHistorico = loadingKey === `${student.id}:historico`;
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!termId || isGeneratingBoletim}
                              onClick={() => handleGenerateBoletim(student.id)}
                            >
                              {isGeneratingBoletim && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                              Gerar Boletim
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isGeneratingHistorico}
                              onClick={() => handleGenerateHistorico(student.id)}
                            >
                              {isGeneratingHistorico && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                              Gerar Histórico
                            </Button>
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
    </div>
  );
}
