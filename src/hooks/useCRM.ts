
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';

// Tipos para CRM
export interface Lead {
  id: string;
  organization_id: string;
  full_name: string;
  document?: string;
  phone?: string;
  email?: string;
  relation?: string;
  visit_date: string;
  purpose?: string;
  notes?: string;
  status: 'ativo' | 'morno' | 'frio' | 'convertido';
  convertido: boolean;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  direction: 'inbound' | 'outbound';
  channel: 'phone' | 'email' | 'whatsapp' | 'presencial' | 'sistema';
  summary: string;
  payload?: Json;
  performed_by: string;
  performed_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface Demanda {
  id: string;
  organization_id: string;
  tipo: string;
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada';
  origem: string;
  requester_id?: string;
  assunto: string;
  descricao: string;
  solicitante_nome?: string;
  criado_por_nome?: string;
  created_at: string;
  updated_at: string;
}

export interface PendenciaDoc {
  id: string;
  organization_id: string;
  entity_type: 'guardian' | 'student';
  entity_id: string;
  entity_name: string;
  pendencia_tipo: string;
  status: string;
  documentos_count: number;
  created_at: string;
  updated_at: string;
}

// Hook para leads - usando tabela visitors como base para leads
export const useLeads = (params?: { status?: string; search?: string }) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.leads', orgData?.organization_id, params],
    queryFn: async () => {
      let query = supabase
        .from('entidades')
        .select('id, organization_id, full_name:nome, document:documento_outro, phone:telefone, email, created_at, updated_at, entidade_papeis!inner(dados_papel)')
        .eq('entidade_papeis.papel', 'VISITANTE');

      if (params?.search) {
        query = query.or(`nome.ilike.%${params.search}%,telefone.ilike.%${params.search}%,email.ilike.%${params.search}%`);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Erro ao buscar leads', { error });
        throw error;
      }

      // Transformar dados de entidades (papel VISITANTE) para formato Lead
      const leads: Lead[] = (data || []).map(visitor => {
        const papel = Array.isArray(visitor.entidade_papeis) ? visitor.entidade_papeis[0] : visitor.entidade_papeis;
        const dadosPapel = (papel?.dados_papel ?? null) as { relation?: string; visit_date?: string; purpose?: string; notes?: string; status?: string } | null;
        const status = (dadosPapel?.status ?? 'ativo') as Lead['status'];
        return {
          id: visitor.id,
          organization_id: visitor.organization_id,
          full_name: visitor.full_name,
          document: visitor.document,
          phone: visitor.phone,
          email: visitor.email,
          relation: dadosPapel?.relation,
          visit_date: dadosPapel?.visit_date ?? '',
          purpose: dadosPapel?.purpose,
          notes: dadosPapel?.notes,
          status,
          convertido: status === 'convertido',
          created_at: visitor.created_at,
          updated_at: visitor.updated_at
        };
      }).sort((a, b) => (b.visit_date || '').localeCompare(a.visit_date || ''));

      return leads;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para lead individual - usando tabela visitors
export const useLead = (id: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.lead', orgData?.organization_id, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entidades')
        .select('id, organization_id, full_name:nome, document:documento_outro, phone:telefone, email, created_at, updated_at, entidade_papeis!inner(dados_papel)')
        .eq('id', id)
        .eq('entidade_papeis.papel', 'VISITANTE')
        .single();

      if (error) {
        logger.error('Erro ao buscar lead', { error, id });
        throw error;
      }

      const papel = Array.isArray(data.entidade_papeis) ? data.entidade_papeis[0] : data.entidade_papeis;
      const dadosPapel = (papel?.dados_papel ?? null) as { relation?: string; visit_date?: string; purpose?: string; notes?: string; status?: string } | null;
      const status = (dadosPapel?.status ?? 'ativo') as Lead['status'];

      // Transformar dados de entidade (papel VISITANTE) para formato Lead
      const lead: Lead = {
        id: data.id,
        organization_id: data.organization_id,
        full_name: data.full_name,
        document: data.document,
        phone: data.phone,
        email: data.email,
        relation: dadosPapel?.relation,
        visit_date: dadosPapel?.visit_date ?? '',
        purpose: dadosPapel?.purpose,
        notes: dadosPapel?.notes,
        status,
        convertido: status === 'convertido',
        created_at: data.created_at,
        updated_at: data.updated_at
      };

      return lead;
    },
    enabled: !!orgData?.organization_id && !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Move um lead entre colunas do kanban — grava em entidade_papeis.dados_papel
// (jsonb), campo status não existia antes (kanban era decorativo, toda linha
// caía em 'ativo' fixo no map acima). Fetch+merge porque PostgREST não faz
// merge parcial de jsonb num único update.
export const useUpdateLeadStatus = () => {
  const queryClient = useQueryClient();
  const { data: orgData } = useOrganization();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Lead['status'] }) => {
      const { data: papel, error: fetchError } = await supabase
        .from('entidade_papeis')
        .select('id, dados_papel')
        .eq('entidade_id', id)
        .eq('papel', 'VISITANTE')
        .single();

      if (fetchError) throw fetchError;

      const nextDadosPapel = { ...(papel.dados_papel as Record<string, Json> ?? {}), status };

      const { error } = await supabase
        .from('entidade_papeis')
        .update({ dados_papel: nextDadosPapel })
        .eq('id', papel.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm.leads', orgData?.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['crm.lead', orgData?.organization_id] });
    },
  });
};

