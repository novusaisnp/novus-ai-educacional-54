import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, MessageSquare, Clock, Calendar, UserCheck } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { useBIAccess } from '@/hooks/useBIAccess';
import { useBICRM } from '@/hooks/useBIData';
import { BICard } from '@/components/bi/BICard';
import { ExportToolbar } from '@/components/bi/ExportToolbar';
import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { defaultFilters, periodOptions, periodToDates, filtersToQuery, CRMFilters } from '@/lib/bi-filters';
import { logAudit } from '@/lib/audit/logAudit';
import { useOrganization } from '@/hooks/useOrganization';

export default function BICRM() {
  const { canView } = useBIAccess();
  const { data: orgData } = useOrganization();
  const [filters, setFilters] = useState<CRMFilters>(defaultFilters.crm);

  // Converter período para datas quando necessário
  const queryFilters = {
    ...filtersToQuery(filters),
    ...(filters.period ? periodToDates(filters.period) : {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    }),
  };

  const { data: crmData, isLoading } = useBICRM(queryFilters);

  // Auditoria de mudanças de filtro
  useEffect(() => {
    if (orgData?.organization_id) {
      logAudit({
        table_name: 'bi',
        action: 'bi_crm_filter_change',
        diff: filters,
        organization_id: orgData.organization_id,
      });
    }
  }, [filters, orgData?.organization_id]);

  if (!canView) {
    return (
      <EmptyState
        title="Acesso negado"
        description="Você não tem permissão para acessar o BI CRM."
      />
    );
  }

  const csvColumns = [
    { key: 'full_name', label: 'Nome Completo' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'Email' },
    { key: 'purpose', label: 'Propósito' },
    { key: 'visit_date', label: 'Data Visita', format: (date: string) => new Date(date).toLocaleDateString('pt-BR') },
  ];

  // Dados para gráficos baseados nos dados reais
  const leadsByMonth = crmData?.leadsByMonth.reduce((acc: any[], curr) => {
    const month = new Date(curr.visit_date).getMonth();
    const monthName = new Date(curr.visit_date).toLocaleDateString('pt-BR', { month: 'short' });
    
    const existing = acc.find(item => item.month === monthName);
    if (existing) {
      existing.leads += 1;
    } else {
      acc.push({
        month: monthName,
        leads: 1,
      });
    }
    return acc;
  }, []) || [];

  const requestsByStatus = crmData?.requestsByStatus.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.status === curr.status);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        status: curr.status,
        count: 1,
      });
    }
    return acc;
  }, []) || [];

  const interactionsByChannel = crmData?.interactionsByChannel.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.channel === curr.channel);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({
        channel: curr.channel,
        count: 1,
        color: getChannelColor(curr.channel),
      });
    }
    return acc;
  }, []) || [];

  function getChannelColor(channel: string): string {
    const colors: Record<string, string> = {
      phone: '#0d9488',
      email: '#0ea5e9',
      whatsapp: '#10b981',
      presencial: '#f97316',
      sistema: '#8b5cf6',
    };
    return colors[channel] || '#64748b';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={Users} tone="purple" />
          <div>
            <h1 className="text-2xl font-bold">BI CRM</h1>
            <p className="text-muted-foreground">
              Análise de leads, interações e conversões
            </p>
          </div>
        </div>
        
        <ExportToolbar
          reportType="crm"
          data={crmData?.leadsByMonth || []}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="leadType">Tipo de Lead</Label>
              <Select value={filters.leadType} onValueChange={(value) => setFilters(prev => ({ ...prev, leadType: value || 'all' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="visitante">Visitante</SelectItem>
                  <SelectItem value="rematricula">Rematrícula</SelectItem>
                  <SelectItem value="solicitacao">Solicitação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={filters.channel} onValueChange={(value) => setFilters(prev => ({ ...prev, channel: value || 'all' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os canais</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BICard
          title="Total de Leads"
          value={crmData?.totalLeads || 0}
          icon={Users}
          isLoading={isLoading}
        />
        <BICard
          title="Taxa de Conversão"
          value={`${(crmData?.conversionRate || 0).toFixed(1)}%`}
          icon={TrendingUp}
          variant={crmData?.conversionRate >= 20 ? 'success' : 'warning'}
          isLoading={isLoading}
        />
        <BICard
          title="Total de Interações"
          value={crmData?.totalInteractions || 0}
          icon={MessageSquare}
          isLoading={isLoading}
        />
        <BICard
          title="Tempo Resposta Médio"
          value={`${(crmData?.avgResponseTime || 0).toFixed(1)}h`}
          subtitle="Demandas CRM"
          icon={Clock}
          variant={crmData?.avgResponseTime <= 24 ? 'success' : 'warning'}
          isLoading={isLoading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {leadsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={leadsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="leads" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de leads no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Demandas por Status */}
        <Card>
          <CardHeader>
            <CardTitle>Demandas por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={requestsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem demandas no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interações por Canal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Interações por Canal</CardTitle>
          </CardHeader>
          <CardContent>
            {interactionsByChannel.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={interactionsByChannel}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ channel, count }) => `${channel}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {interactionsByChannel.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem interações no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Métricas de Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Leads Convertidos</p>
                <p className="text-sm text-muted-foreground">
                  Do total de {crmData?.totalLeads || 0} leads
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  {Math.round((crmData?.conversionRate || 0) / 100 * (crmData?.totalLeads || 0))}
                </p>
                <Badge variant="outline" className="border-emerald-600 text-emerald-600">
                  {(crmData?.conversionRate || 0).toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Demandas Resolvidas</p>
                <p className="text-sm text-muted-foreground">
                  Status: concluída
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-sky-600">
                  {requestsByStatus.find(r => r.status === 'concluida')?.count || 0}
                </p>
                <Badge variant="outline" className="border-sky-600 text-sky-600">
                  Concluídas
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Engajamento</p>
                <p className="text-sm text-muted-foreground">
                  Interações por lead
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {crmData?.totalLeads ? 
                    ((crmData?.totalInteractions || 0) / crmData.totalLeads).toFixed(1) : 
                    '0.0'
                  }
                </p>
                <Badge variant="outline">
                  Média
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo de Demandas Pendentes */}
      {crmData?.totalRequests > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Demandas Pendentes (SLA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {requestsByStatus
                .filter(req => req.status !== 'concluida')
                .map((statusGroup) => (
                  <div key={statusGroup.status} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={statusGroup.status === 'aberta' ? 'destructive' : 'secondary'}>
                        {statusGroup.status}
                      </Badge>
                    </div>
                    <p className="text-2xl font-bold">
                      {statusGroup.count}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      demandas
                    </p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}