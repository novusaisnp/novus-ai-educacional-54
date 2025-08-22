import { useUserRole } from './useUserRole';
import { useIAConfig } from './useIAConfig';

type IAFeature = 'chatbot' | 'risco' | 'feedback' | 'financeiro';

const ROLE_PERMISSIONS: Record<IAFeature, string[]> = {
  chatbot: ['admin', 'coordenacao', 'secretario', 'professor'],
  risco: ['admin', 'coordenacao', 'secretario', 'professor'],
  feedback: ['admin', 'coordenacao', 'professor'],
  financeiro: ['admin', 'coordenacao', 'secretario'],
};

export const useIAAccess = () => {
  const { data: userRole } = useUserRole();
  const { config } = useIAConfig();

  const canAccess = (feature: IAFeature): boolean => {
    if (!config?.enabled || !config[feature]) return false;
    if (!userRole) return false;
    return ROLE_PERMISSIONS[feature].includes(userRole);
  };

  const getAccessStatus = (feature: IAFeature) => {
    if (!config?.enabled) return { canAccess: false, reason: 'IA desativada' };
    if (!config[feature]) return { canAccess: false, reason: 'Recurso desativado' };
    if (!userRole) return { canAccess: false, reason: 'Usuário não identificado' };
    if (!ROLE_PERMISSIONS[feature].includes(userRole)) {
      return { canAccess: false, reason: 'Sem permissão' };
    }
    return { canAccess: true, reason: null };
  };

  return {
    canAccess,
    getAccessStatus,
    isIAEnabled: config?.enabled || false,
    config,
  };
};