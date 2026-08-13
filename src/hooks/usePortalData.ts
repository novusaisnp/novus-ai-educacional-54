import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePortalAuth } from './usePortalAuth';
import { logAudit } from '@/lib/audit/logAudit';
import { logger } from '@/lib/logger';
import { useOrganization } from './useOrganization';
import type { Json } from '@/integrations/supabase/types';

export const usePortalData = () => {
  const { guardian } = usePortalAuth();
  const { orgId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get guardian interactions
  const { data: interactions, isLoading: loadingInteractions } = useQuery({
    queryKey: ['portal-interactions', orgId, guardian?.id],
    queryFn: async () => {
      if (!guardian?.id) return [];

      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('entity_type', 'guardian')
        .eq('entity_id', guardian.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!guardian?.id && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Get guardian requests
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['portal-requests', orgId, guardian?.id],
    queryFn: async () => {
      if (!guardian?.id) return [];

      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('requester_type', 'guardian')
        .eq('requester_id', guardian.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!guardian?.id && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Get guardian documents
  const { data: documents, isLoading: loadingDocuments } = useQuery({
    queryKey: ['portal-documents', orgId, guardian?.id],
    queryFn: async () => {
      if (!guardian?.id) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_type', 'guardian')
        .eq('owner_id', guardian.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!guardian?.id && !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // Create interaction mutation
  const createInteractionMutation = useMutation({
    mutationFn: async (data: { channel: string; summary: string; payload?: Json }) => {
      if (!guardian?.id || !orgId) throw new Error('Guardian ou organização não encontrada');

      const { error } = await supabase
        .from('interactions')
        .insert({
          organization_id: orgId,
          entity_type: 'guardian',
          entity_id: guardian.id,
          direction: 'outbound',
          // performed_by é FK pra profiles (staff). Responsável não tem profile,
          // então mandar o user_id dele quebrava todo envio com violação de FK.
          // Quem falou já está em entity_type/entity_id + direction='outbound'.
          performed_by: null,
          ...data,
        });

      if (error) throw error;

      // Log audit
      await logAudit({
        organization_id: orgId,
        action: 'create_interaction',
        table_name: 'portal',
        diff: { type: data.channel }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-interactions', orgId, guardian?.id] });
      toast({
        title: 'Mensagem enviada',
        description: 'Sua mensagem foi enviada com sucesso.',
      });
    },
    onError: (error: Error) => {
      logger.error('Error creating interaction', { error: error.message });
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar mensagem',
        description: error.message,
      });
    },
  });

  // Create request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: { request_type: string; payload: Json }) => {
      if (!guardian?.id || !orgId) throw new Error('Guardian ou organização não encontrada');

      const { error } = await supabase
        .from('requests')
        .insert({
          organization_id: orgId,
          requester_type: 'guardian',
          requester_id: guardian.id,
          created_by: guardian.user_id,
          status: 'aberta',
          ...data,
        });

      if (error) throw error;

      // Log audit
      await logAudit({
        organization_id: orgId,
        action: 'create_request',
        table_name: 'portal',
        diff: { type: data.request_type }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-requests', orgId, guardian?.id] });
      toast({
        title: 'Demanda criada',
        description: 'Sua demanda foi criada com sucesso.',
      });
    },
    onError: (error: Error) => {
      logger.error('Error creating request', { error: error.message });
      toast({
        variant: 'destructive',
        title: 'Erro ao criar demanda',
        description: error.message,
      });
    },
  });

  return {
    guardian,
    interactions,
    requests,
    documents,
    loading: loadingInteractions || loadingRequests || loadingDocuments,
    createInteractionMutation,
    createRequestMutation,
  };
};