import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callEntidadePreflight } from '../_shared/entidade-preflight-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

// Porta 3 — "este CPF já é Cliente ativo desta empresa no ERP?" (mesmo núcleo de
// checkColaboradorValidado em create-staff-user, via `_shared/entidade-preflight-client.ts`
// com papel:'CLIENTE'). Fail-closed em toda a extensão, sem exceção pra organização sem
// integração ERP configurada -- o ERP é o "big bang" da existência do sistema numa
// empresa representada, nenhum satélite cria acesso independente dele (decisão explícita
// do usuário 2026-08-29, fecha uma exceção que existia antes disso).
async function checkClienteValidado(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  cpf: string
): Promise<{ blocked: boolean; reason?: string }> {
  const result = await callEntidadePreflight(adminClient, organizationId, cpf, 'CLIENTE')
  if (!result.configured) {
    return {
      blocked: true,
      reason: 'Esta organização ainda não tem integração com o ERP habilitada — não é possível convidar responsáveis para o portal até a integração ser configurada e ativada.',
    }
  }
  if (!result.ok) return { blocked: true, reason: result.errorReason }
  if (!result.autorizado) return { blocked: true, reason: result.motivo ?? 'CPF não corresponde a um Cliente ativo no ERP' }
  return { blocked: false }
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
    if (!callerProfile || !['admin', 'coordenacao', 'secretario'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'Apenas administração, coordenação ou secretaria podem convidar responsáveis para o portal' }, 403)
    }

    const body = await req.json()
    const entidadeId = typeof body.entidade_id === 'string' ? body.entidade_id.trim() : ''
    if (!entidadeId) {
      return jsonResponse({ error: 'Campo obrigatório: entidade_id' }, 400)
    }

    // Nunca aceita organization_id do body -- entidade tem que pertencer à
    // organização do chamador, igual ao resto do serviço.
    const { data: entidade, error: entidadeError } = await adminClient
      .from('entidades')
      .select('id, nome, cpf, email, user_id, deleted_at, ativo, entidade_papeis!inner(papel, ativo)')
      .eq('id', entidadeId)
      .eq('organization_id', callerProfile.organization_id)
      .eq('entidade_papeis.papel', 'RESPONSAVEL')
      .maybeSingle()

    if (entidadeError) {
      console.error('Failed to fetch guardian entidade:', entidadeError)
      return jsonResponse({ error: 'Falha ao buscar responsável: ' + entidadeError.message }, 500)
    }
    if (!entidade || entidade.deleted_at || !entidade.ativo) {
      return jsonResponse({ error: 'Responsável não encontrado nesta unidade' }, 404)
    }
    if (entidade.user_id) {
      return jsonResponse({ error: 'Este responsável já tem acesso ao portal' }, 409)
    }

    const cpf = typeof entidade.cpf === 'string' ? entidade.cpf.replace(/\D/g, '') : ''
    if (cpf.length !== 11) {
      return jsonResponse({ error: 'CPF obrigatório para convite ao portal — cadastre o CPF em Cadastros → Entidades antes de convidar' }, 400)
    }
    const email = typeof entidade.email === 'string' ? entidade.email.trim().toLowerCase() : ''
    if (!email || !email.includes('@')) {
      return jsonResponse({ error: 'E-mail obrigatório para convite ao portal — cadastre o e-mail em Cadastros → Entidades antes de convidar' }, 400)
    }

    const clienteCheck = await checkClienteValidado(adminClient, callerProfile.organization_id, cpf)
    if (clienteCheck.blocked) {
      return jsonResponse({ error: clienteCheck.reason ?? 'Responsável não validado no ERP' }, 403)
    }

    // Senha temporária = o próprio e-mail, mesmo mecanismo de create-staff-user.
    const { data: createRes, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: email,
      email_confirm: true,
      user_metadata: { full_name: entidade.nome },
    })

    if (createError || !createRes?.user?.id) {
      const isDuplicate =
        createError?.status === 422 ||
        /already.*registered|already.*exists/i.test(createError?.message ?? '')
      if (isDuplicate) {
        return jsonResponse({ error: 'E-mail já está em uso por outra conta' }, 409)
      }
      console.error('Failed to create guardian user:', createError)
      return jsonResponse({ error: 'Falha ao criar acesso: ' + (createError?.message ?? 'erro desconhecido') }, 500)
    }

    // Guardian nunca vira staff -- grava em entidades.user_id, não em profiles
    // (20260813020000_email_staff_ou_responsavel.sql). Os triggers dessa migração já
    // protegem esta escrita.
    const { error: updateError } = await adminClient
      .from('entidades')
      .update({ user_id: createRes.user.id })
      .eq('id', entidadeId)

    if (updateError) {
      console.error('Failed to link auth user to guardian entidade:', updateError)
      return jsonResponse({ error: 'Conta criada, mas falha ao vincular ao responsável: ' + updateError.message }, 500)
    }

    const { error: auditError } = await adminClient.from('audit_logs').insert({
      organization_id: callerProfile.organization_id,
      actor: callerData.user.id,
      action: 'guardian_portal_access_granted',
      table_name: 'entidades',
      row_id: entidadeId,
      diff: { cpf, email, erp_papel_validado: 'CLIENTE' },
    })
    if (auditError) {
      console.error('Failed to write audit log for guardian portal access:', auditError)
    }

    return jsonResponse({ success: true, user_id: createRes.user.id }, 200)
  } catch (error) {
    console.error('Unexpected error in create-guardian-user:', error)
    return jsonResponse({ error: 'Internal server error: ' + (error as Error).message }, 500)
  }
})
