import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from './usePortalAuth';

export interface LinkedStudent {
  id: string;
  first_name: string;
  last_name: string;
}

// Filhos/tutelados vinculados ao responsável logado no portal.
export const useLinkedStudents = () => {
  const { guardian } = usePortalAuth();

  return useQuery({
    queryKey: ['portal.linked_students', guardian?.id],
    queryFn: async (): Promise<LinkedStudent[]> => {
      if (!guardian?.id) return [];

      const { data, error } = await supabase
        .from('student_guardians')
        .select('student:student_id(id, first_name, last_name)')
        .eq('guardian_id', guardian.id);

      if (error) throw error;
      return ((data || []) as unknown as { student: LinkedStudent | null }[])
        .map((row) => row.student)
        .filter((student): student is LinkedStudent => student !== null);
    },
    enabled: !!guardian?.id,
    staleTime: 5 * 60 * 1000,
  });
};

export interface StudentGrade {
  id: string;
  grade: number | null;
  comments: string | null;
  assessment: {
    title: string;
    date: string;
    weight: number;
    subject: { name: string } | null;
  } | null;
}

// Notas do aluno — só retorna o que já tem policy de guardian liberando
// (grades_select_guardian: só linhas de filhos vinculados ao responsável).
export const useStudentGrades = (studentId?: string) => {
  return useQuery({
    queryKey: ['portal.student_grades', studentId],
    queryFn: async (): Promise<StudentGrade[]> => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('grades')
        .select('id, grade, comments, assessment:assessment_id(title, date, weight, subject:subject_id(name))')
        .eq('student_id', studentId);

      if (error) throw error;
      const rows = (data || []) as unknown as StudentGrade[];
      return rows.sort((a, b) => (b.assessment?.date ?? '').localeCompare(a.assessment?.date ?? ''));
    },
    enabled: !!studentId,
  });
};

export interface StudentAttendanceRow {
  id: string;
  date: string;
  status: 'presente' | 'falta' | 'atraso' | 'justificada';
  note: string | null;
  subject: { name: string } | null;
}

// Frequência do aluno, mais recente primeiro.
export const useStudentAttendance = (studentId?: string) => {
  return useQuery({
    queryKey: ['portal.student_attendance', studentId],
    queryFn: async (): Promise<StudentAttendanceRow[]> => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select('id, date, status, note, subject:subject_id(name)')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as StudentAttendanceRow[];
    },
    enabled: !!studentId,
  });
};
