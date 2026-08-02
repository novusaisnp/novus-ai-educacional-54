import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/hooks/useOrganization';
import { usePortalData } from '@/hooks/usePortalData';
import { logAudit } from '@/lib/audit/logAudit';
import { getERPConfig } from '@/lib/featureFlags';
import { supabase } from '@/integrations/supabase/client';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function PortalFinanceiro() {
  const { orgId } = useOrganization();
  const { guardian } = usePortalData();
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (orgId && guardian?.id) {
      logAudit({
        organization_id: orgId,
        action: 'view_financeiro',
        table_name: 'portal',
        diff: { period }
      });
    }
  }, [orgId, guardian?.id, period]);

  const { data: erpConfig } = useQuery({
    queryKey: ['erp-config', orgId],
    queryFn: () => getERPConfig(orgId || ''),
    enabled: !!orgId,
  });
  const hasERP = !!erpConfig?.enabled && !erpConfig?.mock;

  const STATUS_MAP: Record<string, string> = {
    aberto: 'open',
    parcial: 'open',
    pago: 'paid',
    vencido: 'overdue',
    cancelado: 'canceled',
  };

  // Títulos/pagamentos recebidos do ERP via edu-erp-webhook (Porta 2 - Liquidação)
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['portal-financial', orgId, guardian?.id, period],
    queryFn: async () => {
      if (!guardian?.id || !orgId) return null;

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('guardian_id', guardian.id)
        .order('due_date', { ascending: false });

      if (error) throw error;

      return {
        receivables: (data || []).map((row) => ({
          documentNumber: row.numero_documento || row.id,
          description: row.description || 'Mensalidade',
          dueDate: row.due_date,
          amount: Number(row.amount ?? 0),
          status: STATUS_MAP[row.status] || row.status,
          paymentDate: row.payment_date,
        })),
      };
    },
    enabled: !!guardian?.id && hasERP && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  if (!hasERP) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe suas mensalidades e pagamentos
          </p>
        </div>

        <EmptyState
          title="Módulo financeiro indisponível"
          description="O sistema financeiro não está configurado. Entre em contato com a secretaria para informações sobre pagamentos."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'overdue':
        return 'Vencido';
      case 'open':
        return 'Em aberto';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const receivables = financialData?.receivables || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe suas mensalidades e pagamentos
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total em Aberto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {receivables.filter(r => r.status !== 'paid').reduce((sum, r) => sum + r.amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {receivables.filter(r => r.status !== 'paid').length} parcela(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {receivables.filter(r => r.status === 'overdue').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Necessitam atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {receivables.filter(r => r.status === 'paid').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receivables List */}
      <Card>
        <CardHeader>
          <CardTitle>Mensalidades</CardTitle>
          <CardDescription>
            Histórico de parcelas e status de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receivables.length > 0 ? (
            <div className="space-y-4">
              {receivables.map((receivable) => (
                <div key={receivable.documentNumber} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(receivable.status)}
                    <div>
                      <p className="font-medium">{receivable.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Vencimento: {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                        {receivable.paymentDate && (
                          <span>
                            Pago em: {new Date(receivable.paymentDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-medium">R$ {receivable.amount.toFixed(2)}</p>
                      <Badge variant={getStatusVariant(receivable.status)}>
                        {getStatusLabel(receivable.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma parcela encontrada"
              description="Não há mensalidades para o período selecionado."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}