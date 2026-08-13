import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrgBranding {
  name: string | null;
  logoUrl: string | null;
}

/**
 * Identidade visual da instituição, para qualquer ambiente (desktop, portal e
 * app) e qualquer papel (staff ou responsável).
 *
 * A logo preferida é a da empresa representada, que mora no ERP; sem
 * integração configurada cai pro `organizations.logo_url`. Os dois campos
 * necessários vêm da RPC `org_branding` — ler as tabelas direto não funciona
 * pro responsável (policies staff-only) e `erp_integration_config` ainda guarda
 * o signing_secret, que não pode chegar ao cliente.
 */
export function useOrgBranding() {
  return useQuery({
    queryKey: ['org-branding'],
    queryFn: async (): Promise<OrgBranding> => {
      const { data, error } = await supabase.rpc('org_branding');
      if (error) throw error;

      const branding = data?.[0];
      if (!branding) return { name: null, logoUrl: null };

      const erpLogo = await fetchErpLogo(branding.erp_base_url, branding.empresa_representada_id);
      return { name: branding.name, logoUrl: erpLogo || branding.logo_url || null };
    },
    staleTime: 30 * 60 * 1000,
  });
}

async function fetchErpLogo(baseUrl: string | null, empresaId: string | null): Promise<string | null> {
  if (!baseUrl || !empresaId) return null;
  try {
    // Bucket público no ERP: é resolução de dado público, sem HMAC.
    const response = await fetch(
      `${baseUrl}/functions/v1/get-empresa-logo?empresa_representada_id=${encodeURIComponent(empresaId)}`,
    );
    if (!response.ok) return null;
    const data = (await response.json()) as { logoUrl?: string | null };
    return data.logoUrl || null;
  } catch {
    // Logo é enfeite: ERP fora do ar não pode derrubar tela nenhuma.
    return null;
  }
}
