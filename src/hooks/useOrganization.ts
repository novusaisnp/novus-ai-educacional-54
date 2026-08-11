

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

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, organizations(*)')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        return profileData;
      }

      // Guardian do portal não tem linha em profiles (é staff-only) — cai pra entidades.
      const { data: guardianData, error: guardianError } = await supabase
        .from('entidades')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (guardianData) {
        return guardianData;
      }

      throw profileError ?? guardianError ?? new Error('Organização não encontrada');
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return {
    ...query,
    orgId: query.data?.organization_id
  };
};

