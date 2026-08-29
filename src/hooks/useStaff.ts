import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { ProfileRow } from '@/integrations/supabase/db-types';

export type StaffRole = 'professor' | 'coordenacao' | 'secretario';

export type StaffMember = Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'role' | 'created_at'>;

export interface CreateStaffUserInput {
  email: string;
  full_name: string;
  role: StaffRole;
  cpf: string;
  /** Sugestão que `useStaffRoleSuggestion` já buscou pro mesmo CPF, se houver -- usada
   * pelo backend só pra saber se `role` foi aceita como veio ou sobrescrita. */
  suggested_role?: StaffRole | null;
}

export interface StaffRoleSuggestion {
  suggestedRole: StaffRole | null;
  cargoCategoria: string | null;
}

export const useStaffList = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['staff', orgData?.organization_id],
    queryFn: async (): Promise<StaffMember[]> => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .eq('organization_id', orgData.organization_id)
        .in('role', ['professor', 'coordenacao', 'secretario'])
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (typeof body?.error === 'string') return body.error;
    } catch {
      // resposta não era JSON, cai pro fallback abaixo
    }
  }
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

export const useCreateStaffUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStaffUserInput) => {
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: input,
      });

      if (error) {
        throw new Error(await extractFunctionErrorMessage(error));
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
};

export const useStaffRoleSuggestion = () => {
  return useMutation({
    mutationFn: async (cpf: string): Promise<StaffRoleSuggestion> => {
      const { data, error } = await supabase.functions.invoke('staff-role-suggestion', {
        body: { cpf },
      });

      if (error) {
        throw new Error(await extractFunctionErrorMessage(error));
      }
      return data as StaffRoleSuggestion;
    },
  });
};

export const useResetStaffPassword = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: { mode: 'reset', user_id: userId },
      });

      if (error) {
        throw new Error(await extractFunctionErrorMessage(error));
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
  });
};
