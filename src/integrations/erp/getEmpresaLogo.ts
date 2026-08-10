import { getERPConfig } from '@/lib/featureFlags';

interface GetEmpresaLogoResult {
  logoUrl: string | null;
}

/**
 * Busca a URL pública da logo da empresa representada, via a Edge Function
 * `get-empresa-logo` do novusai-erp (bucket de storage já é público, então não
 * precisa de assinatura HMAC — é só resolução de um dado público a partir do
 * empresa_representada_id configurado pra esta organização).
 *
 * Retorna null (sem lançar) se a integração não estiver configurada, se não
 * houver empresaRepresentadaId, ou se a chamada falhar — a logo é só um
 * enfeite do PDF, nunca deve bloquear a geração do contrato.
 */
export async function getEmpresaLogoUrl(orgId: string): Promise<string | null> {
  try {
    const config = await getERPConfig(orgId);
    if (!config.enabled || !config.baseUrl || !config.empresaRepresentadaId) {
      return null;
    }

    const response = await fetch(
      `${config.baseUrl}/functions/v1/get-empresa-logo?empresa_representada_id=${encodeURIComponent(config.empresaRepresentadaId)}`
    );
    if (!response.ok) return null;

    const data: GetEmpresaLogoResult = await response.json();
    return data.logoUrl || null;
  } catch (error) {
    console.warn('[ERP] Falha ao buscar logo da empresa:', error);
    return null;
  }
}

/**
 * Mesma prioridade usada em `issueAcademicReports.ts`/`signEnrollmentContract.ts`:
 * logo real do ERP primeiro, cai pro `organizations.logo_url` local se a
 * integração não estiver configurada ou falhar.
 */
export async function resolveEmpresaLogoUrl(orgId: string, fallbackLogoUrl?: string | null): Promise<string | null> {
  return (await getEmpresaLogoUrl(orgId)) || fallbackLogoUrl || null;
}
