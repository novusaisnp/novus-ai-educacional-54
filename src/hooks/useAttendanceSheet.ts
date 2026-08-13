import { useEffect, useMemo, useState } from 'react';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useSession } from './useSession';
import { useUserRole } from './useUserRole';
import { useClassSubjects } from './useClassSubjects';
import { useToast } from './use-toast';

// Valores batem com o CHECK constraint de public.attendance.status
// (attendance_status_check) — não são livres.
export type AttendanceStatus = 'presente' | 'falta' | 'atraso' | 'justificada';

export interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
  note?: string;
}

export const ATTENDANCE_MUTATION_KEY = ['attendance', 'save'];

/**
 * Lógica da chamada, compartilhada pela tela desktop (`/app/academico/chamada`)
 * e pela mobile (`/m/staff/chamada`). Duas cópias do mesmo upsert foi como o
 * bug de fuso se espalhou antes — a data aqui é sempre string 'yyyy-MM-dd'.
 */
export function useAttendanceSheet(params: { classId?: string; subjectId?: string; date?: string }) {
  const { classId, subjectId, date } = params;
  const { orgId } = useOrganization();
  const { user } = useSession();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});

  const { data: classes = [] } = useQuery({
    queryKey: ['classes', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, series:series_id(name)')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: classSubjects = [] } = useClassSubjects(classId || undefined);

  // Turma sem currículo configurado cai no fallback "todas as disciplinas"
  // (mesma transição da tela desktop).
  const availableSubjects = useMemo(() => {
    if (classSubjects.length === 0) return subjects;
    const assigned = userRole === 'professor'
      ? classSubjects.filter((cs) => cs.teacher_id === user?.id)
      : classSubjects;
    const assignedIds = new Set(assigned.map((cs) => cs.subject_id));
    return subjects.filter((s) => assignedIds.has(s.id));
  }, [subjects, classSubjects, userRole, user?.id]);

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-by-class', classId, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('student_id, students!inner(id, first_name, last_name)')
        .eq('class_id', classId!)
        .eq('status', 'ativa')
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data.map((enrollment) => enrollment.students).filter(Boolean);
    },
    enabled: !!classId && !!orgId,
  });

  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['attendance', classId, subjectId, date, orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId!)
        .eq('subject_id', subjectId!)
        .eq('date', date!)
        .eq('organization_id', orgId!);
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId && !!date && !!orgId,
  });

  // Todo aluno da turma entra no mapa já como 'presente': a UI sempre exibiu
  // esse default, mas ele não existia no estado — abrir a chamada e salvar sem
  // tocar em ninguém gravava zero linhas e ainda assim dizia "registrada".
  useEffect(() => {
    const map: Record<string, AttendanceRecord> = {};
    students.forEach((student) => {
      map[student.id] = { student_id: student.id, status: 'presente' };
    });
    existingAttendance.forEach((record) => {
      map[record.student_id] = {
        student_id: record.student_id,
        status: record.status as AttendanceStatus,
        note: record.note || undefined,
      };
    });
    setAttendanceData(map);
  }, [existingAttendance, students]);

  const save = useMutation({
    // mutationKey nomeada: é por ela que a UI enxerga a mutation pausada
    // offline (useMutationState abaixo).
    mutationKey: ATTENDANCE_MUTATION_KEY,
    mutationFn: async (records: AttendanceRecord[]) => {
      if (!classId || !subjectId || !date || !orgId) throw new Error('Dados incompletos');

      const rows = records.map((record) => ({
        organization_id: orgId,
        class_id: classId,
        subject_id: subjectId,
        student_id: record.student_id,
        date,
        status: record.status,
        note: record.note || null,
      }));

      // A UNIQUE real de public.attendance é (class_id, subject_id, student_id,
      // date) — SEM organization_id. Incluir coluna fora da constraint faz o
      // Postgres rejeitar com 400 (42P10). Não "melhorar" esta lista.
      const { error } = await supabase.from('attendance').upsert(rows, {
        onConflict: 'class_id,subject_id,student_id,date',
      });
      if (error) throw error;

      const statusCounts = records.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      await supabase.from('audit_logs').insert({
        organization_id: orgId,
        table_name: 'attendance',
        action: 'attendance_upsert_many',
        actor: user?.id,
        diff: { class_id: classId, subject_id: subjectId, date, total_records: records.length, status_counts: statusCounts },
      });
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Presença registrada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['attendance', classId, subjectId, date, orgId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: 'Erro ao salvar presença. Tente novamente.', variant: 'destructive' });
      console.error('Erro ao salvar presença:', error);
    },
  });

  const toggleStatus = (studentId: string, cycle: AttendanceStatus[] = ['presente', 'falta', 'atraso', 'justificada']) => {
    setAttendanceData((prev) => {
      const current = prev[studentId]?.status || cycle[0];
      const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
      return { ...prev, [studentId]: { student_id: studentId, status: next, note: prev[studentId]?.note } };
    });
  };

  const setNote = (studentId: string, note: string) => {
    setAttendanceData((prev) => ({
      ...prev,
      [studentId]: { student_id: studentId, status: prev[studentId]?.status || 'presente', note: note || undefined },
    }));
  };

  const markAllAs = (status: AttendanceStatus) => {
    setAttendanceData(
      Object.fromEntries(
        students.map((s) => [s.id, { student_id: s.id, status, note: attendanceData[s.id]?.note }])
      )
    );
  };

  const statusCounts = Object.values(attendanceData).reduce(
    (acc, record) => ({ ...acc, [record.status]: (acc[record.status] || 0) + 1 }),
    { presente: 0, falta: 0, atraso: 0, justificada: 0 } as Record<AttendanceStatus, number>
  );

  return {
    classes,
    subjects,
    availableSubjects,
    students,
    studentsLoading,
    attendanceData,
    setAttendanceData,
    toggleStatus,
    setNote,
    markAllAs,
    clearAll: () => setAttendanceData({}),
    statusCounts,
    save,
  };
}

/**
 * Quantas chamadas estão pausadas esperando conexão. O react-query já segura a
 * mutation offline e a dispara sozinho ao voltar a rede (networkMode padrão);
 * isto aqui só existe pro professor VER que ainda não sincronizou.
 *
 * ponytail: pausa vive em memória — fechar o app antes de voltar a rede perde a
 * chamada não sincronizada. Persistir exige @tanstack/query-persist-client-core
 * + persister; adicionar se acontecer na prática.
 */
export function usePendingAttendanceSyncs(): number {
  return useMutationState({
    filters: { mutationKey: ATTENDANCE_MUTATION_KEY, status: 'pending' },
    select: (mutation) => mutation.state.isPaused,
  }).filter(Boolean).length;
}
