
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgSettings } from '@/hooks/useOrgSettings';

interface PortalConfig {
  enabled: boolean;
  allowRegister: boolean;
  allowOpenRequests: boolean;
}

const defaultConfig: PortalConfig = {
  enabled: true,
  allowRegister: true,
  allowOpenRequests: true,
};

export function usePortalConfig() {
  const { isLoading: isLoadingOrg } = useOrganization();
  const { settings, saveKey, isSaving } = useOrgSettings();

  const config: PortalConfig = { ...defaultConfig, ...(settings.portal as Partial<PortalConfig> | undefined) };

  const save = async (newConfig: Partial<PortalConfig>) => {
    await saveKey('portal', { ...config, ...newConfig });
  };

  return {
    config,
    loading: isLoadingOrg,
    save,
    isLoading: isLoadingOrg || isSaving,
  };
}
