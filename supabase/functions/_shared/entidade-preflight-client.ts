import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cliente compartilhado da Porta 3 do lado do satélite -- "esta pessoa tem este papel,
// ativo, no ERP?" via `entidade-preflight`. Extraído de `create-staff-user` (que só
// bloqueava/liberava) pra ser reusado também por `staff-role-suggestion` (que lê a
// sugestão de role a partir de `categoria_padrao`) sem duplicar a chamada HTTP/HMAC.
// Ver C:\Users\maxwe\.claude\plans\fancy-painting-mochi.md, passo 3.

export const ERP_SOURCE_SYSTEM = 'novus-educacional'

async function hmacSha256Hex(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface EntidadePreflightResult {
  /** false = organização não tem integração ERP real habilitada (sem checagem a fazer) */
  configured: boolean
  /** false = ERP mal configurado ou não respondeu (falha de comunicação) */
  ok: boolean
  errorReason?: string
  autorizado: boolean
  motivo?: string
  /** `cargos.categoria_padrao` do ERP -- só presente quando papel === 'COLABORADOR' */
  categoriaPadrao?: string | null
}

export async function callEntidadePreflight(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  cpf: string,
  papel: string
): Promise<EntidadePreflightResult> {
  const { data: erpConfig } = await adminClient
    .from('erp_integration_config')
    .select('enabled, mock, base_url, signing_secret, empresa_representada_id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!erpConfig?.enabled || erpConfig.mock) {
    return { configured: false, ok: true, autorizado: true, categoriaPadrao: null }
  }
  if (!erpConfig.base_url || !erpConfig.signing_secret || !erpConfig.empresa_representada_id) {
    return {
      configured: true,
      ok: false,
      errorReason: 'Integração ERP habilitada, mas mal configurada (URL/secret/empresa ausente) — corrija antes de convidar',
      autorizado: false,
    }
  }

  const body = JSON.stringify({ cpf, papel })
  const signature = await hmacSha256Hex(body, erpConfig.signing_secret)

  try {
    const response = await fetch(`${erpConfig.base_url}/functions/v1/entidade-preflight`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-source-system': ERP_SOURCE_SYSTEM,
        'x-empresa-id': erpConfig.empresa_representada_id,
        'x-webhook-signature': `sha256=${signature}`,
      },
      body,
    })

    if (!response.ok) {
      return {
        configured: true,
        ok: false,
        errorReason: 'Não foi possível validar no ERP (falha de comunicação) — tente novamente',
        autorizado: false,
      }
    }

    const result = await response.json()
    return {
      configured: true,
      ok: true,
      autorizado: !!result.autorizado,
      motivo: result.bloqueios?.[0]?.motivo,
      categoriaPadrao: result.categoria_padrao ?? null,
    }
  } catch (error) {
    console.error('Failed to call entidade-preflight:', error)
    return {
      configured: true,
      ok: false,
      errorReason: 'Não foi possível validar no ERP (falha de comunicação) — tente novamente',
      autorizado: false,
    }
  }
}
