import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from './useOrganization';
import { getIAConfig, setIAConfig, type IAConfig } from '@/lib/featureFlags';

export const useIAConfig = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ia-config', orgData?.organization_id],
    queryFn: () => {
      if (!orgData?.organization_id) return null;
      return getIAConfig(orgData.organization_id);
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  const updateConfig = (config: Partial<IAConfig>) => {
    if (!orgData?.organization_id) return;
    
    setIAConfig(orgData.organization_id, config);
    queryClient.invalidateQueries({ queryKey: ['ia-config', orgData.organization_id] });
  };

  return {
    ...query,
    updateConfig,
    config: query.data,
  };
};