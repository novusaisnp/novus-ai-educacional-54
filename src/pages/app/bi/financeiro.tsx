import { CreditCard } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { useBIAccess } from '@/hooks/useBIAccess';
import EmptyState from '@/components/EmptyState';

export default function BIFinanceiro() {
  const { canView } = useBIAccess();

  if (!canView) {
    return (
      <EmptyState
        title="Acesso negado"
        description="Você não tem permissão para acessar o BI Financeiro."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={CreditCard} tone="success" />
        <div>
          <h1 className="text-2xl font-bold">BI Financeiro</h1>
          <p className="text-muted-foreground">
            Análise financeira e de inadimplência
          </p>
        </div>
      </div>

      <EmptyState
        title="ERP não configurado"
        description="O BI Financeiro requer integração com ERP real (leitura de contas a receber/inadimplência), que ainda não existe hoje — só o envio de título/cliente para o ERP está implementado. Fatia futura."
        action={
          <a href="/app/config/integracoes">
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
              Configurar ERP
            </button>
          </a>
        }
      />
    </div>
  );
}
