import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

/**
 * Convida um responsável já cadastrado (papel RESPONSAVEL em `entidades`) para o
 * portal de responsáveis. Gate fail-closed no ERP (entidade-preflight papel:'CLIENTE')
 * dentro da Edge Function -- ver create-guardian-user/index.ts.
 */
export const useInviteGuardianToPortal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entidadeId: string) => {
      const { data, error } = await supabase.functions.invoke('create-guardian-user', {
        body: { entidade_id: entidadeId },
      });

      if (error) {
        throw new Error(await extractFunctionErrorMessage(error));
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
    },
  });
};
