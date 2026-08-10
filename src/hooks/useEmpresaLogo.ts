import { useQuery } from '@tanstack/react-query';
import { resolveEmpresaLogoUrl } from '@/integrations/erp/getEmpresaLogo';

export function useEmpresaLogo(orgId?: string | null, fallbackLogoUrl?: string | null) {
  return useQuery({
    queryKey: ['empresa-logo', orgId, fallbackLogoUrl],
    queryFn: () => resolveEmpresaLogoUrl(orgId as string, fallbackLogoUrl),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
