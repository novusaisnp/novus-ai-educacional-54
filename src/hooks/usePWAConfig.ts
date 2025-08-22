import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
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
  const [config, setConfig] = useState<PWAConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const { data: orgData } = useOrganization();

  useEffect(() => {
    if (!orgData?.organization_id) return;

    // Carregar configuração do localStorage por organização
    const key = `pwa_config_${orgData.organization_id}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      try {
        const parsedConfig = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsedConfig }));
      } catch (error) {
        logger.warn('usePWAConfig: Failed to parse saved config', { error });
      }
    }
    
    setLoading(false);
  }, [orgData?.organization_id]);

  const save = async (newConfig: Partial<PWAConfig>) => {
    if (!orgData?.organization_id) return;

    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);

    // Salvar no localStorage
    const key = `pwa_config_${orgData.organization_id}`;
    localStorage.setItem(key, JSON.stringify(updatedConfig));

    // Log de auditoria apenas para mudanças importantes
    if ('enabled' in newConfig) {
      await logAudit({
        table_name: 'portal',
        action: 'pwa_enabled_toggle',
        diff: { enabled: newConfig.enabled },
        organization_id: orgData.organization_id
      });

      logger.info('PWA config updated', { 
        enabled: newConfig.enabled, 
        organization_id: orgData.organization_id 
      });
    }
  };

  return {
    config,
    loading,
    save,
    isLoading: loading,
  };
}