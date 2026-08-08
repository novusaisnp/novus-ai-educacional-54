import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from './usePortalAuth';
import { useOrganization } from './useOrganization';
import { useToast } from '@/hooks/use-toast';
import { uploadGuardianDoc } from '@/lib/storage';
import { logger } from '@/lib/logger';

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

export interface AttendanceJustification {
  id: string;
  attendance_id: string;
  reason: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  review_note: string | null;
  created_at: string;
}

// Justificativas já enviadas pelo responsável pro aluno — usado pra saber, por
// linha de frequência, se já existe justificativa (e em que status) sem deixar
// reenviar enquanto uma pendente não é revisada (mesma trava do banco, refletida
// na UI pra não depender só do erro 23505 vindo do insert).
export const useAttendanceJustifications = (studentId?: string) => {
  const { guardian } = usePortalAuth();

  return useQuery({
    queryKey: ['portal.attendance_justifications', studentId, guardian?.id],
    queryFn: async (): Promise<AttendanceJustification[]> => {
      if (!studentId || !guardian?.id) return [];

      const { data, error } = await supabase
        .from('attendance_justifications')
        .select('id, attendance_id, reason, status, review_note, created_at')
        .eq('student_id', studentId)
        .eq('guardian_id', guardian.id);

      if (error) throw error;
      return (data || []) as AttendanceJustification[];
    },
    enabled: !!studentId && !!guardian?.id,
  });
};

// Envio de justificativa de falta/atraso pelo responsável — motivo obrigatório,
// anexo opcional. Fica 'pendente' até staff revisar (trigger no banco decide,
// guardian nunca escreve attendance.status diretamente).
export const useCreateAttendanceJustification = () => {
  const { guardian } = usePortalAuth();
  const { orgId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { attendanceId: string; studentId: string; reason: string; file?: File | null }) => {
      if (!guardian?.id || !orgId) throw new Error('Responsável ou organização não encontrada');

      let documentId: string | undefined;
      if (data.file) {
        const { docData } = await uploadGuardianDoc(data.file, orgId, guardian.id, ['justificativa_falta']);
        documentId = docData.id;
      }

      const { error } = await supabase.from('attendance_justifications').insert({
        organization_id: orgId,
        attendance_id: data.attendanceId,
        student_id: data.studentId,
        guardian_id: guardian.id,
        reason: data.reason,
        document_id: documentId,
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portal.attendance_justifications', variables.studentId, guardian?.id] });
      toast({
        title: 'Justificativa enviada',
        description: 'A escola vai revisar e confirmar em breve.',
      });
    },
    onError: (error: Error) => {
      logger.error('Error creating attendance justification', { error: error.message });
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar justificativa',
        description: error.message,
      });
    },
  });
};
