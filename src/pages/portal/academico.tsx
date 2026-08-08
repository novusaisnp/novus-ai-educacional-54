import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import PortalPageHeader from '@/components/portal/PortalPageHeader';
import { GraduationCap, Paperclip } from 'lucide-react';
import {
  useLinkedStudents,
  useStudentGrades,
  useStudentAttendance,
  useAttendanceJustifications,
  useCreateAttendanceJustification,
  StudentAttendanceRow,
  AttendanceJustification,
} from '@/hooks/usePortalAcademic';

function getStatusLabel(status: StudentAttendanceRow['status']) {
  switch (status) {
    case 'presente': return 'Presente';
    case 'falta': return 'Ausente';
    case 'atraso': return 'Atraso';
    case 'justificada': return 'Justificado';
  }
}

function getStatusColor(status: StudentAttendanceRow['status']) {
  switch (status) {
    case 'presente': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'falta': return 'bg-red-100 text-red-800 border-red-200';
    case 'atraso': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'justificada': return 'bg-sky-100 text-sky-800 border-sky-200';
  }
}

// Última justificativa por attendance_id (mais recente primeiro) — se a mais
// recente foi recusada, o responsável pode enviar outra pro mesmo dia.
function latestJustificationByAttendance(justifications: AttendanceJustification[]) {
  const map = new Map<string, AttendanceJustification>();
  for (const j of [...justifications].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (!map.has(j.attendance_id)) map.set(j.attendance_id, j);
  }
  return map;
}

function JustifyAbsenceDialog({
  attendanceId,
  studentId,
  open,
  onOpenChange,
}: {
  attendanceId: string;
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createJustification = useCreateAttendanceJustification();

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await createJustification.mutateAsync({ attendanceId, studentId, reason: reason.trim(), file });
    setReason('');
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Justificar falta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="justify-reason">Motivo</Label>
            <Textarea
              id="justify-reason"
              placeholder="Descreva o motivo da falta/atraso..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Atestado ou comprovante (opcional)</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="h-4 w-4 mr-2" />
              {file ? file.name : 'Anexar arquivo'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!reason.trim() || createJustification.isPending}>
            {createJustification.isPending ? 'Enviando...' : 'Enviar justificativa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PortalAcademico() {
  const { data: students, isLoading: loadingStudents } = useLinkedStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [justifyingAttendanceId, setJustifyingAttendanceId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedStudentId && students && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const { data: grades, isLoading: loadingGrades } = useStudentGrades(selectedStudentId || undefined);
  const { data: attendance, isLoading: loadingAttendance } = useStudentAttendance(selectedStudentId || undefined);
  const { data: justifications } = useAttendanceJustifications(selectedStudentId || undefined);
  const latestJustification = latestJustificationByAttendance(justifications || []);

  const attendanceCounts = (attendance || []).reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { presente: 0, falta: 0, atraso: 0, justificada: 0 } as Record<StudentAttendanceRow['status'], number>
  );
  const totalAttendance = attendance?.length || 0;
  const attendanceRate = totalAttendance > 0
    ? Math.round(((attendanceCounts.presente + attendanceCounts.atraso) / totalAttendance) * 100)
    : null;

  if (loadingStudents) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          title="Notas e Frequência"
          description="Acompanhamento acadêmico"
          icon={<GraduationCap className="h-8 w-8 text-primary" />}
        />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum aluno vinculado ao seu cadastro.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Notas e Frequência"
        description="Acompanhamento acadêmico em tempo real"
        icon={<GraduationCap className="h-8 w-8 text-primary" />}
        action={
          students.length > 1 ? (
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Presenças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{attendanceCounts.presente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attendanceCounts.falta}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{attendanceCounts.atraso}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGrades ? (
            <Skeleton className="h-24 w-full" />
          ) : !grades || grades.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma nota lançada ainda.</p>
          ) : (
            <div className="space-y-2">
              {grades.map((row) => (
                <div key={row.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div>
                    <p className="font-medium">{row.assessment?.title || 'Avaliação'}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.assessment?.subject?.name} · {row.assessment?.date ? new Date(row.assessment.date).toLocaleDateString('pt-BR') : ''}
                      {row.comments ? ` · ${row.comments}` : ''}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    {row.grade !== null ? row.grade.toFixed(1) : '—'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequência recente</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAttendance ? (
            <Skeleton className="h-24 w-full" />
          ) : !attendance || attendance.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro de frequência ainda.</p>
          ) : (
            <>
            <div className="space-y-2">
              {attendance.slice(0, 20).map((row) => {
                const justification = latestJustification.get(row.id);
                const canJustify = (row.status === 'falta' || row.status === 'atraso') &&
                  (!justification || justification.status === 'recusada');

                return (
                  <div key={row.id} className="flex items-center justify-between border-b pb-2 last:border-b-0 gap-2">
                    <div>
                      <p className="font-medium">{row.subject?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(row.date).toLocaleDateString('pt-BR')}
                        {row.note ? ` · ${row.note}` : ''}
                      </p>
                      {justification?.status === 'pendente' && (
                        <p className="text-xs text-amber-600 mt-1">Justificativa enviada — aguardando revisão da escola</p>
                      )}
                      {justification?.status === 'recusada' && (
                        <p className="text-xs text-red-600 mt-1">
                          Justificativa recusada{justification.review_note ? `: ${justification.review_note}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={getStatusColor(row.status)}>{getStatusLabel(row.status)}</Badge>
                      {canJustify && (
                        <Button size="sm" variant="outline" onClick={() => setJustifyingAttendanceId(row.id)}>
                          {justification?.status === 'recusada' ? 'Reenviar' : 'Justificar'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {justifyingAttendanceId && selectedStudentId && (
              <JustifyAbsenceDialog
                attendanceId={justifyingAttendanceId}
                studentId={selectedStudentId}
                open={!!justifyingAttendanceId}
                onOpenChange={(open) => {
                  if (!open) setJustifyingAttendanceId(null);
                }}
              />
            )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
