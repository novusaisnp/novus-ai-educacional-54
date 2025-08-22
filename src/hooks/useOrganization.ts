

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './useSession';

export const useOrganization = () => {
  const { user } = useSession();

  const query = useQuery({
    queryKey: ['organization', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id, organizations(*)')
        .eq('id', user.id)
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    ...query,
    orgId: query.data?.organization_id
  };
};

