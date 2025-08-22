
-- =========================================================
-- Segurança & LGPD v1 — Views seguras, Policies e Auditoria
-- Regras: não criar novas tabelas; apenas views, funções e policies
-- Pré-existentes: public.current_org_id(), public.get_current_user_role(), public.is_authenticated()
-- =========================================================


-- 02) View segura de RESPONSÁVEIS (oculta PII por padrão)
-- Adaptação ao schema atual: guardians(name, email, phone, relationship, ...)
create or replace view public.v_guardians_safe as
select
  g.id,
  g.organization_id,
  g.name,
  g.relationship,
  case
    when public.get_current_user_role() in ('admin','coordenacao','secretario')
      then g.phone
    else null
  end as phone,
  case
    when public.get_current_user_role() in ('admin','coordenacao','secretario','professor')
      then g.email
    else null
  end as email,
  g.created_at,
  g.updated_at
from public.guardians g
where g.organization_id = public.current_org_id();

alter view public.v_guardians_safe owner to postgres;


-- 03) View segura de PERFIS (apenas dados essenciais; sem email no schema público)
create or replace view public.v_profiles_safe as
select
  p.id,
  p.organization_id,
  p.full_name,
  p.role,
  p.created_at,
  p.updated_at
from public.profiles p
where p.organization_id = public.current_org_id();

alter view public.v_profiles_safe owner to postgres;


-- 04) Policies reforçadas (SELECT isolado por org + user autenticado)
-- Students: garantir política explícita de SELECT por org + autenticado
drop policy if exists students_isolated_select on public.students;
create policy students_isolated_select
  on public.students
  for select
  using (public.is_authenticated() and organization_id = public.current_org_id());

-- Guardians: substituir ALL permissiva por políticas explícitas
drop policy if exists "Staff can manage guardians" on public.guardians;

-- SELECT liberado a usuários autenticados da mesma organização
drop policy if exists guardians_select_isolated on public.guardians;
create policy guardians_select_isolated
  on public.guardians
  for select
  using (public.is_authenticated() and organization_id = public.current_org_id());

-- INSERT/UPDATE/DELETE restritos a staff (admin/coordenacao/secretario)
drop policy if exists guardians_insert_staff on public.guardians;
create policy guardians_insert_staff
  on public.guardians
  for insert
  with check (
    organization_id = public.current_org_id()
    and public.get_current_user_role() in ('admin','coordenacao','secretario')
  );

drop policy if exists guardians_update_staff on public.guardians;
create policy guardians_update_staff
  on public.guardians
  for update
  using (
    organization_id = public.current_org_id()
    and public.get_current_user_role() in ('admin','coordenacao','secretario')
  )
  with check (organization_id = public.current_org_id());

drop policy if exists guardians_delete_staff on public.guardians;
create policy guardians_delete_staff
  on public.guardians
  for delete
  using (
    organization_id = public.current_org_id()
    and public.get_current_user_role() in ('admin','coordenacao','secretario')
  );

-- Profiles: SELECT isolado por org + autenticado (não altera UPDATE/ALL existentes)
drop policy if exists profiles_isolated_select on public.profiles;
create policy profiles_isolated_select
  on public.profiles
  for select
  using (public.is_authenticated() and organization_id = public.current_org_id());


-- 05) Auditoria leve de leitura de PII (RPC)
-- Registra acesso a colunas sensíveis por perfis autorizados
create or replace function public.audit_pii_access(entity text, entity_id uuid, columns text[])
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.audit_logs (organization_id, table_name, action, diff, actor)
  values (
    public.current_org_id(),
    entity,
    'READ_PII',
    jsonb_build_object(
      'id', entity_id,
      'columns', columns,
      'by_role', public.get_current_user_role()
    ),
    auth.uid()
  );
end;
$$;

-- Permissões de execução (opcional; por padrão PUBLIC costuma ter)
grant execute on function public.audit_pii_access(text, uuid, text[]) to authenticated;
