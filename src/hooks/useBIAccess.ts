import { useUserRole } from './useUserRole';
import { useOrganization } from './useOrganization';

type BIFeature = 'view' | 'export' | 'schedule';

const ROLE_PERMISSIONS: Record<BIFeature, string[]> = {
  view: ['admin', 'coordenacao', 'secretario'],
  export: ['admin', 'coordenacao', 'secretario'],
  schedule: ['admin', 'coordenacao'],
};

export const useBIAccess = () => {
  const { data: userRole } = useUserRole();
  const { data: orgData } = useOrganization();

  const canAccess = (feature: BIFeature): boolean => {
    if (!userRole || !orgData?.organization_id) return false;
    return ROLE_PERMISSIONS[feature].includes(userRole);
  };

  const getAccessStatus = (feature: BIFeature) => {
    if (!userRole) return { canAccess: false, reason: 'Usuário não identificado' };
    if (!orgData?.organization_id) return { canAccess: false, reason: 'Organização não identificada' };
    if (!ROLE_PERMISSIONS[feature].includes(userRole)) {
      return { canAccess: false, reason: 'Sem permissão' };
    }
    return { canAccess: true, reason: null };
  };

  return {
    canAccess,
    getAccessStatus,
    canView: canAccess('view'),
    canExport: canAccess('export'),
    canSchedule: canAccess('schedule'),
  };
};