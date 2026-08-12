import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Porta 0 — Provisionamento (push, NOVUS Centelha → este satélite). Contrato genérico
// documentado em novusai-erp/docs/CONTRATOS_CANONICOS_ERP.md — qualquer satélite futuro
// implementa este mesmo endpoint/payload. Chamador não tem `erp_integration_config`
// ainda (é ele quem esta função cria), por isso a autenticação é por segredo global
// (`CENTELHA_PROVISION_SECRET`), não por HMAC por-organização como o restante da
// integração ERP — mesmo padrão assimétrico já usado pelo `edu-erp-webhook` inbound.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function hmacSha256Hex(rawBody: Uint8Array, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, rawBody)
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function generateSigningSecret(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface ProvisionaPayload {
  organization_name?: string
  empresa_representada_id?: string
  admin_nome?: string
  admin_email?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-webhook-signature')
    if (!signature) {
      return jsonResponse({ error: 'x-webhook-signature é obrigatório' }, 400)
    }

    const secret = Deno.env.get('CENTELHA_PROVISION_SECRET')
    if (!secret) {
      console.error('CENTELHA_PROVISION_SECRET não configurado')
      return jsonResponse({ error: 'internal_error' }, 500)
    }

    const rawBody = new Uint8Array(await req.arrayBuffer())
    if (rawBody.byteLength === 0) {
      return jsonResponse({ error: 'empty_body' }, 400)
    }

    const expected = await hmacSha256Hex(rawBody, secret)
    const provided = signature.replace(/^sha256=/i, '')
    if (!timingSafeEqual(expected, provided)) {
      return jsonResponse({ error: 'unauthorized' }, 401)
    }

    const body: ProvisionaPayload = JSON.parse(new TextDecoder().decode(rawBody))
    const { organization_name, empresa_representada_id, admin_nome, admin_email } = body

    if (!organization_name?.trim() || !empresa_representada_id || !admin_nome?.trim() || !admin_email?.trim()) {
      return jsonResponse(
        { error: 'Campos obrigatórios: organization_name, empresa_representada_id, admin_nome, admin_email' },
        400
      )
    }

    const erpBaseUrl = Deno.env.get('ERP_BASE_URL')
    if (!erpBaseUrl) {
      console.error('ERP_BASE_URL não configurado')
      return jsonResponse({ error: 'internal_error' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({ name: organization_name.trim() })
      .select('id')
      .single()

    if (orgError) {
      console.error('Failed to create organization:', orgError)
      return jsonResponse({ error: 'Falha ao criar organização: ' + orgError.message }, 500)
    }

    const { error: erpConfigError } = await adminClient.from('erp_integration_config').insert({
      organization_id: org.id,
      enabled: true,
      mock: false,
      base_url: erpBaseUrl,
      signing_secret: generateSigningSecret(),
      empresa_representada_id,
      events: { clientUpsert: true, receivableCreated: true, contractUpsert: true },
    })

    if (erpConfigError) {
      console.error('Failed to create erp_integration_config:', erpConfigError)
      return jsonResponse({ error: 'Organização criada, mas falha ao vincular ao ERP: ' + erpConfigError.message, organization_id: org.id }, 500)
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? ''
    const { data: inviteRes, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(admin_email.trim().toLowerCase(), {
      data: { full_name: admin_nome.trim() },
      redirectTo: siteUrl ? `${siteUrl}/auth/definir-senha` : undefined,
    })

    if (inviteError || !inviteRes?.user?.id) {
      console.error('Failed to invite admin:', inviteError)
      return jsonResponse(
        { error: 'Organização criada, mas falha ao convidar admin: ' + (inviteError?.message ?? 'erro desconhecido'), organization_id: org.id },
        500
      )
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: inviteRes.user.id,
      organization_id: org.id,
      full_name: admin_nome.trim(),
      role: 'admin',
      email: admin_email.trim().toLowerCase(),
    })

    if (profileError) {
      console.error('Failed to upsert admin profile:', profileError)
      return jsonResponse(
        { error: 'Organização criada e convite enviado, mas falha ao vincular perfil: ' + profileError.message, organization_id: org.id },
        500
      )
    }

    // Vínculo é obrigatório: current_org_id() exige a linha em user_organizations
    // (ver 20260811230000_vinculo_como_fonte_de_verdade.sql). Sem ela o admin fundador
    // criado aqui não enxergaria nada.
    const { error: membershipError } = await adminClient.from('user_organizations').upsert(
      { user_id: inviteRes.user.id, organization_id: org.id, role: 'admin' },
      { onConflict: 'user_id,organization_id' }
    )

    if (membershipError) {
      console.error('Failed to upsert admin membership:', membershipError)
      return jsonResponse(
        { error: 'Organização criada, mas falha ao vincular unidade ao admin: ' + membershipError.message, organization_id: org.id },
        500
      )
    }

    return jsonResponse({ success: true, organization_id: org.id }, 200)
  } catch (error) {
    console.error('Unexpected error in centelha-provisiona-organizacao:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
