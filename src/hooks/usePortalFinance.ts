import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getERPConfig } from '@/lib/featureFlags';
import { useOrganization } from './useOrganization';
import { usePortalData } from './usePortalData';

export interface Receivable {
  id: string;
  documentNumber: string;
  description: string;
  dueDate: string;
  amount: number;
  status: 'open' | 'paid' | 'overdue' | 'canceled' | string;
  paymentDate: string | null;
  /** Linha digitável / PIX copia-e-cola, quando o ERP mandou no evento. */
  payCode: string | null;
}

// O ERP é quem emite o título; aqui só se lê o que chegou pelo webhook.
const STATUS_MAP: Record<string, Receivable['status']> = {
  aberto: 'open',
  parcial: 'open',
  pago: 'paid',
  vencido: 'overdue',
  cancelado: 'canceled',
};

// O payload do ERP não tem coluna própria pra linha digitável — ela vem dentro
// de raw_event, com nome variável conforme o meio de pagamento.
const PAY_CODE_KEYS = ['linha_digitavel', 'linhaDigitavel', 'codigo_barras', 'pix_copia_e_cola', 'pixCopiaECola'];

function extractPayCode(rawEvent: unknown): string | null {
  if (!rawEvent || typeof rawEvent !== 'object') return null;
  const event = rawEvent as Record<string, unknown>;
  for (const key of PAY_CODE_KEYS) {
    const value = event[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Mensalidades do responsável logado, compartilhado pelo portal web e pelo app
 * mobile. Sem ERP configurado (ou em modo mock) não há dado real pra mostrar —
 * `hasERP` false é EmptyState na tela, não lista vazia mentindo que está tudo pago.
 */
export function usePortalFinance(periodDays?: number) {
  const { orgId } = useOrganization();
  const { guardian } = usePortalData();

  const { data: erpConfig } = useQuery({
    queryKey: ['erp-config', orgId],
    queryFn: () => getERPConfig(orgId || ''),
    enabled: !!orgId,
  });
  const hasERP = !!erpConfig?.enabled && !erpConfig?.mock;

  const query = useQuery({
    queryKey: ['portal-financial', orgId, guardian?.id, periodDays ?? 'all'],
    queryFn: async (): Promise<Receivable[]> => {
      let request = supabase
        .from('financial_transactions')
        .select('*')
        .eq('organization_id', orgId!)
        .eq('guardian_id', guardian!.id)
        .order('due_date', { ascending: false });

      if (periodDays) {
        const from = new Date();
        from.setDate(from.getDate() - periodDays);
        request = request.gte('due_date', from.toLocaleDateString('en-CA'));
      }

      const { data, error } = await request;
      if (error) throw error;

      return (data || []).map((row) => ({
        id: row.id,
        documentNumber: row.numero_documento || row.id,
        description: row.description || 'Mensalidade',
        dueDate: row.due_date,
        amount: Number(row.amount ?? 0),
        status: STATUS_MAP[row.status] || row.status,
        paymentDate: row.payment_date,
        payCode: extractPayCode(row.raw_event),
      }));
    },
    enabled: !!guardian?.id && !!orgId && hasERP,
    staleTime: 5 * 60 * 1000,
  });

  return { hasERP, receivables: query.data || [], isLoading: query.isLoading };
}
