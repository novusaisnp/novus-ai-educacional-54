-- 1. Corrigir recursão infinita na função current_org_id
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT organization_id
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE au.id = auth.uid()
  LIMIT 1;
$function$;

-- 2. Criar função segura para verificar role do usuário
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT p.role
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE au.id = auth.uid()
  LIMIT 1;
$function$;

-- 3. Recriar políticas RLS para profiles sem recursão
DROP POLICY IF EXISTS "Admins can manage all profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Política para admins gerenciarem todos os perfis
CREATE POLICY "Admins can manage all profiles in organization" 
ON public.profiles 
FOR ALL 
USING (
  get_current_user_role() IN ('admin', 'coordenacao') 
  AND organization_id = current_org_id()
);

-- Política para usuários verem perfis da mesma organização (apenas admins e coordenação)
CREATE POLICY "Staff can view profiles in organization" 
ON public.profiles 
FOR SELECT 
USING (
  get_current_user_role() IN ('admin', 'coordenacao', 'secretario', 'professor') 
  AND organization_id = current_org_id()
);

-- Política para usuários verem apenas seu próprio perfil
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

-- Política para usuários atualizarem apenas seu próprio perfil
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- 4. Implementar controle de acesso baseado em roles para dados sensíveis
-- Recriar políticas para students com controle de role
DROP POLICY IF EXISTS "students_modify" ON public.students;
DROP POLICY IF EXISTS "students_secure_access" ON public.students;
DROP POLICY IF EXISTS "students_select" ON public.students;

CREATE POLICY "Staff can manage students" 
ON public.students 
FOR ALL 
USING (
  is_authenticated() 
  AND organization_id = current_org_id()
  AND get_current_user_role() IN ('admin', 'coordenacao', 'secretario')
)
WITH CHECK (organization_id = current_org_id());

CREATE POLICY "Teachers can view students" 
ON public.students 
FOR SELECT 
USING (
  is_authenticated() 
  AND organization_id = current_org_id()
  AND get_current_user_role() IN ('admin', 'coordenacao', 'secretario', 'professor')
);

-- 5. Recriar políticas para guardians com controle de role
DROP POLICY IF EXISTS "guardians_modify" ON public.guardians;
DROP POLICY IF EXISTS "guardians_secure_access" ON public.guardians;
DROP POLICY IF EXISTS "guardians_select" ON public.guardians;

CREATE POLICY "Staff can manage guardians" 
ON public.guardians 
FOR ALL 
USING (
  is_authenticated() 
  AND organization_id = current_org_id()
  AND get_current_user_role() IN ('admin', 'coordenacao', 'secretario')
)
WITH CHECK (organization_id = current_org_id());

-- 6. Recriar políticas para visitors com controle de role
DROP POLICY IF EXISTS "visitors_delete" ON public.visitors;
DROP POLICY IF EXISTS "visitors_insert" ON public.visitors;
DROP POLICY IF EXISTS "visitors_select" ON public.visitors;
DROP POLICY IF EXISTS "visitors_update" ON public.visitors;

CREATE POLICY "Security staff can manage visitors" 
ON public.visitors 
FOR ALL 
USING (
  is_authenticated() 
  AND organization_id = current_org_id()
  AND get_current_user_role() IN ('admin', 'coordenacao', 'secretario', 'seguranca')
)
WITH CHECK (organization_id = current_org_id());

-- 7. Recriar políticas para waitlist_applications com controle de role
DROP POLICY IF EXISTS "waitlist_applications_delete" ON public.waitlist_applications;
DROP POLICY IF EXISTS "waitlist_applications_insert" ON public.waitlist_applications;
DROP POLICY IF EXISTS "waitlist_applications_select" ON public.waitlist_applications;
DROP POLICY IF EXISTS "waitlist_applications_update" ON public.waitlist_applications;

CREATE POLICY "Admissions staff can manage waitlist" 
ON public.waitlist_applications 
FOR ALL 
USING (
  is_authenticated() 
  AND organization_id = current_org_id()
  AND get_current_user_role() IN ('admin', 'coordenacao', 'secretario')
)
WITH CHECK (organization_id = current_org_id());

-- 8. Atualizar função update_updated_at_column com search_path correto
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;