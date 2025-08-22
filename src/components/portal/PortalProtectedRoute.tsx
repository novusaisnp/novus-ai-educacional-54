import { Navigate, Outlet, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { usePortalConfig } from "@/hooks/usePortalConfig";

export default function PortalProtectedRoute() {
  const { user, loading, isGuardian } = usePortalAuth();
  const { config } = usePortalConfig();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Portal não disponível</h1>
          <p className="text-muted-foreground">
            O Portal dos Responsáveis não está habilitado para esta organização.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/portal/login" replace state={{ from: location.pathname }} />;
  }

  if (!isGuardian) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Acesso não autorizado</h1>
          <p className="text-muted-foreground">
            Você precisa ser um responsável cadastrado para acessar o portal.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}