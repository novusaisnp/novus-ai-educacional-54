import { Link } from 'react-router-dom';
import { CalendarDays, GraduationCap, MessageCircle } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import StudentSwitcher, { useSelectedStudent } from '@/components/mobile/StudentSwitcher';
import AttendanceRing from '@/components/mobile/AttendanceRing';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudentAttendance, useStudentGrades } from '@/hooks/usePortalAcademic';
import { attendancePercent, formatDateBR } from '@/lib/mobile/utils';

export default function MobileFamiliaInicio() {
  const { student } = useSelectedStudent();
  const { data: attendance = [], isLoading: loadingAttendance } = useStudentAttendance(student?.id);
  const { data: grades = [], isLoading: loadingGrades } = useStudentGrades(student?.id);

  const percent = attendancePercent(attendance);
  const lastGrades = grades.slice(0, 3);

  return (
    <>
      <MobileHeader title="Início" right={<StudentSwitcher />} />

      <div className="space-y-6 p-4">
        <section className="flex flex-col items-center gap-3 rounded-3xl bg-card p-6 shadow-card-hero">
          <p className="text-sm text-muted-foreground">
            {student ? `Como está ${student.first_name}` : 'Selecione um aluno'}
          </p>
          {loadingAttendance ? (
            <Skeleton className="h-[132px] w-[132px] rounded-full" />
          ) : (
            <AttendanceRing percent={percent} />
          )}
          <p className="text-xs text-muted-foreground">
            {attendance.length} {attendance.length === 1 ? 'aula registrada' : 'aulas registradas'}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold">Últimas notas</h2>
          {loadingGrades ? (
            <Skeleton className="h-24 rounded-3xl" />
          ) : lastGrades.length === 0 ? (
            <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
              Nenhuma nota lançada ainda.
            </p>
          ) : (
            <ul className="space-y-3">
              {lastGrades.map((g) => (
                <li key={g.id} className="flex items-center gap-4 rounded-3xl bg-card p-4 shadow-card">
                  <span className="totem-teal grid h-11 w-11 shrink-0 place-items-center rounded-2xl">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{g.assessment?.title ?? 'Avaliação'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {g.assessment?.subject?.name ?? '—'} · {formatDateBR(g.assessment?.date)}
                    </p>
                  </div>
                  <span className="font-display text-xl font-semibold tabular-nums">
                    {g.grade ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Link to="/m/familia/academico" className="flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-card">
            <span className="totem-gold grid h-11 w-11 place-items-center rounded-2xl">
              <CalendarDays className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-medium">Frequência e notas</span>
          </Link>
          <Link to="/m/familia/mensagens" className="flex flex-col gap-2 rounded-3xl bg-card p-4 shadow-card">
            <span className="totem-coral grid h-11 w-11 place-items-center rounded-2xl">
              <MessageCircle className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-medium">Falar com a escola</span>
          </Link>
        </section>
      </div>
    </>
  );
}
