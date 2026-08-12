import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Porta 0.1 — Provisionamento de acesso administrativo (push, NOVUS Centelha → este satélite).
// Contrato genérico documentado em novusai-erp/docs/CONTRATOS_CANONICOS_ERP.md — qualquer
// satélite futuro implementa este mesmo endpoint/payload. Mesmo padrão de autenticação do
// `centelha-provisiona-organizacao`: segredo global (`CENTELHA_PROVISION_SECRET`), não HMAC
// por-organização.
//
// IMPORTANTE — não adicione `checkColaboradorValidado` aqui. O gate de colaborador existe
// para staff contratada pela instituição. Sócio e representante legal são autorizados pelo
// contrato entre a NOVUS e a empresa responsável, verificado no lado ERP antes deste push;
// eles não são colaboradores e o gate os reprovaria por definição.

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

// O contrato fala em níveis genéricos; o mapeamento para o vocabulário de role local é
// responsabilidade do satélite.
const NIVEL_PARA_ROLE: Record<string, string> = {
  admin: 'admin',
}

interface ProvisionaAdminPayload {
  tenant_ref?: string
  nome?: string
  email?: string
  cpf?: string
  nivel?: string
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

    const body: ProvisionaAdminPayload = JSON.parse(new TextDecoder().decode(rawBody))
    const { tenant_ref, nivel } = body
    const nome = body.nome?.trim()
    const email = body.email?.trim().toLowerCase()
    const cpf = (body.cpf ?? '').replace(/\D/g, '')

    if (!tenant_ref || !nome || !email) {
      return jsonResponse({ error: 'Campos obrigatórios: tenant_ref, nome, email' }, 400)
    }
    if (!email.includes('@')) {
      return jsonResponse({ error: 'E-mail inválido' }, 400)
    }
    const role = NIVEL_PARA_ROLE[nivel ?? '']
    if (!role) {
      return jsonResponse({ error: `Nível '${nivel}' não é suportado por este satélite` }, 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('id')
      .eq('id', tenant_ref)
      .maybeSingle()
    if (orgError || !org) {
      return jsonResponse({ error: 'Organização (tenant_ref) não encontrada neste satélite' }, 404)
    }

    // Senha temporária = o próprio e-mail, mesmo padrão de `create-staff-user`. Não usar
    // inviteUserByEmail: depende de e-mail transacional entregando.
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: email,
      email_confirm: true,
      user_metadata: { full_name: nome },
    })

    let userId = created?.user?.id

    if (createError || !userId) {
      const isDuplicate =
        createError?.status === 422 ||
        /already.*registered|already.*exists/i.test(createError?.message ?? '')

      // Idempotência: reexecutar o provisionamento (ou sócio que já tem conta por outra
      // unidade) não é erro — só garante o vínculo com esta organização.
      if (!isDuplicate) {
        console.error('Failed to create admin user:', createError)
        return jsonResponse({ error: 'Falha ao criar conta: ' + (createError?.message ?? 'erro desconhecido') }, 500)
      }

      const { data: existing, error: lookupError } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (lookupError || !existing) {
        console.error('Failed to look up existing profile by email:', lookupError)
        return jsonResponse({ error: 'E-mail já está em uso, mas não foi possível localizar a conta existente' }, 500)
      }
      userId = existing.id
    } else {
      // Conta nova: `profiles` define a organização e o cargo ativos. Numa conta que já
      // existia, não mexer — a unidade ativa dela é escolha do próprio usuário no seletor.
      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: userId,
        organization_id: org.id,
        full_name: nome,
        role,
        cpf: cpf || null,
        email,
        senha_pendente: true,
      })

      if (profileError) {
        console.error('Failed to upsert admin profile:', profileError)
        return jsonResponse({ error: 'Conta criada, mas falha ao vincular perfil: ' + profileError.message }, 500)
      }
    }

    const { error: membershipError } = await adminClient.from('user_organizations').upsert(
      { user_id: userId, organization_id: org.id, role },
      { onConflict: 'user_id,organization_id' }
    )

    if (membershipError) {
      console.error('Failed to upsert organization membership:', membershipError)
      return jsonResponse({ error: 'Conta criada, mas falha ao vincular unidade: ' + membershipError.message }, 500)
    }

    return jsonResponse({ success: true, user_id: userId, organization_id: org.id }, 200)
  } catch (error) {
    console.error('Unexpected error in centelha-provisiona-admin:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
