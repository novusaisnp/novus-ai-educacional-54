
import { safeLocalStorage } from './utils/localStorage';
import { supabase } from '@/integrations/supabase/client';

export interface ERPConfig {
  enabled: boolean;
  baseUrl: string;
  signingSecret: string;
  mock: boolean;
  empresaRepresentadaId: string;
  events: {
    clientUpsert?: boolean;
    receivableCreated?: boolean;
    paymentWebhook?: boolean;
  };
}

const DEFAULT_ERP_CONFIG: ERPConfig = {
  enabled: false,
  baseUrl: '',
  signingSecret: '',
  mock: true,
  empresaRepresentadaId: '',
  events: {
    clientUpsert: false,
    receivableCreated: false,
    paymentWebhook: false,
  },
};

export const getERPConfig = async (orgId: string): Promise<ERPConfig> => {
  if (!orgId) return DEFAULT_ERP_CONFIG;

  const { data, error } = await supabase
    .from('erp_integration_config')
    .select('*')
    .eq('organization_id', orgId)
    .maybeSingle();

  if (error || !data) return DEFAULT_ERP_CONFIG;

  const events = (data.events as ERPConfig['events']) || {};
  return {
    enabled: data.enabled,
    baseUrl: data.base_url || '',
    signingSecret: data.signing_secret || '',
    mock: data.mock,
    empresaRepresentadaId: data.empresa_representada_id || '',
    events: { ...DEFAULT_ERP_CONFIG.events, ...events },
  };
};

export const setERPConfig = async (orgId: string, config: Partial<ERPConfig>): Promise<void> => {
  if (!orgId) return;

  const current = await getERPConfig(orgId);
  const merged: ERPConfig = {
    ...current,
    ...config,
    events: { ...current.events, ...config.events },
  };

  await supabase.from('erp_integration_config').upsert({
    organization_id: orgId,
    enabled: merged.enabled,
    mock: merged.mock,
    base_url: merged.baseUrl || null,
    signing_secret: merged.signingSecret || null,
    empresa_representada_id: merged.empresaRepresentadaId || null,
    events: merged.events,
    updated_at: new Date().toISOString(),
  });
};

export const maskSecret = (secret: string): string => {
  if (!secret || secret.length < 8) return '***';
  return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
};

export interface IAConfig {
  enabled: boolean;            // master switch
  chatbot: boolean;            // /app/crm/assistente
  risco: boolean;              // coluna + botões em Alunos
  feedback: boolean;           // Correção com IA
  financeiro: boolean;         // Aba Financeiro (IA)
}

const DEFAULT_IA_CONFIG: IAConfig = {
  enabled: false,
  chatbot: false,
  risco: false,
  feedback: false,
  financeiro: false,
};

const getIAStorageKey = (orgId: string) => `ia_config_${orgId}`;

export const getIAConfig = (orgId: string): IAConfig => {
  try {
    const stored = safeLocalStorage.getItem(getIAStorageKey(orgId));
    if (!stored) return DEFAULT_IA_CONFIG;
    
    const parsed = JSON.parse(stored);
    return { 
      ...DEFAULT_IA_CONFIG, 
      ...parsed
    };
  } catch (error) {
    return DEFAULT_IA_CONFIG;
  }
};

export const setIAConfig = (orgId: string, config: Partial<IAConfig>): void => {
  try {
    const currentConfig = getIAConfig(orgId);
    const newConfig = { 
      ...currentConfig, 
      ...config
    };
    safeLocalStorage.setItem(getIAStorageKey(orgId), JSON.stringify(newConfig));
  } catch (error) {
    // Erro já logado pelo safeLocalStorage
  }
};

export interface PortalConfig {
  enabled: boolean;
  allowRegister: boolean;
  allowOpenRequests: boolean;
}

const DEFAULT_PORTAL_CONFIG: PortalConfig = {
  enabled: false,
  allowRegister: false,
  allowOpenRequests: true,
};

const getPortalStorageKey = (orgId: string) => `portal_config_${orgId}`;

export const getPortalConfig = (orgId?: string): PortalConfig => {
  if (!orgId) return DEFAULT_PORTAL_CONFIG;
  try {
    const stored = safeLocalStorage.getItem(getPortalStorageKey(orgId));
    if (!stored) return DEFAULT_PORTAL_CONFIG;
    
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_PORTAL_CONFIG, ...parsed };
  } catch (error) {
    return DEFAULT_PORTAL_CONFIG;
  }
};

export const setPortalConfig = (orgId: string, config: Partial<PortalConfig>): void => {
  try {
    const currentConfig = getPortalConfig(orgId);
    const newConfig = { ...currentConfig, ...config };
    safeLocalStorage.setItem(getPortalStorageKey(orgId), JSON.stringify(newConfig));
  } catch (error) {
    // Error já logado pelo safeLocalStorage
  }
};

export const isFeatureEnabled = (feature: string, orgId: string): boolean => {
  // Implemente a lógica para verificar se a feature está habilitada para a organização
  // Você pode usar um sistema de configuração, variáveis de ambiente ou um banco de dados
  // para armazenar as informações sobre as features habilitadas para cada organização.

  // Este é apenas um exemplo, substitua pela sua implementação real.
  if (feature === 'some_feature') {
    return orgId === 'org123'; // Habilitado apenas para a organização com ID "org123"
  }

  return false; // Desabilitado por padrão
};
