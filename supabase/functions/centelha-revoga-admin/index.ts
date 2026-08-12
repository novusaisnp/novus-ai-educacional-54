import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Porta 0.2 — Revogação de acesso (push, NOVUS Centelha → este satélite). Par simétrico de
// `centelha-provisiona-admin`; mesma autenticação por `CENTELHA_PROVISION_SECRET`.
//
// Revogar = apagar o vínculo em `user_organizations`. Desde
// 20260811230000_vinculo_como_fonte_de_verdade.sql, `current_org_id()` exige esse vínculo,
// então apagá-lo fecha toda a RLS de uma vez — não é preciso tocar em policy nenhuma nem
// banir a conta, que continua válida para as outras unidades da pessoa.

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

interface RevogaPayload {
  tenant_ref?: string
  email?: string
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

    const body: RevogaPayload = JSON.parse(new TextDecoder().decode(rawBody))
    const tenantRef = body.tenant_ref
    const email = body.email?.trim().toLowerCase()

    if (!tenantRef || !email) {
      return jsonResponse({ error: 'Campos obrigatórios: tenant_ref, email' }, 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: perfil, error: perfilError } = await adminClient
      .from('profiles')
      .select('id, organization_id')
      .eq('email', email)
      .maybeSingle()

    // Idempotente: quem nunca teve conta aqui já está revogado.
    if (perfilError) {
      console.error('Failed to look up profile by email:', perfilError)
      return jsonResponse({ error: 'Falha ao localizar a conta' }, 500)
    }
    if (!perfil) {
      return jsonResponse({ success: true, revogado: false, motivo: 'conta_inexistente' }, 200)
    }

    const { error: deleteError } = await adminClient
      .from('user_organizations')
      .delete()
      .eq('user_id', perfil.id)
      .eq('organization_id', tenantRef)

    if (deleteError) {
      console.error('Failed to delete membership:', deleteError)
      return jsonResponse({ error: 'Falha ao remover o vínculo: ' + deleteError.message }, 500)
    }

    // Se a unidade revogada era a ativa, reaponta para um vínculo remanescente. Não
    // havendo nenhum, `profiles` fica apontando para uma organização sem vínculo —
    // `current_org_id()` retorna NULL e o OrgGate mostra "conta ainda não vinculada",
    // que é exatamente o estado correto.
    let novaOrgAtiva: string | null = null
    if (perfil.organization_id === tenantRef) {
      const { data: restante } = await adminClient
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', perfil.id)
        .limit(1)
        .maybeSingle()

      if (restante) {
        const { error: switchError } = await adminClient
          .from('profiles')
          .update({ organization_id: restante.organization_id, role: restante.role })
          .eq('id', perfil.id)

        if (switchError) {
          console.error('Failed to repoint active organization:', switchError)
          return jsonResponse(
            { error: 'Vínculo removido, mas falha ao reapontar a unidade ativa: ' + switchError.message },
            500
          )
        }
        novaOrgAtiva = restante.organization_id
      }
    }

    return jsonResponse({ success: true, revogado: true, nova_org_ativa: novaOrgAtiva }, 200)
  } catch (error) {
    console.error('Unexpected error in centelha-revoga-admin:', error)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})
