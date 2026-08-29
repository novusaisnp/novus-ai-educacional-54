import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callEntidadePreflight } from '../_shared/entidade-preflight-client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAFF_ROLES = ['professor', 'coordenacao', 'secretario'] as const
type StaffRole = (typeof STAFF_ROLES)[number]

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

// Porta 3 — "pessoa já é Colaborador validado no ERP?" (PLANO_MESTRE.md §1.7:
// não existe usuário solto). Fail-closed em toda a extensão: o ERP é o "big bang" da
// existência do sistema numa empresa representada, nenhum satélite cria membro de
// equipe independente dele -- inclusive quando a própria integração ERP da organização
// não está configurada/ativa, que **não é** uma passagem livre (decisão explícita do
// usuário 2026-08-29, fecha uma exceção que existia antes disso).
async function checkColaboradorValidado(
  adminClient: ReturnType<typeof createClient>,
  organizationId: string,
  cpf: string
): Promise<{ blocked: boolean; reason?: string }> {
  const result = await callEntidadePreflight(adminClient, organizationId, cpf, 'COLABORADOR')
  if (!result.configured) {
    return {
      blocked: true,
      reason: 'Esta organização ainda não tem integração com o ERP habilitada — não é possível convidar membros da equipe até a integração ser configurada e ativada.',
    }
  }
  if (!result.ok) return { blocked: true, reason: result.errorReason }
  if (!result.autorizado) return { blocked: true, reason: result.motivo ?? 'Pessoa não é um colaborador validado no ERP' }
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
    const mode = body.mode === 'reset' ? 'reset' : 'create'

    // Reset: redefine a senha de um membro já existente pra senha temporária
    // = o próprio e-mail (mesmo mecanismo da criação), marcando
    // senha_pendente de novo -- também repara contas antigas que nunca
    // tiveram esse vínculo, sem precisar de patch manual em banco.
    if (mode === 'reset') {
      const targetUserId = typeof body.user_id === 'string' ? body.user_id.trim() : ''
      if (!targetUserId) {
        return jsonResponse({ error: 'user_id ausente' }, 400)
      }

      const { data: targetProfile, error: targetError } = await adminClient
        .from('profiles')
        .select('id, email, organization_id')
        .eq('id', targetUserId)
        .maybeSingle()

      if (targetError || !targetProfile || targetProfile.organization_id !== callerProfile.organization_id) {
        return jsonResponse({ error: 'Usuário não encontrado nesta organização' }, 404)
      }
      if (!targetProfile.email) {
        return jsonResponse({ error: 'Usuário sem e-mail cadastrado' }, 400)
      }

      const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: targetProfile.email,
      })
      if (updateAuthError) {
        console.error('Failed to reset staff password:', updateAuthError)
        return jsonResponse({ error: updateAuthError.message || 'Falha ao resetar senha' }, 200)
      }

      const { error: pendingError } = await adminClient
        .from('profiles')
        .update({ senha_pendente: true })
        .eq('id', targetUserId)
      if (pendingError) {
        console.error('Failed to mark senha_pendente on reset:', pendingError)
      }

      return jsonResponse({ success: true, user_id: targetUserId, mode }, 200)
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
    const role = body.role as StaffRole
    const cpf = typeof body.cpf === 'string' ? body.cpf.replace(/\D/g, '') : ''
    // Sugestão que o frontend já buscou em `staff-role-suggestion` (CPF-blur, antes do
    // submit) -- não vale a pena chamar o ERP de novo aqui só pra descobrir a origem da
    // escolha. `null`/ausente = sem sugestão (ERP não configurado ou cargo sem categoria).
    const suggestedRole = STAFF_ROLES.includes(body.suggested_role) ? (body.suggested_role as StaffRole) : null

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

    // Senha temporária = o próprio e-mail (login com e-mail nos dois campos é
    // uma autenticação real) -- elimina a dependência de e-mail transacional
    // funcionando, que o convite por magic-link (inviteUserByEmail) tinha.
    // auth-js v2 não tem mais admin.getUserByEmail (era API v1) -- em vez de
    // listar todos os usuários pra checar duplicata, deixa o próprio
    // createUser rejeitar (já valida unicidade de e-mail no GoTrue) e
    // traduz o erro.
    const { data: inviteRes, error: inviteError } = await adminClient.auth.admin.createUser({
      email,
      password: email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
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

    const roleAssignedVia = suggestedRole === null ? 'no_erp_suggestion' : role === suggestedRole ? 'erp_suggestion' : 'manual_override'

    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: inviteRes.user.id,
      organization_id: callerProfile.organization_id,
      full_name: fullName,
      role,
      cpf,
      email,
      senha_pendente: true,
      role_assigned_via: roleAssignedVia,
      erp_suggested_role: suggestedRole,
    })

    if (profileError) {
      console.error('Failed to upsert staff profile:', profileError)
      return jsonResponse({ error: 'Convite enviado, mas falha ao vincular perfil: ' + profileError.message }, 500)
    }

    const { error: auditError } = await adminClient.from('audit_logs').insert({
      organization_id: callerProfile.organization_id,
      actor: callerData.user.id,
      action: 'staff_role_assigned',
      table_name: 'profiles',
      row_id: inviteRes.user.id,
      diff: { role, erp_suggested_role: suggestedRole, role_assigned_via: roleAssignedVia, cpf },
    })
    if (auditError) {
      console.error('Failed to write audit log for staff role assignment:', auditError)
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
