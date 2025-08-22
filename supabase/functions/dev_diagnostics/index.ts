import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

type Step = { name: string; ok: boolean; detail?: string; data?: unknown }
type Report = {
  ok: boolean
  steps: Step[]
  authTest: { signInOk: boolean; error?: string }
  user?: { id?: string; email?: string; confirmed?: string | null }
  organization?: { id?: string; name?: string }
  profile?: { id?: string; organization_id?: string; role?: string }
  rlsTest: {
    anonStudentsVisible: number | 'error'
    authedStudentsVisible: number | 'error'
    organization_id?: string
  }
  fixes?: string[]
}

serve(async (req) => {
  const token = req.headers.get('x-dev-token')
  if (!token || token !== Deno.env.get('DEV_HEALTH_TOKEN')) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Parâmetros padrão (sem UI; valores fixos para nosso caso)
  const email = 'selftnt@gmail.com'
  const password = '388030'
  const full_name = 'Dev Admin'
  const organization_name = 'NOVUS.AI - Escola Teste'

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

  const out: Report = {
    ok: true,
    steps: [],
    authTest: { signInOk: false },
    rlsTest: { anonStudentsVisible: 'error', authedStudentsVisible: 'error' },
    fixes: []
  }

  // 1) Garantir organizacao
  let orgId: string | null = null
  {
    const { data, error } = await admin.from('organizations').select('id,name').ilike('name', organization_name).limit(1).maybeSingle()
    if (!error && data) { orgId = data.id; out.organization = { id: data.id, name: data.name }; out.steps.push({ name: 'orgFound', ok: true }) }
    else {
      const { data: created, error: e2 } = await admin.from('organizations').insert([{ name: organization_name }]).select('id,name').single()
      if (e2) { out.ok = false; out.steps.push({ name: 'orgCreate', ok: false, detail: e2.message }) }
      else { orgId = created.id; out.organization = { id: created.id, name: created.name }; out.steps.push({ name: 'orgCreate', ok: true }); out.fixes!.push('organization_created') }
    }
  }

  // 2) Garantir usuario
  let userId: string | null = null
  {
    const { data: got, error } = await admin.auth.admin.getUserByEmail(email)
    if (got?.user) {
      userId = got.user.id
      out.user = { id: userId, email: got.user.email!, confirmed: got.user.email_confirmed_at ?? null }
      out.steps.push({ name: 'userFound', ok: true })
    } else {
      const { data: created, error: e2 } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name }
      })
      if (e2 || !created?.user?.id) { out.ok = false; out.steps.push({ name: 'userCreate', ok: false, detail: e2?.message ?? 'unknown' }) }
      else { userId = created.user.id; out.user = { id: userId, email, confirmed: created.user.email_confirmed_at ?? null }; out.steps.push({ name: 'userCreate', ok: true }); out.fixes!.push('user_created') }
    }
  }

  // 3) Garantir profile admin na org
  if (userId && orgId) {
    const { data: prof, error } = await admin.from('profiles').select('id,organization_id,role').eq('id', userId).maybeSingle()
    if (!prof) {
      const { error: e2 } = await admin.from('profiles').insert({ id: userId, organization_id: orgId, full_name, role: 'admin' })
      if (e2) { out.ok = false; out.steps.push({ name: 'profileInsert', ok: false, detail: e2.message }) }
      else { out.profile = { id: userId, organization_id: orgId, role: 'admin' }; out.steps.push({ name: 'profileInsert', ok: true }); out.fixes!.push('profile_created') }
    } else {
      const patch: Record<string, unknown> = {}
      if (prof.organization_id !== orgId) patch.organization_id = orgId
      if (prof.role !== 'admin') patch.role = 'admin'
      if (Object.keys(patch).length) {
        const { error: e3 } = await admin.from('profiles').update(patch).eq('id', userId)
        if (e3) { out.ok = false; out.steps.push({ name: 'profileUpdate', ok: false, detail: e3.message }) }
        else { out.steps.push({ name: 'profileUpdate', ok: true, data: patch }); out.fixes!.push('profile_updated') }
      }
      out.profile = { id: userId, organization_id: prof.organization_id, role: prof.role }
    }
  }

  // 4) Teste de login real (anon client)
  {
    const sign = await anon.auth.signInWithPassword({ email, password })
    if (sign.error) {
      out.authTest = { signInOk: false, error: sign.error.message }
      // Força reset de senha + reconfirmação
      if (userId) {
        const upd = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
        if (!upd.error) {
          out.fixes!.push('password_reset')
          const again = await anon.auth.signInWithPassword({ email, password })
          out.authTest = { signInOk: !again.error, error: again.error?.message }
        }
      }
    } else {
      out.authTest = { signInOk: true }
      const access = sign.data.session?.access_token!
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const authed = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${access}` } } })
      // Org do usuario
      const prof = await authed.from('profiles').select('organization_id').eq('id', sign.data.user!.id).single()
      const org = prof.data?.organization_id ?? null
      // RLS test
      const anonStudents = await anon.from('students').select('id', { count: 'exact', head: true })
      const authedStudents = await authed.from('students').select('id', { count: 'exact', head: true })
      out.rlsTest = {
        anonStudentsVisible: typeof anonStudents.count === 'number' ? anonStudents.count : 'error',
        authedStudentsVisible: typeof authedStudents.count === 'number' ? authedStudents.count : 'error',
        organization_id: org ?? undefined
      }
    }
  }

  out.ok = out.ok && out.authTest.signInOk === true
  return new Response(JSON.stringify(out), { status: 200, headers: { 'content-type': 'application/json' } })
})