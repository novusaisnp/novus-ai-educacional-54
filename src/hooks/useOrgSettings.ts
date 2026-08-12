import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import type { Json } from '@/integrations/supabase/types';

type SettingsMap = Record<string, Json>;

// ponytail: usa organizations.settings jsonb como config store por org.
// Se um dia precisar de histórico/RLS por chave, vira tabela própria.
export function useOrgSettings() {
  const { data: orgData, orgId } = useOrganization();
  const queryClient = useQueryClient();

  const settings = (orgData?.organizations?.settings as SettingsMap | null) ?? {};

  const mutation = useMutation({
    mutationFn: async (nextSettings: SettingsMap) => {
      if (!orgId) throw new Error('Organização não encontrada');
      const { error } = await supabase
        .from('organizations')
        .update({ settings: nextSettings as Json })
        .eq('id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
    },
  });

  const saveKey = async (key: string, value: Json) => {
    await mutation.mutateAsync({ ...settings, [key]: value });
  };

  return { settings, saveKey, isSaving: mutation.isPending };
}
