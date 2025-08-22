
-- **1. POLÍTICAS RLS - Reforço de Segurança**
-- Ajustar políticas existentes para garantir auth.uid() IS NOT NULL

-- Students: Reforçar políticas existentes
DROP POLICY IF EXISTS "Staff can manage students" ON public.students;
DROP POLICY IF EXISTS "Teachers can view students" ON public.students;

CREATE POLICY "Staff can manage students" ON public.students
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
)
WITH CHECK (organization_id = current_org_id());

CREATE POLICY "Teachers can view students" ON public.students
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario', 'professor'])
);

-- Guardians: Reforçar política existente
DROP POLICY IF EXISTS "Staff can manage guardians" ON public.guardians;

CREATE POLICY "Staff can manage guardians" ON public.guardians
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
)
WITH CHECK (organization_id = current_org_id());

-- Visitors: Reforçar política existente
DROP POLICY IF EXISTS "Security staff can manage visitors" ON public.visitors;

CREATE POLICY "Security staff can manage visitors" ON public.visitors
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario', 'seguranca'])
)
WITH CHECK (organization_id = current_org_id());

-- Waitlist Applications: Reforçar política existente
DROP POLICY IF EXISTS "Admissions staff can manage waitlist" ON public.waitlist_applications;

CREATE POLICY "Admissions staff can manage waitlist" ON public.waitlist_applications
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
)
WITH CHECK (organization_id = current_org_id());

-- Profiles: Consolidar políticas sobrepostas
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can view profiles in organization" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles in organization" ON public.profiles;

-- Política unificada para visualização própria
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- Política para atualização própria
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND id = auth.uid());

-- Política para staff visualizar perfis da organização
CREATE POLICY "Staff can view org profiles" ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario', 'professor'])
);

-- Política para admins gerenciarem perfis da organização
CREATE POLICY "Admins can manage org profiles" ON public.profiles
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao'])
);

-- **2. VIEWS SEGURAS - Proteção de PII**

-- View segura para students (mascarar dados sensíveis)
CREATE OR REPLACE VIEW public.v_students_safe AS
SELECT 
  id,
  organization_id,
  first_name,
  last_name,
  status,
  birth_date,
  gender,
  -- Mascarar document_id (mostrar apenas últimos 4 dígitos)
  CASE 
    WHEN get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN document_id
    ELSE CONCAT('***', RIGHT(COALESCE(document_id, ''), 4))
  END as document_id,
  -- person_id sempre mascarado para não-staff
  CASE 
    WHEN get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN person_id
    ELSE NULL
  END as person_id,
  created_at,
  updated_at
FROM public.students;

-- RLS para view v_students_safe
ALTER VIEW public.v_students_safe OWNER TO postgres;
ALTER TABLE public.v_students_safe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Safe students view access" ON public.v_students_safe
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario', 'professor'])
);

-- View segura para guardians (mascarar dados sensíveis)
CREATE OR REPLACE VIEW public.v_guardians_safe AS
SELECT 
  id,
  organization_id,
  name,
  relationship,
  -- Mascarar email (mostrar apenas domínio)
  CASE 
    WHEN get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN email
    ELSE CONCAT('***@', SPLIT_PART(COALESCE(email, ''), '@', 2))
  END as email,
  -- Mascarar phone (mostrar apenas últimos 4 dígitos)
  CASE 
    WHEN get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN phone
    ELSE CONCAT('***', RIGHT(COALESCE(phone, ''), 4))
  END as phone,
  created_at,
  updated_at
FROM public.guardians;

-- RLS para view v_guardians_safe
ALTER VIEW public.v_guardians_safe OWNER TO postgres;
ALTER TABLE public.v_guardians_safe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Safe guardians view access" ON public.v_guardians_safe
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = current_org_id() 
  AND get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario'])
);

-- **3. RPC SECURITY DEFINER para acesso seguro**

-- Função para buscar dados seguros de guardian
CREATE OR REPLACE FUNCTION public.get_guardian_safe(guardian_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  user_role text;
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  
  -- Obter role do usuário
  user_role := get_current_user_role();
  
  -- Verificar se o guardian pertence à organização do usuário
  IF NOT EXISTS (
    SELECT 1 FROM guardians 
    WHERE id = guardian_id 
    AND organization_id = current_org_id()
  ) THEN
    RAISE EXCEPTION 'Guardian não encontrado ou sem permissão';
  END IF;
  
  -- Retornar dados baseados na role
  SELECT json_build_object(
    'id', g.id,
    'name', g.name,
    'relationship', g.relationship,
    'email', CASE 
      WHEN user_role = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
      THEN g.email
      ELSE CONCAT('***@', SPLIT_PART(COALESCE(g.email, ''), '@', 2))
    END,
    'phone', CASE 
      WHEN user_role = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
      THEN g.phone
      ELSE CONCAT('***', RIGHT(COALESCE(g.phone, ''), 4))
    END,
    'created_at', g.created_at,
    'updated_at', g.updated_at
  ) INTO result
  FROM guardians g
  WHERE g.id = guardian_id;
  
  RETURN result;
END;
$$;

-- **4. AUDIT LOG para acessos a PII**
-- Criar função trigger para log de acesso a dados sensíveis
CREATE OR REPLACE FUNCTION public.log_pii_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log apenas para acessos SELECT em tabelas com PII
  IF TG_OP = 'SELECT' AND TG_TABLE_NAME IN ('students', 'guardians', 'visitors', 'waitlist_applications') THEN
    INSERT INTO audit_logs (
      organization_id,
      table_name,
      action,
      actor,
      diff
    ) VALUES (
      current_org_id(),
      TG_TABLE_NAME,
      'pii_access',
      auth.uid(),
      json_build_object(
        'accessed_at', now(),
        'table', TG_TABLE_NAME,
        'user_role', get_current_user_role()
      )
    );
  END IF;
  
  RETURN NULL;
END;
$$;

-- Aplicar trigger de auditoria nas tabelas com PII
DROP TRIGGER IF EXISTS students_pii_access_log ON public.students;
CREATE TRIGGER students_pii_access_log
  AFTER SELECT ON public.students
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_pii_access();

DROP TRIGGER IF EXISTS guardians_pii_access_log ON public.guardians;
CREATE TRIGGER guardians_pii_access_log
  AFTER SELECT ON public.guardians
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_pii_access();

DROP TRIGGER IF EXISTS visitors_pii_access_log ON public.visitors;
CREATE TRIGGER visitors_pii_access_log
  AFTER SELECT ON public.visitors
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_pii_access();

DROP TRIGGER IF EXISTS waitlist_pii_access_log ON public.waitlist_applications;
CREATE TRIGGER waitlist_pii_access_log
  AFTER SELECT ON public.waitlist_applications
  FOR EACH STATEMENT
  EXECUTE FUNCTION log_pii_access();
