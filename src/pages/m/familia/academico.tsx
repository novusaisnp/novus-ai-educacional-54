import { useRef, useState } from 'react';
import { Paperclip } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import StudentSwitcher, { useSelectedStudent } from '@/components/mobile/StudentSwitcher';
import AttendanceRing from '@/components/mobile/AttendanceRing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  useStudentGrades,
  useStudentAttendance,
  useAttendanceJustifications,
  useCreateAttendanceJustification,
  type StudentAttendanceRow,
  type AttendanceJustification,
} from '@/hooks/usePortalAcademic';
import { attendancePercent, formatDateBR } from '@/lib/mobile/utils';

const STATUS_LABEL: Record<StudentAttendanceRow['status'], string> = {
  presente: 'Presente',
  falta: 'Ausente',
  atraso: 'Atraso',
  justificada: 'Justificado',
};

const STATUS_DOT: Record<StudentAttendanceRow['status'], string> = {
  presente: 'bg-success',
  falta: 'bg-destructive',
  atraso: 'bg-warning',
  justificada: 'bg-info',
};

// Justificativa mais recente por attendance_id — se a última foi recusada, o
// responsável pode enviar outra (mesma regra da tela do portal).
function latestByAttendance(justifications: AttendanceJustification[]) {
  const map = new Map<string, AttendanceJustification>();
  for (const j of [...justifications].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (!map.has(j.attendance_id)) map.set(j.attendance_id, j);
  }
  return map;
}

function JustifyDrawer({
  attendanceId,
  studentId,
  onClose,
}: {
  attendanceId: string | null;
  studentId?: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createJustification = useCreateAttendanceJustification();

  const submit = async () => {
    if (!attendanceId || !studentId || !reason.trim()) return;
    await createJustification.mutateAsync({ attendanceId, studentId, reason: reason.trim(), file });
    setReason('');
    setFile(null);
    onClose();
  };

  return (
    <Drawer open={!!attendanceId} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Justificar falta</DrawerTitle>
          <DrawerDescription>A escola revisa e confirma.</DrawerDescription>
        </DrawerHeader>
        <div className="space-y-3 px-4">
          <Textarea
            placeholder="Descreva o motivo da falta ou atraso…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="mr-2 h-4 w-4" />
            {file ? file.name : 'Anexar atestado (foto ou PDF)'}
          </Button>
          {/* captura direto da câmera no celular — sem lib de câmera */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <DrawerFooter>
          <Button onClick={submit} disabled={!reason.trim() || createJustification.isPending}>
            {createJustification.isPending ? 'Enviando…' : 'Enviar justificativa'}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default function MobileFamiliaAcademico() {
  const { student } = useSelectedStudent();
  const [justifying, setJustifying] = useState<string | null>(null);

  const { data: grades = [], isLoading: loadingGrades } = useStudentGrades(student?.id);
  const { data: attendance = [], isLoading: loadingAttendance } = useStudentAttendance(student?.id);
  const { data: justifications = [] } = useAttendanceJustifications(student?.id);
  const latest = latestByAttendance(justifications);

  return (
    <>
      <MobileHeader title="Acadêmico" right={<StudentSwitcher />} />

      <Tabs defaultValue="notas" className="p-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="frequencia">Frequência</TabsTrigger>
        </TabsList>

        <TabsContent value="notas" className="mt-4 space-y-3">
          {loadingGrades ? (
            <Skeleton className="h-24 rounded-3xl" />
          ) : grades.length === 0 ? (
            <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
              Nenhuma nota lançada ainda.
            </p>
          ) : (
            grades.map((g) => (
              <div key={g.id} className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-card">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{g.assessment?.title ?? 'Avaliação'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {g.assessment?.subject?.name ?? '—'} · {formatDateBR(g.assessment?.date)}
                  </p>
                </div>
                <span className="font-display text-xl font-semibold tabular-nums">{g.grade ?? '—'}</span>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="frequencia" className="mt-4 space-y-3">
          <div className="flex justify-center py-2">
            {loadingAttendance ? (
              <Skeleton className="h-[132px] w-[132px] rounded-full" />
            ) : (
              <AttendanceRing percent={attendancePercent(attendance)} />
            )}
          </div>

          {attendance.length === 0 && !loadingAttendance ? (
            <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
              Nenhuma aula registrada ainda.
            </p>
          ) : (
            attendance.map((row) => {
              const justification = latest.get(row.id);
              const canJustify =
                (row.status === 'falta' || row.status === 'atraso') &&
                (!justification || justification.status === 'recusada');

              return (
                <div key={row.id} className="rounded-3xl bg-card p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[row.status]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{formatDateBR(row.date)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.subject?.name ?? 'Geral'} · {STATUS_LABEL[row.status]}
                      </p>
                    </div>
                    {canJustify && (
                      <Button size="sm" variant="outline" onClick={() => setJustifying(row.id)}>
                        Justificar
                      </Button>
                    )}
                  </div>
                  {justification && justification.status !== 'recusada' && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Justificativa {justification.status === 'pendente' ? 'em análise' : 'aprovada'}.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      <JustifyDrawer attendanceId={justifying} studentId={student?.id} onClose={() => setJustifying(null)} />
    </>
  );
}
