import { useState } from 'react';
import { CloudOff, Save } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAttendanceSheet,
  usePendingAttendanceSyncs,
  type AttendanceStatus,
} from '@/hooks/useAttendanceSheet';
import { cn } from '@/lib/utils';

// 3 estados por toque: presente -> falta -> atraso. 'justificada' é decisão da
// secretaria (vem da justificativa do responsável), não do professor em sala.
const CYCLE: AttendanceStatus[] = ['presente', 'falta', 'atraso'];

const STATUS_UI: Record<AttendanceStatus, { label: string; className: string }> = {
  presente: { label: 'P', className: 'bg-success text-success-foreground' },
  falta: { label: 'F', className: 'bg-destructive text-destructive-foreground' },
  atraso: { label: 'A', className: 'bg-warning text-warning-foreground' },
  justificada: { label: 'J', className: 'bg-info text-info-foreground' },
};

const today = () => new Date().toISOString().split('T')[0];

export default function MobileStaffChamada() {
  const [classId, setClassId] = useState<string>('');
  const [subjectId, setSubjectId] = useState<string>('');
  const [date, setDate] = useState<string>(today());

  const sheet = useAttendanceSheet({ classId, subjectId, date });
  const pendingSyncs = usePendingAttendanceSyncs();

  const ready = classId && subjectId && date;

  return (
    <>
      <MobileHeader title="Chamada" />

      <div className="space-y-3 p-4 pb-28">
        <div className="space-y-3 rounded-3xl bg-card p-4 shadow-card">
          <Select value={classId} onValueChange={(value) => { setClassId(value); setSubjectId(''); }}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Turma" />
            </SelectTrigger>
            <SelectContent>
              {sheet.classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.series?.name ? `· ${cls.series.name}` : ''} ({cls.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Disciplina" />
            </SelectTrigger>
            <SelectContent>
              {sheet.availableSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* input nativo: date picker do sistema, sem lib de calendário */}
          <Input type="date" className="h-12" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </div>

        {pendingSyncs > 0 && (
          <p className="flex items-center gap-2 rounded-2xl bg-warning/15 px-4 py-3 text-sm text-warning-foreground">
            <CloudOff className="h-4 w-4" />
            {pendingSyncs} chamada(s) aguardando conexão. Sincroniza sozinho quando a rede voltar.
          </p>
        )}

        {ready && (
          <>
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-muted-foreground">
                {sheet.statusCounts.presente}P · {sheet.statusCounts.falta}F · {sheet.statusCounts.atraso}A
              </span>
              <Button variant="ghost" size="sm" onClick={() => sheet.markAllAs('presente')}>
                Todos presentes
              </Button>
            </div>

            {sheet.studentsLoading ? (
              <Skeleton className="h-20 rounded-3xl" />
            ) : sheet.students.length === 0 ? (
              <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
                Nenhum aluno matriculado nesta turma.
              </p>
            ) : (
              sheet.students.map((student) => {
                const status = sheet.attendanceData[student.id]?.status ?? 'presente';
                const ui = STATUS_UI[status];
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => sheet.toggleStatus(student.id, CYCLE)}
                    className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left shadow-card active:scale-[0.99]"
                  >
                    <span className="min-w-0 flex-1 truncate text-base font-medium">
                      {student.first_name} {student.last_name}
                    </span>
                    <span
                      className={cn(
                        'grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-lg font-semibold',
                        ui.className
                      )}
                    >
                      {ui.label}
                    </span>
                  </button>
                );
              })
            )}
          </>
        )}
      </div>

      {ready && sheet.students.length > 0 && (
        <div
          className="fixed inset-x-0 z-40 px-4"
          style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            className="h-12 w-full shadow-card-hero"
            disabled={sheet.save.isPending}
            onClick={() => sheet.save.mutate(Object.values(sheet.attendanceData))}
          >
            <Save className="mr-2 h-4 w-4" />
            {sheet.save.isPending ? 'Salvando…' : 'Salvar chamada'}
          </Button>
        </div>
      )}
    </>
  );
}
