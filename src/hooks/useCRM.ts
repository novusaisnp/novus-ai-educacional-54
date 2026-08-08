
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
      let query = supabase.from('visitors').select('*');
      
      if (params?.search) {
        query = query.or(`full_name.ilike.%${params.search}%,phone.ilike.%${params.search}%,email.ilike.%${params.search}%`);
      }
      
      const { data, error } = await query.order('visit_date', { ascending: false });
      
      if (error) {
        logger.error('Erro ao buscar leads', { error });
        throw error;
      }
      
      // Transformar dados de visitors para formato Lead
      const leads: Lead[] = data?.map(visitor => ({
        id: visitor.id,
        organization_id: visitor.organization_id,
        full_name: visitor.full_name,
        document: visitor.document,
        phone: visitor.phone,
        email: visitor.email,
        relation: visitor.relation,
        visit_date: visitor.visit_date,
        purpose: visitor.purpose,
        notes: visitor.notes,
        status: 'ativo' as const, // Status padrão
        convertido: false,
        created_at: visitor.created_at,
        updated_at: visitor.updated_at
      })) || [];
      
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
        .from('visitors')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        logger.error('Erro ao buscar lead', { error, id });
        throw error;
      }
      
      // Transformar dados de visitor para formato Lead
      const lead: Lead = {
        id: data.id,
        organization_id: data.organization_id,
        full_name: data.full_name,
        document: data.document,
        phone: data.phone,
        email: data.email,
        relation: data.relation,
        visit_date: data.visit_date,
        purpose: data.purpose,
        notes: data.notes,
        status: 'ativo' as const,
        convertido: false,
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

// Hook para pendências documentais - simulado com base em documentos
export const usePendenciasDoc = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.pendencias-doc', orgData?.organization_id],
    queryFn: async () => {
      // Como não temos a view, retornamos dados mockados ou vazios
      // Em um cenário real, isso seria implementado com uma view ou query complexa
      const pendencias: PendenciaDoc[] = [];
      
      return pendencias;
    },
    enabled: !!orgData?.organization_id,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// Hook para inadimplência - simulado
export const useInadimplencia = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['crm.inadimplencia', orgData?.organization_id],
    queryFn: async () => {
      // Como não temos sistema financeiro implementado, retornamos dados mockados
      return {
        total_alunos: 0,
        inadimplentes: 0,
        total_inadimplentes: 0,
        percentual: 0,
        valor_total: 0,
        valor_total_devido: 0,
        is_mock_data: true
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
