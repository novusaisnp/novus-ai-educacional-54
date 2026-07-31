import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GraduationCap, Users, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { useBIAccess } from '@/hooks/useBIAccess';
import { useBIAcademico } from '@/hooks/useBIData';
import { BICard } from '@/components/bi/BICard';
import { ExportToolbar } from '@/components/bi/ExportToolbar';
import EmptyState from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { defaultFilters, toItemValue, periodOptions, periodToDates, filtersToQuery, AcademicoFilters } from '@/lib/bi-filters';
import { logAudit } from '@/lib/audit/logAudit';
import { useOrganization } from '@/hooks/useOrganization';

export default function BIAcademico() {
  const { canView } = useBIAccess();
  const { data: orgData } = useOrganization();
  const [filters, setFilters] = useState<AcademicoFilters>(defaultFilters.academico);

  // Converter período para datas quando necessário
  const queryFilters = {
    ...filtersToQuery(filters),
    ...(filters.period ? periodToDates(filters.period) : {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    }),
  };

  const { data: academicData, isLoading } = useBIAcademico(queryFilters);

  // Auditoria de mudanças de filtro
  useEffect(() => {
    if (orgData?.organization_id) {
      logAudit({
        table_name: 'bi',
        action: 'bi_academico_filter_change',
        diff: filters,
        organization_id: orgData.organization_id,
      });
    }
  }, [filters, orgData?.organization_id]);

  if (!canView) {
    return (
      <EmptyState
        title="Acesso negado"
        description="Você não tem permissão para acessar o BI Acadêmico."
      />
    );
  }

  const csvColumns = [
    { key: 'first_name', label: 'Nome' },
    { key: 'last_name', label: 'Sobrenome' },
    { key: 'status', label: 'Status' },
    { key: 'created_at', label: 'Data Matrícula', format: (date: string) => new Date(date).toLocaleDateString('pt-BR') },
  ];

  // Dados para gráficos
  const attendanceByMonth = academicData?.attendance.reduce((acc: any[], curr) => {
    const month = new Date(curr.date).getMonth();
    const monthName = new Date(curr.date).toLocaleDateString('pt-BR', { month: 'short' });
    
    const existing = acc.find(item => item.month === monthName);
    if (existing) {
      existing.presente += curr.status === 'presente' ? 1 : 0;
      existing.total += 1;
    } else {
      acc.push({
        month: monthName,
        presente: curr.status === 'presente' ? 1 : 0,
        total: 1,
      });
    }
    return acc;
  }, []) || [];

  const riskDistribution = [
    { name: 'Baixo Risco', value: academicData?.totalStudents - academicData?.studentsAtRisk || 0, color: '#10b981' },
    { name: 'Alto Risco', value: academicData?.studentsAtRisk || 0, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={GraduationCap} tone="primary" />
          <div>
            <h1 className="text-2xl font-bold">BI Acadêmico</h1>
            <p className="text-muted-foreground">
              Análise de desempenho e frequência dos alunos
            </p>
          </div>
        </div>
        
        <ExportToolbar
          reportType="academico"
          data={academicData?.students || []}
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
              <Label htmlFor="class">Turma</Label>
              <Select value={filters.classId} onValueChange={(value) => setFilters(prev => ({ ...prev, classId: value || 'all' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {academicData?.classes?.map((cls) => (
                    <SelectItem key={toItemValue(cls.id)} value={toItemValue(cls.id)}>
                      {cls.name ?? 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BICard
          title="Total de Alunos"
          value={academicData?.totalStudents || 0}
          icon={Users}
          isLoading={isLoading}
        />
        <BICard
          title="Frequência Média"
          value={`${(academicData?.averageAttendance || 0).toFixed(1)}%`}
          icon={TrendingUp}
          variant={academicData?.averageAttendance >= 85 ? 'success' : 'warning'}
          isLoading={isLoading}
        />
        <BICard
          title="Alunos em Risco"
          value={academicData?.studentsAtRisk || 0}
          subtitle="Risco de evasão >= 80%"
          icon={AlertTriangle}
          variant={academicData?.studentsAtRisk > 0 ? 'danger' : 'success'}
          isLoading={isLoading}
        />
        <BICard
          title="Total de Turmas"
          value={academicData?.totalClasses || 0}
          icon={GraduationCap}
          isLoading={isLoading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequência por Mês */}
        <Card>
          <CardHeader>
            <CardTitle>Frequência por Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="presente"
                    fill="#10b981"
                    name="Presenças"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de frequência
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Risco */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Risco de Evasão</CardTitle>
          </CardHeader>
          <CardContent>
            {riskDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de risco disponíveis
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Alunos em Risco */}
      {academicData?.studentsAtRisk > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alunos em Risco de Evasão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {academicData?.riskData
                .filter(student => student.risco_score >= 0.8)
                .slice(0, 10)
                .map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{student.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Nota média: {student.nota_media?.toFixed(1) || 'N/A'} | 
                        Frequência: {student.freq_media?.toFixed(1) || 'N/A'}%
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Risco: {(student.risco_score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}