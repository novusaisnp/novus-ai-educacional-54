import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';
import { useOrganization } from './useOrganization';

type UserRole = 'admin' | 'coordenacao' | 'professor' | 'secretario' | null;

export const useUserRole = () => {
  const { user } = useSession();
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['user-role', user?.id, orgData?.organization_id],
    queryFn: async (): Promise<UserRole> => {
      if (!user?.id || !orgData?.organization_id) {
        return null;
      }

      const { data, error } = await supabase.rpc('get_current_user_role');

      if (error) {
        console.error('Erro ao buscar role do usuário:', error);
        return null;
      }

      return data as UserRole || null;
    },
    enabled: !!user?.id && !!orgData?.organization_id,
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

export const useCanEditGrades = () => {
  const { data: role } = useUserRole();
  return ['admin', 'coordenacao', 'professor'].includes(role || '');
};