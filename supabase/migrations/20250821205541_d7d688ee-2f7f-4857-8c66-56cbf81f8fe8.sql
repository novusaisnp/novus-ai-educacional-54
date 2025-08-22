
-- Migration: RLS Hardening + Views Seguras para Módulo de Notas
-- Criado: 2025-01-21

-- 1. Garantir que as funções de segurança existem
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT organization_id
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE au.id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT p.role
  FROM auth.users au
  JOIN public.profiles p ON p.id = au.id
  WHERE au.id = auth.uid()
  LIMIT 1;
$$;

-- 2. Reforçar políticas RLS para tabelas críticas do módulo de notas

-- GRADES: políticas mais granulares por role
DROP POLICY IF EXISTS "grades_select_enhanced" ON public.grades;
CREATE POLICY "grades_select_enhanced" ON public.grades
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = public.current_org_id()
  AND public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'professor', 'secretario'])
);

DROP POLICY IF EXISTS "grades_modify_enhanced" ON public.grades;
CREATE POLICY "grades_modify_enhanced" ON public.grades
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = public.current_org_id()
  AND public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'professor'])
)
WITH CHECK (
  organization_id = public.current_org_id()
);

-- ASSESSMENTS: apenas leitura para professores, modificação para admin/coordenacao
DROP POLICY IF EXISTS "assessments_select_enhanced" ON public.assessments;
CREATE POLICY "assessments_select_enhanced" ON public.assessments
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = public.current_org_id()
  AND public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'professor', 'secretario'])
);

DROP POLICY IF EXISTS "assessments_modify_enhanced" ON public.assessments;
CREATE POLICY "assessments_modify_enhanced" ON public.assessments
FOR ALL
USING (
  auth.uid() IS NOT NULL 
  AND organization_id = public.current_org_id()
  AND public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao'])
)
WITH CHECK (
  organization_id = public.current_org_id()
);

-- 3. Criar view segura para estudantes (mascaramento de PII)
CREATE OR REPLACE VIEW public.v_students_safe
WITH (security_barrier = true)
AS
SELECT
  s.id,
  s.organization_id,
  s.first_name,
  s.last_name,
  s.status,
  s.created_at,
  s.updated_at,
  -- PII mascarado baseado no role do usuário
  CASE 
    WHEN public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN s.document_id
    ELSE '***.**.***.***-**'
  END as document_id,
  CASE 
    WHEN public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN s.birth_date
    ELSE NULL
  END as birth_date,
  CASE 
    WHEN public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN s.person_id
    ELSE NULL
  END as person_id
FROM public.students s
WHERE s.organization_id = public.current_org_id();

-- 4. Melhorar view de responsáveis (já existe, mas reforçar)
CREATE OR REPLACE VIEW public.v_guardians_safe
WITH (security_barrier = true)
AS
SELECT
  g.id,
  g.organization_id,
  g.name,
  g.relationship,
  g.created_at,
  g.updated_at,
  -- PII mascarado baseado no role
  CASE 
    WHEN public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN g.email
    WHEN public.get_current_user_role() = 'professor'
    THEN g.email -- professores podem ver email para contato
    ELSE '***@***.com'
  END as email,
  CASE 
    WHEN public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN g.phone
    ELSE '(**) ****-****'
  END as phone,
  CASE 
    WHEN public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) 
    THEN g.cpf
    ELSE '***.***.***-**'
  END as cpf
FROM public.guardians g
WHERE g.organization_id = public.current_org_id();

-- 5. Índices de performance para queries de notas
CREATE INDEX IF NOT EXISTS idx_grades_org_assessment 
ON public.grades (organization_id, assessment_id);

CREATE INDEX IF NOT EXISTS idx_grades_org_student 
ON public.grades (organization_id, student_id);

CREATE INDEX IF NOT EXISTS idx_assessments_org_subject_class 
ON public.assessments (organization_id, subject_id, class_id);

CREATE INDEX IF NOT EXISTS idx_students_org_status 
ON public.students (organization_id, status);

-- 6. Função para auditoria de acesso a PII (se não existir)
CREATE OR REPLACE FUNCTION public.audit_pii_access(
  entity text,
  entity_id uuid,
  columns text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    organization_id,
    table_name,
    action,
    diff,
    actor
  ) VALUES (
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
END;
$$;
