
import { useState, useEffect } from 'react';
import { useOrganization } from '@/hooks/useOrganization';

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
  const [config, setConfig] = useState<PortalConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const { data: orgData } = useOrganization();

  useEffect(() => {
    // Por enquanto, usar configuração padrão
    // No futuro, isso pode ser carregado do banco de dados baseado na organização
    setConfig(defaultConfig);
    setLoading(false);
  }, [orgData]);

  const save = async (newConfig: Partial<PortalConfig>) => {
    // Por enquanto, apenas atualiza o estado local
    // No futuro, isso pode salvar no banco de dados
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  return {
    config,
    loading,
    save,
    isLoading: loading,
  };
}
