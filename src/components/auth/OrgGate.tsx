import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { useOrganization } from '@/hooks/useOrganization';
import { performLogout } from '@/components/layout/AppShell';

export default function OrgGate() {
  const { orgId, isLoading } = useOrganization();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full">
          <EmptyState
            title="Conta ainda não vinculada"
            description="Sua conta ainda não está vinculada a nenhuma organização. Aguarde o convite do administrador da sua instituição."
            action={<Button variant="outline" onClick={() => performLogout(navigate)}>Sair</Button>}
          />
        </div>
      </div>
    );
  }

  return <Outlet />;
}
