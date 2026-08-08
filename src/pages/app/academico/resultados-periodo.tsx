import { useState, useCallback, useMemo } from 'react';
import { ClipboardCheck, RefreshCw } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useClasses, useSubjects, useAcademicTerms } from '@/hooks/useAppQueries';
import { useTermResults, useCalculateTermResults } from '@/hooks/useTermResults';
import { useCanEditGrades } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import EmptyState from '@/components/EmptyState';

export default function ResultadosPeriodo() {
  const { data: orgData } = useOrganization();
  const canCalculate = useCanEditGrades();

  const [classId, setClassId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: academicTerms = [] } = useAcademicTerms();

  const filtersReady = !!classId && !!subjectId && !!termId;

  const { data: results = [], isLoading } = useTermResults(
    filtersReady ? termId : undefined,
    filtersReady ? classId : undefined,
    filtersReady ? subjectId : undefined
  );
  const calculateMutation = useCalculateTermResults();

  const handleCalculate = useCallback(() => {
    if (!filtersReady) return;
    calculateMutation.mutate({ termId, classId, subjectId });
  }, [filtersReady, termId, classId, subjectId, calculateMutation]);

  const summary = useMemo(() => {
    const approved = results.filter((r) => r.status === 'aprovado').length;
    const partial = results.filter((r) => r.status === 'progressao_parcial').length;
    return { approved, partial, total: results.length };
  }, [results]);

  if (!orgData?.organization_id) {
    return (
      <EmptyState
        title="Organização não encontrada"
        description="Selecione ou crie uma organização para ver os resultados do período."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={ClipboardCheck} tone="success" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resultados do Período</h1>
          <p className="text-muted-foreground">
            Média, recuperação e situação de aprovação por aluno, turma, disciplina e bimestre/trimestre.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Disciplina" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={termId} onValueChange={setTermId}>
              <SelectTrigger>
                <SelectValue placeholder="Bimestre/Trimestre" />
              </SelectTrigger>
              <SelectContent>
                {academicTerms.map((term) => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filtersReady && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Resultados {summary.total > 0 && `(${summary.approved} aprovado(s), ${summary.partial} em progressão parcial)`}
            </CardTitle>
            {canCalculate && (
              <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${calculateMutation.isPending ? 'animate-spin' : ''}`} />
                {results.length > 0 ? 'Recalcular Resultados' : 'Calcular Resultados'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Nenhum resultado calculado ainda para esta turma/disciplina/período.
                  {canCalculate ? ' Lance as notas das avaliações regulares e clique em "Calcular Resultados".' : ''}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead className="text-center">Média Original</TableHead>
                      <TableHead className="text-center">Nota Recuperação</TableHead>
                      <TableHead className="text-center">Nota Final</TableHead>
                      <TableHead className="text-center">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">
                          {result.students ? `${result.students.first_name} ${result.students.last_name}` : '—'}
                        </TableCell>
                        <TableCell className="text-center">{result.original_average.toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          {result.recovery_grade !== null ? result.recovery_grade.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell className="text-center font-semibold">{result.final_grade.toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={result.status === 'aprovado' ? 'default' : 'destructive'}>
                            {result.status === 'aprovado' ? 'Aprovado' : 'Progressão Parcial'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!filtersReady && (
        <Alert>
          <AlertDescription>Selecione turma, disciplina e período para ver os resultados.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
