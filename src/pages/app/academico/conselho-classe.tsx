import { useCallback, useMemo, useState } from 'react';
import { Gavel, Download } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClasses, useAcademicTerms } from '@/hooks/useAppQueries';
import { useTermResultsByClass } from '@/hooks/useTermResults';
import { useStudents } from '@/hooks/useStudents';
import {
  useClassCouncil,
  useClassCouncilOpinions,
  useCreateClassCouncil,
  useUpdateClassCouncilOpinion,
  useFinalizeClassCouncil,
  type ClassCouncilDecision,
} from '@/hooks/useClassCouncils';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { getSignedUrl } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EmptyState from '@/components/EmptyState';

const DECISION_LABELS: Record<ClassCouncilDecision, string> = {
  aprovado: 'Aprovado',
  progressao_parcial: 'Progressão Parcial',
  retido: 'Retido',
};

function OpinionTextarea({
  initialValue,
  onSave,
  disabled,
}: {
  initialValue: string;
  onSave: (value: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <Textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initialValue) onSave(value);
      }}
      disabled={disabled}
      placeholder="Parecer do conselho..."
      className="min-h-[70px] w-64"
    />
  );
}

export default function ConselhoClasse() {
  const { data: orgData } = useOrganization();
  const { data: role } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao';
  const { toast } = useToast();

  const [classId, setClassId] = useState('');
  const [termId, setTermId] = useState('');
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signerName, setSignerName] = useState('');

  const { data: classes = [] } = useClasses();
  const { data: academicTerms = [] } = useAcademicTerms();
  const filtersReady = !!classId && !!termId;

  const { data: students = [] } = useStudents(filtersReady ? classId : undefined);
  const { data: council, isLoading: isLoadingCouncil } = useClassCouncil(
    filtersReady ? classId : undefined,
    filtersReady ? termId : undefined
  );
  const { data: opinions = [], isLoading: isLoadingOpinions } = useClassCouncilOpinions(council?.id);
  const { data: termResults = [] } = useTermResultsByClass(filtersReady ? termId : undefined, filtersReady ? classId : undefined);

  const createCouncil = useCreateClassCouncil();
  const updateOpinion = useUpdateClassCouncilOpinion();
  const finalizeCouncil = useFinalizeClassCouncil();

  const resultsByStudent = useMemo(() => {
    const map = new Map<string, typeof termResults>();
    for (const r of termResults) {
      const list = map.get(r.student_id) || [];
      list.push(r);
      map.set(r.student_id, list);
    }
    return map;
  }, [termResults]);

  const isConcluded = council?.status === 'concluida';
  const pendingCount = opinions.filter((o) => !o.decision).length;
  const allFilled = opinions.length > 0 && pendingCount === 0;

  const selectedClass = classes.find((c) => c.id === classId);
  const selectedTerm = academicTerms.find((t) => t.id === termId);

  const handleCreateCouncil = useCallback(() => {
    createCouncil.mutate({ classId, termId, studentIds: students.map((s) => s.id) });
  }, [classId, termId, students, createCouncil]);

  const handleDownloadPdf = useCallback(async () => {
    if (!council?.document_id) return;
    try {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', council.document_id)
        .single();
      if (error) throw error;

      const [bucket, ...pathParts] = doc.file_path.split('/');
      const url = await getSignedUrl(bucket, pathParts.join('/'), 300);
      window.open(url, '_blank');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao baixar ata', description: error instanceof Error ? error.message : String(error) });
    }
  }, [council?.document_id, toast]);

  const handleFinalize = useCallback(() => {
    if (!council || !orgData?.organization_id || !selectedClass || !selectedTerm) return;

    finalizeCouncil.mutate(
      {
        classCouncilId: council.id,
        classId,
        termId,
        organizationName: orgData?.organizations?.name || 'Instituição',
        className: `${selectedClass.name} - ${selectedClass.series?.name || ''}`,
        termName: selectedTerm.name,
        termDateStart: selectedTerm.date_start,
        termDateEnd: selectedTerm.date_end,
        signerName,
        students: opinions.map((o) => ({
          studentId: o.student_id,
          studentName: o.students ? `${o.students.first_name} ${o.students.last_name}` : o.student_id,
          opinionText: o.opinion_text,
          decision: o.decision,
          subjects: (resultsByStudent.get(o.student_id) || []).map((r) => ({
            subjectName: r.subjects?.name || '—',
            finalGrade: r.final_grade,
            status: r.status,
          })),
        })),
      },
      { onSuccess: () => setSignDialogOpen(false) }
    );
  }, [council, orgData, selectedClass, selectedTerm, classId, termId, signerName, opinions, resultsByStudent, finalizeCouncil]);

  if (!orgData?.organization_id) {
    return (
      <EmptyState
        title="Organização não encontrada"
        description="Selecione ou crie uma organização para ver o conselho de classe."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={Gavel} tone="purple" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conselho de Classe</h1>
          <p className="text-muted-foreground">Ata digital com parecer e decisão do colegiado por aluno, ao final de cada período.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {!filtersReady && (
        <Alert>
          <AlertDescription>Selecione turma e período para ver ou criar a ata.</AlertDescription>
        </Alert>
      )}

      {filtersReady && isLoadingCouncil && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {filtersReady && !isLoadingCouncil && !council && (
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>Nenhuma ata criada ainda para esta turma/período.</span>
            {canManage && (
              <Button size="sm" onClick={handleCreateCouncil} disabled={createCouncil.isPending || students.length === 0}>
                Criar Ata
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {filtersReady && council && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <CardTitle>Pareceres ({opinions.length - pendingCount} de {opinions.length} preenchidos)</CardTitle>
              <Badge variant={isConcluded ? 'default' : 'secondary'}>{isConcluded ? 'Concluída' : 'Rascunho'}</Badge>
            </div>
            <div className="flex gap-2">
              {isConcluded && council.document_id && (
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              )}
              {canManage && !isConcluded && (
                <Button size="sm" onClick={() => setSignDialogOpen(true)} disabled={!allFilled}>
                  Finalizar e Assinar Ata
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingOpinions ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Aluno</TableHead>
                      <TableHead>Situação por Disciplina</TableHead>
                      <TableHead>Parecer</TableHead>
                      <TableHead className="w-[180px]">Decisão do Conselho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opinions.map((opinion) => {
                      const subjectResults = resultsByStudent.get(opinion.student_id) || [];
                      return (
                        <TableRow key={opinion.id}>
                          <TableCell className="font-medium align-top">
                            {opinion.students ? `${opinion.students.first_name} ${opinion.students.last_name}` : '—'}
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {subjectResults.length === 0 ? (
                                <span className="text-muted-foreground text-sm">Sem resultado calculado</span>
                              ) : (
                                subjectResults.map((r) => (
                                  <Badge key={r.id} variant={r.status === 'aprovado' ? 'outline' : 'destructive'} className="text-xs">
                                    {r.subjects?.name}: {r.final_grade.toFixed(1)}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <OpinionTextarea
                              initialValue={opinion.opinion_text || ''}
                              disabled={!canManage || isConcluded}
                              onSave={(value) =>
                                updateOpinion.mutate({ opinionId: opinion.id, classCouncilId: council.id, opinion_text: value })
                              }
                            />
                          </TableCell>
                          <TableCell className="align-top">
                            <Select
                              value={opinion.decision ?? undefined}
                              onValueChange={(value) =>
                                updateOpinion.mutate({
                                  opinionId: opinion.id,
                                  classCouncilId: council.id,
                                  decision: value as ClassCouncilDecision,
                                })
                              }
                              disabled={!canManage || isConcluded}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Pendente" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(DECISION_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar e Assinar Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao finalizar, a ata não poderá mais ser editada e um PDF assinado eletronicamente será gerado.
            </p>
            <div className="space-y-2">
              <Label>Nome de quem assina (coordenação)</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nome completo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFinalize} disabled={!signerName.trim() || finalizeCouncil.isPending}>
              Finalizar e Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