// Hook para interações - usando tabela interactions existente
export const useInteractions = (filters?: { entity_id?: string; entity_type?: string }) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.interactions', orgData?.organization_id, filters],
    queryFn: async () => {
      let query = supabase.from('interactions').select(`
        *,
        profiles!interactions_performed_by_fkey(full_name)
      `);
      
      if (filters?.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      
      if (filters?.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Erro ao buscar interações', { error });
        throw error;
      }
      
      // Transformar dados para formato Interaction
      const interactions: Interaction[] = data?.map(item => ({
        id: item.id,
        organization_id: item.organization_id,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        entity_name: '', // Será preenchido por join se necessário
        direction: item.direction as 'inbound' | 'outbound',
        channel: item.channel as 'phone' | 'email' | 'whatsapp' | 'presencial' | 'sistema',
        summary: item.summary,
        payload: item.payload,
        performed_by: item.performed_by,
        performed_by_name: item.profiles?.full_name || '',
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || [];
      
      return interactions;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para demandas - usando tabela requests existente
export const useDemandas = (filters?: { status?: string; tipo?: string; origem?: string }) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.demandas', orgData?.organization_id, filters],
    queryFn: async () => {
      let query = supabase.from('requests').select(`
        *,
        profiles!requests_created_by_fkey(full_name)
      `);
      
      if (filters?.status && filters.status !== 'todas') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.tipo && filters.tipo !== 'todos') {
        query = query.eq('request_type', filters.tipo);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Erro ao buscar demandas', { error });
        throw error;
      }
      
      // Transformar dados para formato Demanda
      const demandas: Demanda[] = data?.map(item => ({
        id: item.id,
        organization_id: item.organization_id,
        tipo: item.request_type,
        status: item.status as 'aberta' | 'em_andamento' | 'concluida' | 'cancelada',
        origem: item.requester_type,
        requester_id: item.requester_id,
        assunto: (item.payload as { subject?: string; description?: string } | null)?.subject || '',
        descricao: (item.payload as { subject?: string; description?: string } | null)?.description || '',
        solicitante_nome: '',
        criado_por_nome: item.profiles?.full_name || '',
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || [];
      
      return demandas;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ponytail: pendência documental (checklist de doc obrigatório por aluno/responsável) não tem
// tabela/view no schema — construir isso é feature nova, não um mock a destravar. `implemented:false`
// deixa a UI honesta em vez de mostrar "Nenhuma pendência encontrada" (parecia bom, era não-calculado).
export const usePendenciasDoc = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.pendencias-doc', orgData?.organization_id],
    queryFn: async () => {
      const pendencias: PendenciaDoc[] = [];
      return { items: pendencias, implemented: false };
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Inadimplência real via financial_transactions (populada pelo webhook ERP, mesma tabela
// já usada em portal/financeiro.tsx). Sem título vencido sincronizado, o resultado é
// legitimamente zero — não é mais um mock, é dado real que ainda não tem o que mostrar.
export const useInadimplencia = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.inadimplencia', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('guardian_id, amount, status')
        .eq('organization_id', orgData!.organization_id);

      if (error) {
        logger.error('Erro ao buscar inadimplência', { error });
        throw error;
      }

      const vencidos = (data ?? []).filter((t) => t.status === 'vencido');
      const guardiansTotal = new Set((data ?? []).map((t) => t.guardian_id)).size;
      const guardiansInadimplentes = new Set(vencidos.map((t) => t.guardian_id)).size;
      const valorTotalDevido = vencidos.reduce((sum, t) => sum + Number(t.amount ?? 0), 0);

      return {
        total_alunos: guardiansTotal,
        inadimplentes: guardiansInadimplentes,
        total_inadimplentes: guardiansInadimplentes,
        percentual: guardiansTotal > 0 ? Math.round((guardiansInadimplentes / guardiansTotal) * 100) : 0,
        valor_total: valorTotalDevido,
        valor_total_devido: valorTotalDevido,
      };
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Mutation para criar interação
export const useCreateInteraction = () => {
  const queryClient = useQueryClient();
  const { data: orgData } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      entity_type: string;
      entity_id: string;
      direction: 'inbound' | 'outbound';
      channel: string;
      summary: string;
      payload?: Json;
    }) => {
      const user = await supabase.auth.getUser();
      
      const { error } = await supabase.from('interactions').insert({
        organization_id: orgData?.organization_id,
        performed_by: user.data.user?.id,
        ...data,
      });

      if (error) {
        logger.error('Erro ao criar interação', { error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm.interactions'] });
    },
  });
};

// Mutation para criar demanda
export const useCreateDemanda = () => {
  const queryClient = useQueryClient();
  const { data: orgData } = useOrganization();

  return useMutation({
    mutationFn: async (data: {
      request_type: string;
      requester_type: string;
      requester_id?: string;
      payload: {
        subject: string;
        description: string;
      };
    }) => {
      const user = await supabase.auth.getUser();
      
      const { error } = await supabase.from('requests').insert({
        organization_id: orgData?.organization_id,
        created_by: user.data.user?.id,
        status: 'aberta',
        ...data,
      });

      if (error) {
        logger.error('Erro ao criar demanda', { error });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm.demandas'] });
    },
  });
};

// Mutation para alterar status de demanda
export const useUpdateDemandaStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, newStatus }: { requestId: string; newStatus: string }) => {
      const { data, error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) {
        logger.error('Erro ao alterar status da demanda', { error });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm.demandas'] });
    },
  });
};
