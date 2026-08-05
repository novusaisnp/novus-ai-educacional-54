import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { logger } from '@/lib/logger';

export interface ContractTemplate {
  id: string;
  organization_id: string;
  version_label: string;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useActiveContractTemplate = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['contract-templates.active', orgData?.organization_id ?? null],
    queryFn: async (): Promise<ContractTemplate | null> => {
      if (!orgData?.organization_id) return null;

      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useContractTemplates = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['contract-templates.list', orgData?.organization_id ?? null],
    queryFn: async (): Promise<ContractTemplate[]> => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('organization_id', orgData.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useUpsertContractTemplate = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id?: string; version_label: string; body: string }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      if (input.id) {
        const { data, error } = await supabase
          .from('contract_templates')
          .update({ version_label: input.version_label, body: input.body })
          .eq('id', input.id)
          .eq('organization_id', orgData.organization_id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          organization_id: orgData.organization_id,
          version_label: input.version_label,
          body: input.body,
          is_active: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates.list', orgData?.organization_id ?? null] });
    },
    onError: (error: unknown) => {
      logger.error('Erro ao salvar modelo de contrato', { error });
    },
  });
};

export const useActivateContractTemplate = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }

      // Desativa a versão ativa atual antes de ativar a nova — o índice único
      // parcial (idx_contract_templates_one_active_per_org) só permite 1
      // is_active=true por organização, então a ordem aqui importa: desativar
      // primeiro, ativar depois, senão o segundo UPDATE viola a constraint.
      const { error: deactivateError } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('organization_id', orgData.organization_id)
        .eq('is_active', true);
      if (deactivateError) throw deactivateError;

      const { data, error } = await supabase
        .from('contract_templates')
        .update({ is_active: true })
        .eq('id', templateId)
        .eq('organization_id', orgData.organization_id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-templates.list', orgData?.organization_id ?? null] });
      queryClient.invalidateQueries({ queryKey: ['contract-templates.active', orgData?.organization_id ?? null] });
    },
    onError: (error: unknown) => {
      logger.error('Erro ao ativar modelo de contrato', { error });
    },
  });
};
