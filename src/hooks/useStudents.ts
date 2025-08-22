
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { logger } from '@/lib/logger';

export const useStudents = (classId?: string) => {
  const { data: orgData } = useOrganization();

  // Query key estável e serializável
  const queryKey = ['students', orgData?.organization_id, classId].filter(Boolean);

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      // Usar tabela students diretamente (views serão implementadas quando schema permitir)
      let query = supabase
        .from('students')
        .select('id, first_name, last_name, status, document_id')
        .eq('organization_id', orgData.organization_id)
        .eq('status', 'ativo');

      // Se classId fornecido, buscar apenas estudantes da turma
      if (classId) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('class_id', classId)
          .eq('status', 'ativa');

        if (enrollments && enrollments.length > 0) {
          const studentIds = enrollments.map(e => e.student_id);
          query = query.in('id', studentIds);
        }
      }

      const { data, error } = await query.order('first_name');

      if (error) {
        logger.error('Erro ao buscar estudantes', { error: error.message, classId });
        throw error;
      }

      return data || [];
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};
