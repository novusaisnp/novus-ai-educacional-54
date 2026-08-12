import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-token',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = req.headers.get('x-admin-token')
    if (!token || token !== Deno.env.get('ADMIN_SEED_TOKEN')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid admin token' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'content-type': 'application/json' }
        }
      )
    }

    const { email, password, full_name, organization_name } = await req.json()

    if (!email || !password || !full_name || !organization_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name, organization_name' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'content-type': 'application/json' }
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(
      supabaseUrl,
      serviceKey,
      { 
        auth: { 
          autoRefreshToken: false, 
          persistSession: false 
        } 
      }
    )

    console.log('Creating admin user:', { email, full_name, organization_name })

    // 1) Garantir organizacao
    let orgId: string | null = null
    {
      const { data, error } = await adminClient
        .from('organizations')
        .select('id')
        .ilike('name', organization_name)
        .limit(1)
        .maybeSingle()
      
      if (!error && data) {
        orgId = data.id
        console.log('Found existing organization:', orgId)
      } else {
        const { data: created, error: e2 } = await adminClient
          .from('organizations')
          .insert([{ name: organization_name }])
          .select('id')
          .single()
        
        if (e2) {
          console.error('Failed to create organization:', e2)
          return new Response(
            JSON.stringify({ error: 'Failed to create organization: ' + e2.message }), 
            { 
              status: 500, 
              headers: { ...corsHeaders, 'content-type': 'application/json' }
            }
          )
        }
        orgId = created!.id
        console.log('Created new organization:', orgId)
      }
    }

    // 2) Verificar se usuário já existe
    const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email)
    
    let userId: string
    
    if (existingUser.user) {
      userId = existingUser.user.id
      console.log('User already exists:', userId)
    } else {
      // Criar usuario (confirmado)
      const { data: userRes, error: uErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name }
      })
      
      if (uErr || !userRes?.user?.id) {
        console.error('Failed to create user:', uErr)
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + (uErr?.message ?? 'unknown') }), 
          { 
            status: 500, 
            headers: { ...corsHeaders, 'content-type': 'application/json' }
          }
        )
      }
      userId = userRes.user.id
      console.log('Created new user:', userId)
    }

    // 3) Vincular profile
    const { error: pErr } = await adminClient.from('profiles').upsert({
      id: userId,
      organization_id: orgId,
      full_name: full_name,
      role: 'admin'
    })
    
    if (pErr) {
      console.error('Failed to upsert profile:', pErr)
      return new Response(
        JSON.stringify({ error: 'Failed to upsert profile: ' + pErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' }
        }
      )
    }

    // Vínculo é obrigatório: current_org_id() exige a linha em user_organizations
    // (ver 20260811230000_vinculo_como_fonte_de_verdade.sql). Profile sem vínculo
    // não enxerga nada.
    const { error: mErr } = await adminClient.from('user_organizations').upsert(
      { user_id: userId, organization_id: orgId, role: 'admin' },
      { onConflict: 'user_id,organization_id' }
    )

    if (mErr) {
      console.error('Failed to upsert membership:', mErr)
      return new Response(
        JSON.stringify({ error: 'Failed to upsert membership: ' + mErr.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'content-type': 'application/json' }
        }
      )
    }

    console.log('Successfully created admin user setup')

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId, 
        organization_id: orgId,
        message: 'Admin user created successfully'
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'content-type': 'application/json' }
      }
    )
  }
})