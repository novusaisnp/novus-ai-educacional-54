import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { logger } from '@/lib/logger';

// Hook para dados acadêmicos do BI
export const useBIAcademico = (filters?: { 
  startDate?: string; 
  endDate?: string; 
  classId?: string;
}) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['bi-academico', orgData?.organization_id, filters],
    queryFn: async () => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não identificada');
      }

      // Buscar dados de alunos ativos
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('status', 'ativo');

      if (studentsError) {
        logger.error('Erro ao buscar alunos para BI', { error: studentsError });
        throw studentsError;
      }

      // Buscar dados de turmas
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('*');

      if (classesError) {
        logger.error('Erro ao buscar turmas para BI', { error: classesError });
        throw classesError;
      }

      // Buscar dados de frequência
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', filters?.startDate || '2024-01-01')
        .lte('date', filters?.endDate || '2024-12-31');

      if (attendanceError) {
        logger.error('Erro ao buscar frequência para BI', { error: attendanceError });
        throw attendanceError;
      }

      // Buscar dados de notas
      const { data: grades, error: gradesError } = await supabase
        .from('grades')
        .select(`
          *,
          assessments!inner(*)
        `);

      if (gradesError) {
        logger.error('Erro ao buscar notas para BI', { error: gradesError });
        throw gradesError;
      }

      // Buscar dados de risco de evasão
      const { data: riskData, error: riskError } = await supabase
        .from('v_risco_evasao')
        .select('*');

      if (riskError) {
        logger.warn('View de risco de evasão não disponível', { error: riskError });
      }

      return {
        students: students || [],
        classes: classes || [],
        attendance: attendance || [],
        grades: grades || [],
        riskData: riskData || [],
        totalStudents: students?.length || 0,
        totalClasses: classes?.length || 0,
        averageAttendance: attendance?.length ? 
          attendance.filter(a => a.status === 'presente').length / attendance.length * 100 : 0,
        studentsAtRisk: riskData?.filter(r => r.risco_score >= 0.8).length || 0,
      };
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para dados financeiros do BI (só funciona com ERP real)
export const useBIFinanceiro = (filters?: { 
  startDate?: string; 
  endDate?: string;
}) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['bi-financeiro', orgData?.organization_id, filters],
    queryFn: async () => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não identificada');
      }

      // Retornar dados vazios por enquanto - aguardando integração ERP real
      logger.warn('BI Financeiro: ERP real não implementado ainda');
      
      return {
        totalRevenue: 0,
        overdueAmount: 0,
        paymentEfficiency: 0,
        studentsWithOverdue: 0,
        revenueByMonth: [],
        paymentsByStatus: [],
        isERPEnabled: false,
        isMockData: true,
      };
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para dados CRM do BI
export const useBICRM = (filters?: { 
  startDate?: string; 
  endDate?: string;
}) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['bi-crm', orgData?.organization_id, filters],
    queryFn: async () => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não identificada');
      }

      // Buscar dados de visitantes (leads)
      const { data: visitors, error: visitorsError } = await supabase
        .from('visitors')
        .select('*')
        .gte('visit_date', filters?.startDate || '2024-01-01')
        .lte('visit_date', filters?.endDate || '2024-12-31');

      if (visitorsError) {
        logger.error('Erro ao buscar visitantes para BI', { error: visitorsError });
        throw visitorsError;
      }

      // Buscar dados de interações
      const { data: interactions, error: interactionsError } = await supabase
        .from('interactions')
        .select('*')
        .gte('created_at', filters?.startDate || '2024-01-01')
        .lte('created_at', filters?.endDate || '2024-12-31');

      if (interactionsError) {
        logger.error('Erro ao buscar interações para BI', { error: interactionsError });
        throw interactionsError;
      }

      // Buscar dados de demandas/requests
      const { data: requests, error: requestsError } = await supabase
        .from('requests')
        .select('*')
        .gte('created_at', filters?.startDate || '2024-01-01')
        .lte('created_at', filters?.endDate || '2024-12-31');

      if (requestsError) {
        logger.error('Erro ao buscar demandas para BI', { error: requestsError });
        throw requestsError;
      }

      return {
        totalLeads: visitors?.length || 0,
        totalInteractions: interactions?.length || 0,
        totalRequests: requests?.length || 0,
        conversionRate: visitors?.length ? 
          (visitors.filter(v => v.purpose === 'matricula').length / visitors.length * 100) : 0,
        avgResponseTime: requests?.length ? 
          requests.reduce((acc, r) => acc + (new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()), 0) / requests.length / (1000 * 60 * 60) : 0, // em horas
        leadsByMonth: visitors || [],
        requestsByStatus: requests || [],
        interactionsByChannel: interactions || [],
      };
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para dados de alertas operacionais
export const useBIAlertas = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['bi-alertas', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não identificada');
      }

      // Buscar alertas de hoje (interactions tipo 'alert')
      const today = new Date().toISOString().split('T')[0];
      const { data: alerts, error: alertsError } = await supabase
        .from('interactions')
        .select('*')
        .eq('entity_type', 'alert')
        .gte('created_at', today)
        .lt('created_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

      if (alertsError) {
        logger.error('Erro ao buscar alertas para BI', { error: alertsError });
        throw alertsError;
      }

      // Contar alertas por categoria
      const alertsByCategory = (alerts || []).reduce((acc, alert) => {
        const category = (alert.payload as any)?.category || 'outros';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalAlertas: alerts?.length || 0,
        alertasInadimplencia: alertsByCategory.inadimplencia || 0,
        alertasRiscoEvasao: alertsByCategory.risco_evasao || 0,
        alertasSLA: alertsByCategory.sla_demandas || 0,
        alertasOutros: alertsByCategory.outros || 0,
        alertsToday: alerts || [],
      };
    },
    enabled: !!orgData?.organization_id,
    staleTime: 1 * 60 * 1000, // 1 minuto (alertas precisam ser frescos)
    gcTime: 5 * 60 * 1000,
  });
};