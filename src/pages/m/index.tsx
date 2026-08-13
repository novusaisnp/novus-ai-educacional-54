import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { usePortalAuth } from '@/hooks/usePortalAuth';

/**
 * Dispatcher de /m: decide qual "pele" o usuário logado vê.
 *
 * Regra de desempate: STAFF GANHA. Um pai que também trabalha na escola cai na
 * pele de staff — ele consegue ver o filho pelo desktop/portal, mas não
 * consegue dar aula pela pele da família.
 */
export default function MobileIndex() {
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { isGuardian, loading: guardianLoading } = usePortalAuth();

  if (roleLoading || guardianLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (role) return <Navigate to="/m/staff/chamada" replace />;
  if (isGuardian) return <Navigate to="/m/familia/inicio" replace />;

  return <Navigate to="/portal/login" replace />;
}
