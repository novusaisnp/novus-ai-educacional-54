import { useState } from 'react';
import { ClipboardCheck, Paperclip } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useAttendanceJustifications,
  useReviewAttendanceJustification,
  openJustificationDocument,
  StaffAttendanceJustification,
} from '@/hooks/useAttendanceJustifications';
import EmptyState from '@/components/EmptyState';

function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'aprovada': return 'default';
    case 'recusada': return 'destructive';
    default: return 'secondary';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'aprovada': return 'Aprovada';
    case 'recusada': return 'Recusada';
    default: return 'Pendente';
  }
}

function RejectDialog({
  justification,
  open,
  onOpenChange,
}: {
  justification: StaffAttendanceJustification | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reviewNote, setReviewNote] = useState('');
  const reviewJustification = useReviewAttendanceJustification();

  const handleReject = async () => {
    if (!justification) return;
    await reviewJustification.mutateAsync({
      id: justification.id,
      status: 'recusada',
      reviewNote,
      studentName: justification.student ? `${justification.student.first_name} ${justification.student.last_name}` : '',
      guardianName: justification.guardian?.name ?? '',
      guardianEmail: justification.guardian?.email ?? null,
    });
    setReviewNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar justificativa</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="review-note">Motivo da recusa (opcional, visível ao responsável)</Label>
          <Textarea
            id="review-note"
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleReject} disabled={reviewJustification.isPending}>
            {reviewJustification.isPending ? 'Recusando...' : 'Confirmar recusa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function JustificativasFaltaPage() {
  const { data: role, isLoading: isLoadingRole } = useUserRole();
  const canView = role === 'admin' || role === 'coordenacao' || role === 'professor';

  const { data: justifications = [], isLoading } = useAttendanceJustifications();
  const reviewJustification = useReviewAttendanceJustification();
  const [rejecting, setRejecting] = useState<StaffAttendanceJustification | null>(null);

  if (isLoadingRole) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!canView) {
    return (
      <EmptyState
        title="Acesso restrito"
        description="Esta página é visível apenas para administração, coordenação e professores."
      />
    );
  }

  const pendingCount = justifications.filter((j) => j.status === 'pendente').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={ClipboardCheck} tone="info" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Justificativas de Falta</h1>
          <p className="text-muted-foreground">
            Motivos enviados pelos responsáveis pelo portal, aguardando aprovação.
          </p>
        </div>
      </div>

      {!isLoading && pendingCount > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="text-sm">
              <strong>{pendingCount}</strong> {pendingCount === 1 ? 'justificativa pendente' : 'justificativas pendentes'} de revisão.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && justifications.length === 0 && (
        <EmptyState
          title="Nenhuma justificativa enviada"
          description="Quando um responsável justificar uma falta pelo portal, ela aparece aqui."
        />
      )}

      {!isLoading && justifications.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Disciplina / Turma</TableHead>
                    <TableHead>Data da falta</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {justifications.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">
                        {j.student ? `${j.student.first_name} ${j.student.last_name}` : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {j.attendance?.subject?.name} {j.attendance?.class?.name ? `· ${j.attendance.class.name}` : ''}
                      </TableCell>
                      <TableCell className="text-sm">
                        {j.attendance?.date ? new Date(j.attendance.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell className="text-sm max-w-[240px]">
                        <p className="truncate" title={j.reason}>{j.reason}</p>
                        {j.document && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => openJustificationDocument(j.document!.file_path)}
                          >
                            <Paperclip className="h-3 w-3 mr-1" />
                            {j.document.title}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{j.guardian?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(j.status)}>{getStatusLabel(j.status)}</Badge>
                        {j.status === 'recusada' && j.review_note && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[160px] truncate" title={j.review_note}>
                            {j.review_note}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {j.status === 'pendente' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                reviewJustification.mutate({
                                  id: j.id,
                                  status: 'aprovada',
                                  studentName: j.student ? `${j.student.first_name} ${j.student.last_name}` : '',
                                  guardianName: j.guardian?.name ?? '',
                                  guardianEmail: j.guardian?.email ?? null,
                                })
                              }
                              disabled={reviewJustification.isPending}
                            >
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejecting(j)}
                              disabled={reviewJustification.isPending}
                            >
                              Recusar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <RejectDialog
        justification={rejecting}
        open={!!rejecting}
        onOpenChange={(open) => {
          if (!open) setRejecting(null);
        }}
      />
    </div>
  );
}
