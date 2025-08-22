import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/hooks/useOrganization';
import { usePortalData } from '@/hooks/usePortalData';
import { logAudit } from '@/lib/audit/logAudit';
import { getERPConfig } from '@/lib/featureFlags';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { erpClient } from '@/integrations/erp/client';
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

  const erpConfig = getERPConfig(orgId || '');
  const hasERP = erpConfig.enabled && !erpConfig.mock;

  // Get financial data from ERP
  const { data: financialData, isLoading } = useQuery({
    queryKey: ['portal-financial', orgId, guardian?.cpf, period],
    queryFn: async () => {
      if (!guardian?.cpf || !hasERP) return null;

      // Mock ERP response structure for now
      // In real implementation, this would call erpClient methods
      return {
        receivables: [
          {
            documentNumber: 'BOL-001-2024',
            description: 'Mensalidade Janeiro 2024',
            dueDate: '2024-01-15',
            amount: 850.00,
            status: 'paid',
            paymentDate: '2024-01-10',
          },
          {
            documentNumber: 'BOL-002-2024',
            description: 'Mensalidade Fevereiro 2024',
            dueDate: '2024-02-15',
            amount: 850.00,
            status: 'open',
            paymentLink: 'https://example.com/pay/bol-002-2024',
          },
          {
            documentNumber: 'BOL-003-2024',
            description: 'Mensalidade Março 2024',
            dueDate: '2024-03-15',
            amount: 850.00,
            status: 'overdue',
            paymentLink: 'https://example.com/pay/bol-003-2024',
          },
        ]
      };
    },
    enabled: !!guardian?.cpf && hasERP && !!orgId,
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
                    {receivable.paymentLink && receivable.status !== 'paid' && (
                      <Button size="sm" onClick={() => window.open(receivable.paymentLink, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Pagar
                      </Button>
                    )}
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