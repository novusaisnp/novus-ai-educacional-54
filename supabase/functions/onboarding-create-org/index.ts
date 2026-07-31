import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação requerido' }),
        { status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Identifica o usuário autenticado a partir do token do chamador
    const { data: userData, error: userError } = await adminClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }
    const userId = userData.user.id

    const { organization_name } = await req.json()
    if (!organization_name || typeof organization_name !== 'string' || !organization_name.trim()) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório: organization_name' }),
        { status: 400, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    // Impede reonboarding: usuário já vinculado a uma organização não pode criar outra por aqui
    const { data: existingProfile, error: profileFetchError } = await adminClient
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .maybeSingle()

    if (profileFetchError) {
      console.error('Failed to fetch profile:', profileFetchError)
      return new Response(
        JSON.stringify({ error: 'Falha ao verificar perfil: ' + profileFetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    if (existingProfile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Usuário já pertence a uma organização' }),
        { status: 409, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert([{ name: organization_name.trim() }])
      .select('id')
      .single()

    if (orgError) {
      console.error('Failed to create organization:', orgError)
      return new Response(
        JSON.stringify({ error: 'Falha ao criar organização: ' + orgError.message }),
        { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    const fullName =
      (userData.user.user_metadata?.full_name as string | undefined) ||
      (userData.user.user_metadata?.name as string | undefined) ||
      userData.user.email?.split('@')[0] ||
      'Usuário'

    // Não há trigger que crie a linha em profiles no signup (só existe para
    // guardians, no fluxo do portal) — por isso upsert, não update.
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: userId, organization_id: org.id, role: 'admin', full_name: fullName })

    if (profileError) {
      console.error('Failed to link profile to organization:', profileError)
      return new Response(
        JSON.stringify({ error: 'Falha ao vincular perfil à organização: ' + profileError.message }),
        { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, organization_id: org.id }),
      { status: 200, headers: { ...corsHeaders, 'content-type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error in onboarding-create-org:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } }
    )
  }
})
