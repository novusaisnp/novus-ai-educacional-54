-- Função segura para obter organization_id do usuário autenticado
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$$;

-- Helper: checa se há usuário autenticado
create or replace function public.is_authenticated()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null;
$$;

-- Garantir RLS ativo nas tabelas sensíveis
alter table public.students enable row level security;
alter table public.guardians enable row level security;
alter table public.grades enable row level security;
alter table public.attendance enable row level security;

-- Remover políticas frágeis se existirem
drop policy if exists "students_select" on public.students;
drop policy if exists "students_modify" on public.students;
drop policy if exists "guardians_select" on public.guardians;
drop policy if exists "guardians_modify" on public.guardians;
drop policy if exists "grades_select" on public.grades;
drop policy if exists "grades_modify" on public.grades;
drop policy if exists "attendance_select" on public.attendance;
drop policy if exists "attendance_modify" on public.attendance;

-- Políticas mínimas: exige auth e mesma organization_id
create policy "students_select" on public.students
  for select using ( public.is_authenticated() and organization_id = public.current_org_id() );
create policy "students_modify" on public.students
  for all using ( public.is_authenticated() and organization_id = public.current_org_id() )
  with check ( organization_id = public.current_org_id() );

create policy "guardians_select" on public.guardians
  for select using ( public.is_authenticated() and organization_id = public.current_org_id() );
create policy "guardians_modify" on public.guardians
  for all using ( public.is_authenticated() and organization_id = public.current_org_id() )
  with check ( organization_id = public.current_org_id() );

create policy "grades_select" on public.grades
  for select using ( public.is_authenticated() and organization_id = public.current_org_id() );
create policy "grades_modify" on public.grades
  for all using ( public.is_authenticated() and organization_id = public.current_org_id() )
  with check ( organization_id = public.current_org_id() );

create policy "attendance_select" on public.attendance
  for select using ( public.is_authenticated() and organization_id = public.current_org_id() );
create policy "attendance_modify" on public.attendance
  for all using ( public.is_authenticated() and organization_id = public.current_org_id() )
  with check ( organization_id = public.current_org_id() );