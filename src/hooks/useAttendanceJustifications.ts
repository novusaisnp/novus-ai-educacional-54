import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from './useOrganization';
import { logger } from '@/lib/logger';
import { getSignedUrl } from '@/lib/storage';

export interface StaffAttendanceJustification {
  id: string;
  reason: string;
  status: 'pendente' | 'aprovada' | 'recusada';
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  document_id: string | null;
  attendance: {
    date: string;
    status: string;
    subject: { name: string } | null;
    class: { name: string } | null;
  } | null;
  student: { first_name: string; last_name: string } | null;
  guardian: { name: string } | null;
  document: { file_path: string; title: string } | null;
}

// Justificativas de falta enviadas por responsáveis — staff (admin/coordenacao/
// professor, mesmo grupo de attendance_manage) revisa aqui. Ordenado pendente
// primeiro (é o que precisa de ação), depois mais recente.
export const useAttendanceJustifications = () => {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['attendance_justifications', orgId],
    queryFn: async (): Promise<StaffAttendanceJustification[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('attendance_justifications')
        .select(`
          id, reason, status, review_note, created_at, reviewed_at, document_id,
          attendance:attendance_id(date, status, subject:subject_id(name), class:class_id(name)),
          student:student_id(first_name, last_name),
          guardian:guardian_id(name),
          document:document_id(file_path, title)
        `)
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows = (data || []) as unknown as StaffAttendanceJustification[];
      return rows.sort((a, b) => {
        if (a.status === 'pendente' && b.status !== 'pendente') return -1;
        if (a.status !== 'pendente' && b.status === 'pendente') return 1;
        return b.created_at.localeCompare(a.created_at);
      });
    },
    enabled: !!orgId,
  });
};

export const useReviewAttendanceJustification = () => {
  const { orgId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; status: 'aprovada' | 'recusada'; reviewNote?: string }) => {
      const { error } = await supabase
        .from('attendance_justifications')
        .update({ status: data.status, review_note: data.reviewNote || null })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance_justifications', orgId] });
      toast({
        title: variables.status === 'aprovada' ? 'Justificativa aprovada' : 'Justificativa recusada',
        description: variables.status === 'aprovada'
          ? 'A frequência do aluno foi atualizada para justificada.'
          : 'O responsável será notificado que a falta continua sem justificativa.',
      });
    },
    onError: (error: Error) => {
      logger.error('Error reviewing attendance justification', { error: error.message });
      toast({
        variant: 'destructive',
        title: 'Erro ao revisar justificativa',
        description: error.message,
      });
    },
  });
};

export const openJustificationDocument = async (filePath: string) => {
  const [bucket, ...pathParts] = filePath.split('/');
  const url = await getSignedUrl(bucket, pathParts.join('/'), 300);
  window.open(url, '_blank');
};
