import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BICard } from '@/components/bi/BICard';
import { BIHeroCard } from '@/components/bi/BIHeroCard';
import { Users, FileText, MessageCircle } from 'lucide-react';
import { subDays } from 'date-fns';
import { useOrganization } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { safeQuery } from '@/lib/safeQuery';
import EmptyState from '@/components/EmptyState';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Dashboard() {
  const { orgId, data: orgData } = useOrganization();
  const { user } = useSession();

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0];
  const orgName = orgData?.organizations?.name;

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
          title="Conta ainda não vinculada"
          description="Sua conta ainda não está vinculada a nenhuma organização. Aguarde o convite do administrador da sua instituição."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral do sistema educacional
          </p>
        </div>
      </div>

      {/* Bento: card-âncora (métrica mais acionável) + 3 cards de apoio,
          em vez de grid uniforme — ver novus-satellite-visual-identity. */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BIHeroCard
          className="lg:row-span-2"
          eyebrow={`${getGreeting()}${firstName ? `, ${firstName}` : ''}${orgName ? ` · ${orgName}` : ''}`}
          value={requestsCount || 0}
          label="Demandas em aberto"
          isLoading={requestsLoading}
        />
        <BICard
          title="Leads"
          value={visitorsCount || 0}
          subtitle="Total de visitantes registrados"
          icon={Users}
          isLoading={visitorsLoading}
          totem
        />
        <BICard
          title="Interações (7 dias)"
          value={interactionsCount || 0}
          subtitle="Interações nos últimos 7 dias"
          icon={MessageCircle}
          isLoading={interactionsLoading}
          totem
        />
        <BICard
          className="md:col-span-2 lg:col-span-2"
          title="Documentos"
          value={documentsCount || 0}
          subtitle="Total de documentos"
          icon={FileText}
          isLoading={documentsLoading}
          totem
        />
      </div>
    </div>
  );
}