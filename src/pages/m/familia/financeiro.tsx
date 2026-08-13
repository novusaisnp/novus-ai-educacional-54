import { AlertCircle, CheckCircle2, Clock, Copy } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePortalFinance, type Receivable } from '@/hooks/usePortalFinance';
import { cn, formatDateBR } from '@/lib/utils';

const STATUS_UI: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  paid: { label: 'Pago', icon: CheckCircle2, className: 'text-success' },
  overdue: { label: 'Vencido', icon: AlertCircle, className: 'text-destructive' },
  open: { label: 'Em aberto', icon: Clock, className: 'text-warning' },
  canceled: { label: 'Cancelado', icon: Clock, className: 'text-muted-foreground' },
};

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function MobileFamiliaFinanceiro() {
  const { hasERP, receivables, isLoading } = usePortalFinance();
  const { toast } = useToast();

  const openTotal = receivables
    .filter((r) => r.status !== 'paid' && r.status !== 'canceled')
    .reduce((sum, r) => sum + r.amount, 0);

  const copyPayCode = async (receivable: Receivable) => {
    if (!receivable.payCode) return;
    await navigator.clipboard.writeText(receivable.payCode);
    toast({ title: 'Código copiado', description: 'Cole no app do banco pra pagar.' });
  };

  return (
    <>
      <MobileHeader title="Financeiro" />

      <div className="space-y-3 p-4 pb-8">
        {!hasERP ? (
          <EmptyState
            title="Financeiro indisponível"
            description="Os pagamentos ainda não estão integrados. Fale com a secretaria."
          />
        ) : isLoading ? (
          <Skeleton className="h-24 rounded-3xl" />
        ) : receivables.length === 0 ? (
          <EmptyState title="Nenhuma parcela" description="Não há mensalidades registradas." />
        ) : (
          <>
            <div className="rounded-3xl bg-card p-5 shadow-card-hero">
              <p className="text-sm text-muted-foreground">Total em aberto</p>
              <p className="font-display text-3xl font-semibold">{brl(openTotal)}</p>
            </div>

            {receivables.map((receivable) => {
              const ui = STATUS_UI[receivable.status] ?? STATUS_UI.open;
              const Icon = ui.icon;
              return (
                <div key={receivable.id} className="space-y-3 rounded-3xl bg-card p-4 shadow-card">
                  <div className="flex items-start gap-3">
                    <Icon className={cn('mt-1 h-5 w-5 shrink-0', ui.className)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{receivable.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {ui.label} · vence {formatDateBR(receivable.dueDate)}
                        {receivable.paymentDate && ` · pago ${formatDateBR(receivable.paymentDate)}`}
                      </p>
                    </div>
                    <span className="font-display font-semibold">{brl(receivable.amount)}</span>
                  </div>

                  {/* Quem emite boleto/PIX é o ERP; aqui só se repassa o código que veio. */}
                  {receivable.payCode && receivable.status !== 'paid' && (
                    <Button variant="secondary" className="h-11 w-full" onClick={() => copyPayCode(receivable)}>
                      <Copy className="mr-2 h-4 w-4" /> Copiar código de pagamento
                    </Button>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
