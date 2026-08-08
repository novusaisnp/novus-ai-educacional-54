import { useCallback, useMemo, useState } from 'react';
import { ArrowRightLeft, Download, Plus } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useStudentTransfers,
  useTransferableStudents,
  useCreateStudentTransfer,
  useFinalizeStudentTransfer,
  type StudentTransfer,
} from '@/hooks/useStudentTransfers';
import { useTermResultsByStudent } from '@/hooks/useTermResults';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import { getSignedUrl } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EmptyState from '@/components/EmptyState';

export default function Transferencias() {
  const { data: orgData } = useOrganization();
  const { data: role } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao' || role === 'secretario';
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newDestinationSchool, setNewDestinationSchool] = useState('');
  const [newReason, setNewReason] = useState('');
  const [newTransferDate, setNewTransferDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signDialogOpen, setSignDialogOpen] = useState(false);

  const { data: transfers = [], isLoading } = useStudentTransfers();
  const { data: transferableStudents = [] } = useTransferableStudents();
  const createTransfer = useCreateStudentTransfer();
  const finalizeTransfer = useFinalizeStudentTransfer();

  const selectedTransfer = useMemo(
    () => transfers.find((t) => t.id === selectedTransferId) || null,
    [transfers, selectedTransferId]
  );
  const { data: termResults = [] } = useTermResultsByStudent(selectedTransfer?.student_id);

  const termGroups = useMemo(() => {
    const map = new Map<string, { termName: string; periodName: string; className: string | null; subjects: { subjectName: string; finalGrade: number; status: 'aprovado' | 'progressao_parcial' }[] }>();
    for (const r of termResults) {
      const key = r.term_id;
      if (!map.has(key)) {
        map.set(key, {
          termName: r.academic_terms?.name || 'Período',
          periodName: r.academic_terms?.periods?.name || '—',
          className: r.classes?.name || null,
          subjects: [],
        });
      }
      map.get(key)!.subjects.push({ subjectName: r.subjects?.name || '—', finalGrade: r.final_grade, status: r.status });
    }
    return Array.from(map.values());
  }, [termResults]);

  const handleCreate = useCallback(() => {
    const student = transferableStudents.find((s) => s.id === newStudentId);
    const enrollmentId = student?.enrollments?.[0]?.id;
    if (!enrollmentId) {
      toast({ variant: 'destructive', title: 'Selecione um aluno com matrícula ativa' });
      return;
    }
    createTransfer.mutate(
      { studentId: newStudentId, enrollmentId, destinationSchool: newDestinationSchool, reason: newReason, transferDate: newTransferDate },
      {
        onSuccess: (transfer) => {
          setIsCreateOpen(false);
          setSelectedTransferId(transfer.id);
          setNewStudentId('');
          setNewDestinationSchool('');
          setNewReason('');
        },
      }
    );
  }, [transferableStudents, newStudentId, newDestinationSchool, newReason, newTransferDate, createTransfer, toast]);

  const handleDownloadPdf = useCallback(async (transfer: StudentTransfer) => {
    if (!transfer.document_id) return;
    try {
      const { data: doc, error } = await supabase.from('documents').select('file_path').eq('id', transfer.document_id).single();
      if (error) throw error;
      const [bucket, ...pathParts] = doc.file_path.split('/');
      const url = await getSignedUrl(bucket, pathParts.join('/'), 300);
      window.open(url, '_blank');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao baixar guia', description: error instanceof Error ? error.message : String(error) });
    }
  }, [toast]);

  const handleFinalize = useCallback(() => {
    if (!selectedTransfer || !orgData?.organization_id) return;
    const student = selectedTransfer.students;
    finalizeTransfer.mutate(
      {
        transferId: selectedTransfer.id,
        studentId: selectedTransfer.student_id,
        studentName: student ? `${student.first_name} ${student.last_name}` : '—',
        studentBirthDate: student?.birth_date ?? null,
        studentDocumentId: student?.document_id ?? null,
        originClassName: selectedTransfer.enrollments?.classes
          ? `${selectedTransfer.enrollments.classes.name} - ${selectedTransfer.enrollments.classes.year}`
          : null,
        destinationSchool: selectedTransfer.destination_school,
        reason: selectedTransfer.reason,
        transferDate: selectedTransfer.transfer_date,
        signerName,
        organizationName: orgData?.organizations?.name || 'Instituição',
        termGroups,
      },
      { onSuccess: () => setSignDialogOpen(false) }
    );
  }, [selectedTransfer, orgData, signerName, termGroups, finalizeTransfer]);

  if (!orgData?.organization_id) {
    return (
      <EmptyState
        title="Organização não encontrada"
        description="Selecione ou crie uma organização para gerenciar transferências."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={ArrowRightLeft} tone="warning" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transferência Escolar</h1>
            <p className="text-muted-foreground">Guia de transferência com histórico acadêmico e assinatura eletrônica.</p>
          </div>
        </div>
        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transferência
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transferências ({transfers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transfers.length === 0 ? (
            <EmptyState title="Nenhuma transferência registrada" description="Crie uma nova transferência para começar." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Turma de origem</TableHead>
                    <TableHead>Escola de destino</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => (
                    <TableRow key={transfer.id} className={selectedTransferId === transfer.id ? 'bg-muted/50' : undefined}>
                      <TableCell className="font-medium">
                        {transfer.students ? `${transfer.students.first_name} ${transfer.students.last_name}` : '—'}
                      </TableCell>
                      <TableCell>
                        {transfer.enrollments?.classes ? `${transfer.enrollments.classes.name} (${transfer.enrollments.classes.year})` : '—'}
                      </TableCell>
                      <TableCell>{transfer.destination_school || '—'}</TableCell>
                      <TableCell>{new Date(`${transfer.transfer_date}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        <Badge variant={transfer.status === 'concluida' ? 'default' : 'secondary'}>
                          {transfer.status === 'concluida' ? 'Concluída' : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {transfer.status === 'rascunho' && canManage && (
                            <Button size="sm" variant="outline" onClick={() => setSelectedTransferId(transfer.id)}>
                              Revisar
                            </Button>
                          )}
                          {transfer.status === 'concluida' && transfer.document_id && (
                            <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(transfer)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedTransfer && selectedTransfer.status === 'rascunho' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>
              Revisão da guia — {selectedTransfer.students ? `${selectedTransfer.students.first_name} ${selectedTransfer.students.last_name}` : '—'}
            </CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setSignDialogOpen(true)}>
                Finalizar e Assinar Guia
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Histórico acadêmico que sairá impresso na guia (resultados de período já calculados para este aluno):
            </p>
            {termGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum resultado de período calculado ainda para este aluno.</p>
            ) : (
              <div className="space-y-3">
                {termGroups.map((group, i) => (
                  <div key={i} className="border rounded-md p-3">
                    <div className="font-medium text-sm mb-2">
                      {group.periodName} — {group.termName}
                      {group.className ? ` (${group.className})` : ''}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.subjects.map((s, j) => (
                        <Badge key={j} variant={s.status === 'aprovado' ? 'outline' : 'destructive'} className="text-xs">
                          {s.subjectName}: {s.finalGrade.toFixed(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aluno (com matrícula ativa)</Label>
              <Select value={newStudentId} onValueChange={setNewStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o aluno" />
                </SelectTrigger>
                <SelectContent>
                  {transferableStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                      {s.enrollments?.[0]?.classes ? ` — ${s.enrollments[0].classes.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Escola de destino</Label>
              <Input value={newDestinationSchool} onChange={(e) => setNewDestinationSchool(e.target.value)} placeholder="Nome da escola (opcional)" />
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Motivo da transferência (opcional)" />
            </div>
            <div className="space-y-2">
              <Label>Data da transferência</Label>
              <Input type="date" value={newTransferDate} onChange={(e) => setNewTransferDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!newStudentId || createTransfer.isPending}>
              Iniciar Transferência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar e Assinar Guia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ao finalizar, a matrícula ativa deste aluno será encerrada (status "transferida") e o aluno passará a constar como
              "transferido". Um PDF assinado eletronicamente será gerado. Esta ação não pode ser desfeita pela tela.
            </p>
            <div className="space-y-2">
              <Label>Nome de quem assina (secretaria/coordenação)</Label>
              <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Nome completo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleFinalize} disabled={!signerName.trim() || finalizeTransfer.isPending}>
              Finalizar e Assinar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
