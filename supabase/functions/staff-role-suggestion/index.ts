import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callEntidadePreflight } from '../_shared/entidade-preflight-client.ts'

// Checagem leve, só-leitura, chamada no blur do CPF em "Convidar membro" (equipe.tsx) --
// ANTES do submit, pra pré-preencher o Select de role com uma sugestão. Não bloqueia
// nada (quem bloqueia de verdade é `checkColaboradorValidado` dentro de
// `create-staff-user`, no momento do submit) -- degrada com sugestão nula em qualquer
// cenário sem resposta boa do ERP (organização sem integração, cargo sem categoria,
// falha de comunicação). Ver
// C:\Users\maxwe\.claude\plans\fancy-painting-mochi.md, passo 3.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAFF_ROLES = ['professor', 'coordenacao', 'secretario'] as const
type StaffRole = (typeof STAFF_ROLES)[number]

// `diretoria`/`financeiro` ficam sem sugestão automática de propósito -- categorias
// sensíveis, ninguém deve auto-sugerir acesso a elas. `null` = sem sugestão.
const CATEGORIA_TO_ROLE: Record<string, StaffRole | null> = {
  atendimento_operacional: 'professor',
  coordenacao_administrativa: 'coordenacao',
  administrativo: 'secretario',
  financeiro: null,
  diretoria: null,
  outro: null,
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
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
    // Mesma fronteira de quem pode convidar staff em create-staff-user -- ver sugestão
    // é parte do mesmo fluxo, não precisa de permissão própria.
    if (!callerProfile || (callerProfile.role !== 'admin' && callerProfile.role !== 'coordenacao')) {
      return jsonResponse({ error: 'Apenas administração ou coordenação podem convidar membros da equipe' }, 403)
    }

    const body = await req.json()
    const cpf = typeof body.cpf === 'string' ? body.cpf.replace(/\D/g, '') : ''
    if (cpf.length !== 11) {
      return jsonResponse({ error: 'CPF inválido — informe os 11 dígitos' }, 400)
    }

    const result = await callEntidadePreflight(adminClient, callerProfile.organization_id, cpf, 'COLABORADOR')

    if (!result.configured || !result.ok || !result.autorizado || !result.categoriaPadrao) {
      return jsonResponse({ suggestedRole: null, cargoCategoria: null }, 200)
    }

    const suggestedRole = CATEGORIA_TO_ROLE[result.categoriaPadrao] ?? null
    return jsonResponse({ suggestedRole, cargoCategoria: result.categoriaPadrao }, 200)
  } catch (error) {
    console.error('Unexpected error in staff-role-suggestion:', error)
    return jsonResponse({ error: 'Internal server error: ' + (error as Error).message }, 500)
  }
})
