import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAFF_ROLES = ['professor', 'coordenacao', 'secretario'] as const
type StaffRole = (typeof STAFF_ROLES)[number]

const ERP_SOURCE_SYSTEM = 'novus-educacional'

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

async function hmacSha256Hex(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Porta 3 — "pessoa já é Colaborador validado no ERP?" (CONTRATOS_CANONICOS_ERP.md §7:
// não existe usuário solto). Só roda quando a organização tem integração ERP real
// (enabled && !mock) -- organizações sem ERP configurado continuam convidando staff
// normalmente, sem regressão (mesmo padrão de skip de `withERP`/`erpEmit`).
// Fail-closed de propósito: se o ERP não responder, bloqueia o convite em vez de deixar
// passar -- o objetivo desta checagem é ser um prerequisito de verdade, não best-effort.
async function checkColaboradorValidado(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  cpf: string
): Promise<{ blocked: boolean; reason?: string }> {
  const { data: erpConfig } = await adminClient
    .from('erp_integration_config')
    .select('enabled, mock, base_url, signing_secret, empresa_representada_id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!erpConfig?.enabled || erpConfig.mock) {
    return { blocked: false }
  }
  if (!erpConfig.base_url || !erpConfig.signing_secret || !erpConfig.empresa_representada_id) {
    return { blocked: true, reason: 'Integração ERP habilitada, mas mal configurada (URL/secret/empresa ausente) — corrija antes de convidar' }
  }

  const body = JSON.stringify({ cpf })
  const signature = await hmacSha256Hex(body, erpConfig.signing_secret)

  try {
    const response = await fetch(`${erpConfig.base_url}/functions/v1/colaborador-preflight`, {
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
      return { blocked: true, reason: 'Não foi possível validar o colaborador no ERP (falha de comunicação) — tente novamente' }
    }

    const result = await response.json()
    if (!result.autorizado) {
      const motivo = result.bloqueios?.[0]?.motivo ?? 'Pessoa não é um colaborador validado no ERP'
      return { blocked: true, reason: motivo }
    }
    return { blocked: false }
  } catch (error) {
    console.error('Failed to check colaborador preflight:', error)
    return { blocked: true, reason: 'Não foi possível validar o colaborador no ERP (falha de comunicação) — tente novamente' }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Token de autenticação requerido' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Identifica quem está chamando e a organização de destino a partir do próprio
    // profile do chamador -- nunca aceitar organization_id vindo do body.
    const { data: callerData, error: callerError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (callerError || !callerData.user) {
      return jsonResponse({ error: 'Usuário não autenticado' }, 401)
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('organization_id, role')
      .eq('id', callerData.user.id)
      .maybeSingle()

    if (callerProfileError) {
      console.error('Failed to fetch caller profile:', callerProfileError)
      return jsonResponse({ error: 'Falha ao verificar perfil do usuário: ' + callerProfileError.message }, 500)
    }
    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'coordenacao')) {
      return jsonResponse({ error: 'Apenas administração ou coordenação podem convidar membros da equipe' }, 403)
    }

    const body = await req.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const role = body.role as StaffRole
    const cpf = typeof body.cpf === 'string' ? body.cpf.replace(/\D/g, '') : ''

    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'E-mail inválido' }, 400)
    }
    if (!fullName) {
      return jsonResponse({ error: 'Campo obrigatório: nome completo' }, 400)
    }
    if (!STAFF_ROLES.includes(role)) {
      return jsonResponse({ error: 'Role inválido. Use professor, coordenacao ou secretario' }, 400)
    }
    if (cpf.length !== 11) {
      return jsonResponse({ error: 'CPF inválido — informe os 11 dígitos' }, 400)
    }

    const colaboradorCheck = await checkColaboradorValidado(adminClient, callerProfile.organization_id, cpf)
    if (colaboradorCheck.blocked) {
      return jsonResponse({ error: colaboradorCheck.reason ?? 'Colaborador não validado no ERP' }, 403)
    }

    // auth-js v2 não tem mais admin.getUserByEmail (era API v1) -- em vez de listar
    // todos os usuários pra checar duplicata, deixa o próprio inviteUserByEmail
    // rejeitar (ele já valida unicidade de e-mail no GoTrue) e traduz o erro.
    const redirectTo = typeof body.redirect_to === 'string' ? body.redirect_to : undefined
    const { data: inviteRes, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo,
    })

    if (inviteError || !inviteRes?.user?.id) {
      const isDuplicate =
        inviteError?.status === 422 ||
        /already.*registered|already.*exists/i.test(inviteError?.message ?? '')

      // E-mail já tem conta (provavelmente staff de outra unidade, CEO multi-CNPJ
      // é o caso real) -- checkColaboradorValidado já confirmou que este CPF é
      // colaborador ativo NESTA empresa, então a pessoa já está autorizada aqui
      // independente de já ter conta em outra organização. Só adiciona o vínculo,
      // não mexe em profiles (organization_id ativo dela não muda sozinho).
      if (isDuplicate) {
        const { data: existingProfile, error: lookupError } = await adminClient
          .from('profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()

        if (lookupError || !existingProfile) {
          console.error('Failed to look up existing profile by email:', lookupError)
          return jsonResponse({ error: 'E-mail já está em uso, mas não foi possível localizar a conta existente' }, 500)
        }

        const { error: membershipError } = await adminClient.from('user_organizations').upsert(
          {
            user_id: existingProfile.id,
            organization_id: callerProfile.organization_id,
            role,
          },
          { onConflict: 'user_id,organization_id' }
        )

        if (membershipError) {
          console.error('Failed to add organization membership:', membershipError)
          return jsonResponse({ error: 'Falha ao vincular usuário existente a esta unidade: ' + membershipError.message }, 500)
        }

        return jsonResponse({ success: true, user_id: existingProfile.id, added_membership: true }, 200)
      }

      console.error('Failed to invite user:', inviteError)
      return jsonResponse({ error: 'Falha ao enviar convite: ' + (inviteError?.message ?? 'erro desconhecido') }, 500)
    }

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: inviteRes.user.id,
      organization_id: callerProfile.organization_id,
      full_name: fullName,
      role,
      cpf,
      email,
    })

    if (profileError) {
      console.error('Failed to upsert staff profile:', profileError)
      return jsonResponse({ error: 'Convite enviado, mas falha ao vincular perfil: ' + profileError.message }, 500)
    }

    const { error: membershipError } = await adminClient.from('user_organizations').upsert(
      {
        user_id: inviteRes.user.id,
        organization_id: callerProfile.organization_id,
        role,
      },
      { onConflict: 'user_id,organization_id' }
    )

    if (membershipError) {
      console.error('Failed to insert initial organization membership:', membershipError)
      return jsonResponse({ error: 'Convite enviado, mas falha ao vincular unidade: ' + membershipError.message }, 500)
    }

    return jsonResponse({ success: true, user_id: inviteRes.user.id }, 200)
  } catch (error) {
    console.error('Unexpected error in create-staff-user:', error)
    return jsonResponse({ error: 'Internal server error: ' + (error as Error).message }, 500)
  }
})
