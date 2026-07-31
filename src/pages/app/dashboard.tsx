import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { BICard } from '@/components/bi/BICard';
import { Users, FileText, MessageCircle, AlertCircle } from 'lucide-react';
import { subDays } from 'date-fns';
import { useOrganization } from '@/hooks/useOrganization';
import { safeQuery } from '@/lib/safeQuery';
import EmptyState from '@/components/EmptyState';

export default function Dashboard() {
  const { orgId } = useOrganization();
  const navigate = useNavigate();

  // Query para contar visitantes (Leads)
  const { data: visitorsCount, isLoading: visitorsLoading } = useQuery({
    queryKey: ['visitors-count', orgId],
    queryFn: async () => {
      return await safeQuery(async () => {
        const { data, error } = await supabase
          .from('visitors')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId);

        if (error) {
          console.warn('Erro ao carregar visitantes:', error.message);
          return 0;
        }

        return data?.length || 0;
      }, 0);
    },
    enabled: Boolean(orgId),
  });

  // Query para contar demandas abertas
  const { data: requestsCount, isLoading: requestsLoading } = useQuery({
    queryKey: ['requests-count', orgId],
    queryFn: async () => {
      return await safeQuery(async () => {
        const { data, error } = await supabase
          .from('requests')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId)
          .neq('status', 'concluida');

        if (error) {
          console.warn('Erro ao carregar demandas:', error.message);
          return 0;
        }

        return data?.length || 0;
      }, 0);
    },
    enabled: Boolean(orgId),
  });

  // Query para contar interações dos últimos 7 dias
  const { data: interactionsCount, isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions-count', orgId],
    queryFn: async () => {
      return await safeQuery(async () => {
        const sevenDaysAgo = subDays(new Date(), 7);
        const { data, error } = await supabase
          .from('interactions')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId)
          .gte('created_at', sevenDaysAgo.toISOString());

        if (error) {
          console.warn('Erro ao carregar interações:', error.message);
          return 0;
        }

        return data?.length || 0;
      }, 0);
    },
    enabled: Boolean(orgId),
  });

  // Query para contar documentos pendentes
  const { data: documentsCount, isLoading: documentsLoading } = useQuery({
    queryKey: ['documents-count', orgId],
    queryFn: async () => {
      return await safeQuery(async () => {
        const { data, error } = await supabase
          .from('documents')
          .select('id', { count: 'exact' })
          .eq('organization_id', orgId);

        if (error) {
          console.warn('Erro ao carregar documentos:', error.message);
          return 0;
        }

        return data?.length || 0;
      }, 0);
    },
    enabled: Boolean(orgId),
  });

  // Se não há orgId, mostrar estado vazio
  if (!orgId) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral do sistema educacional
            </p>
          </div>
        </div>
        
        <EmptyState
          title="Organização não selecionada"
          description="Selecione ou crie uma organização para visualizar os dados do dashboard"
          action={
            <Button onClick={() => navigate('/app/onboarding')}>
              Criar organização
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema educacional
          </p>
        </div>
      </div>

      {/* Cards de métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <BICard
          title="Leads"
          value={visitorsCount || 0}
          subtitle="Total de visitantes registrados"
          icon={Users}
          isLoading={visitorsLoading}
        />
        <BICard
          title="Demandas"
          value={requestsCount || 0}
          subtitle="Solicitações em aberto"
          icon={AlertCircle}
          isLoading={requestsLoading}
        />
        <BICard
          title="Interações (7 dias)"
          value={interactionsCount || 0}
          subtitle="Interações nos últimos 7 dias"
          icon={MessageCircle}
          isLoading={interactionsLoading}
        />
        <BICard
          title="Documentos"
          value={documentsCount || 0}
          subtitle="Total de documentos"
          icon={FileText}
          isLoading={documentsLoading}
        />
      </div>
    </div>
  );
}