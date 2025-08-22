import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, TrendingUp, AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { useBIAccess } from '@/hooks/useBIAccess';
import { useBIFinanceiro } from '@/hooks/useBIData';
import { BICard } from '@/components/bi/BICard';
import { ExportToolbar } from '@/components/bi/ExportToolbar';
import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { defaultFilters, periodOptions, periodToDates, filtersToQuery, FinanceiroFilters } from '@/lib/bi-filters';
import { logAudit } from '@/lib/audit/logAudit';
import { useOrganization } from '@/hooks/useOrganization';

export default function BIFinanceiro() {
  const { canView } = useBIAccess();
  const { data: orgData } = useOrganization();
  const [filters, setFilters] = useState<FinanceiroFilters>(defaultFilters.financeiro);

  // Converter período para datas quando necessário
  const queryFilters = {
    ...filtersToQuery(filters),
    ...(filters.period ? periodToDates(filters.period) : {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    }),
  };

  const { data: financialData, isLoading } = useBIFinanceiro(queryFilters);

  // Auditoria de mudanças de filtro
  useEffect(() => {
    if (orgData?.organization_id) {
      logAudit({
        table_name: 'bi',
        action: 'bi_financeiro_filter_change',
        diff: filters,
        organization_id: orgData.organization_id,
      });
    }
  }, [filters, orgData?.organization_id]);

  if (!canView) {
    return (
      <EmptyState
        title="Acesso negado"
        description="Você não tem permissão para acessar o BI Financeiro."
      />
    );
  }

  // Se ERP não estiver habilitado ou for mock, mostrar empty state
  if (financialData?.isMockData || !financialData?.isERPEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BI Financeiro</h1>
            <p className="text-muted-foreground">
              Análise financeira e de inadimplência
            </p>
          </div>
        </div>

        <EmptyState
          title="ERP não configurado"
          description="O BI Financeiro requer integração com ERP real. Configure nas integrações para ativar este módulo."
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

  const csvColumns = [
    { key: 'student_name', label: 'Aluno' },
    { key: 'amount_due', label: 'Valor Devido', format: (value: number) => `R$ ${value.toFixed(2)}` },
    { key: 'due_date', label: 'Vencimento', format: (date: string) => new Date(date).toLocaleDateString('pt-BR') },
    { key: 'days_overdue', label: 'Dias Atraso' },
  ];

  // Mock de dados para gráficos (substituir por dados reais do ERP)
  const revenueByMonth = [
    { month: 'Jan', receita: 45000 },
    { month: 'Fev', receita: 48000 },
    { month: 'Mar', receita: 52000 },
    { month: 'Abr', receita: 47000 },
    { month: 'Mai', receita: 51000 },
    { month: 'Jun', receita: 49000 },
  ];

  const paymentsByStatus = [
    { status: 'Em dia', count: 180, color: '#22c55e' },
    { status: 'Atraso 1-30 dias', count: 25, color: '#f59e0b' },
    { status: 'Atraso 31-60 dias', count: 12, color: '#ef4444' },
    { status: 'Atraso +60 dias', count: 8, color: '#991b1b' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CreditCard className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BI Financeiro</h1>
            <p className="text-muted-foreground">
              Análise financeira e de inadimplência
            </p>
          </div>
        </div>
        
        <ExportToolbar
          reportType="financeiro"
          data={[]} // Substituir por dados reais quando ERP estiver integrado
          filters={filters}
          csvColumns={csvColumns}
        />
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={filters.period} onValueChange={(value) => setFilters(prev => ({ ...prev, period: value || '30d' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Situação</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value || 'all' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="aberto">Em aberto</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BICard
          title="Receita Total"
          value={`R$ ${(financialData?.totalRevenue || 0).toLocaleString('pt-BR')}`}
          icon={DollarSign}
          variant="success"
          isLoading={isLoading}
        />
        <BICard
          title="Valor em Atraso"
          value={`R$ ${(financialData?.overdueAmount || 0).toLocaleString('pt-BR')}`}
          icon={AlertCircle}
          variant={financialData?.overdueAmount > 0 ? 'danger' : 'success'}
          isLoading={isLoading}
        />
        <BICard
          title="Eficiência Cobrança"
          value={`${(financialData?.paymentEfficiency || 0).toFixed(1)}%`}
          icon={TrendingUp}
          variant={financialData?.paymentEfficiency >= 90 ? 'success' : 'warning'}
          isLoading={isLoading}
        />
        <BICard
          title="Alunos Inadimplentes"
          value={financialData?.studentsWithOverdue || 0}
          icon={AlertCircle}
          variant={financialData?.studentsWithOverdue > 0 ? 'danger' : 'success'}
          isLoading={isLoading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receita por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Receita por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Line 
                  type="monotone" 
                  dataKey="receita" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status dos Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Status dos Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Inadimplência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Alertas de Inadimplência
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="destructive">Crítico</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Alunos com mais de 60 dias de atraso
                </p>
                <p className="text-2xl font-bold text-red-600">8</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                    Atenção
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Alunos com 31-60 dias de atraso
                </p>
                <p className="text-2xl font-bold text-yellow-600">12</p>
              </div>
              
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Moderado</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Alunos com 1-30 dias de atraso
                </p>
                <p className="text-2xl font-bold">25</p>
              </div>
            </div>
            
            <div className="text-center py-4 text-muted-foreground">
              <p>Dados detalhados de inadimplência aparecerão quando o ERP estiver integrado</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}