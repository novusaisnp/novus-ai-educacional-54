import { useOrganization } from '@/hooks/useOrganization';
import { useOrgSettings } from '@/hooks/useOrgSettings';
import { logAudit } from '@/lib/audit';

interface PWAConfig {
  enabled: boolean;
  installPromptShown: boolean;
  updateAvailable: boolean;
}

const defaultConfig: PWAConfig = {
  enabled: false, // Default desabilitado para segurança
  installPromptShown: false,
  updateAvailable: false,
};

export function usePWAConfig() {
  const { data: orgData, isLoading: isLoadingOrg } = useOrganization();
  const { settings, saveKey, isSaving } = useOrgSettings();

  const config: PWAConfig = { ...defaultConfig, ...(settings.pwa as Partial<PWAConfig> | undefined) };

  const save = async (newConfig: Partial<PWAConfig>) => {
    if (!orgData?.organization_id) return;
    const updatedConfig = { ...config, ...newConfig };
    await saveKey('pwa', updatedConfig);

    if ('enabled' in newConfig) {
      await logAudit({
        table_name: 'portal',
        action: 'pwa_enabled_toggle',
        diff: { enabled: newConfig.enabled },
        organization_id: orgData.organization_id,
      });
    }
  };

  return {
    config,
    loading: isLoadingOrg,
    save,
    isLoading: isLoadingOrg || isSaving,
  };
}
