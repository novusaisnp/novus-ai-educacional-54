-- 1. Função segura p/ obter organization_id do usuário autenticado
-- Evita depender de claim ausente e corrige search_path
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- 2. Helper: check de autenticacao
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- 3. Habilitar RLS (se ainda não estiver)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Drop de políticas permissivas antigas (se existirem)
DROP POLICY IF EXISTS "select_any_students" ON public.students;
DROP POLICY IF EXISTS "select_any_guardians" ON public.guardians;
DROP POLICY IF EXISTS "select_any_grades" ON public.grades;
DROP POLICY IF EXISTS "select_any_attendance" ON public.attendance;
DROP POLICY IF EXISTS "Organization isolation" ON public.students;
DROP POLICY IF EXISTS "Organization isolation" ON public.guardians;
DROP POLICY IF EXISTS "Organization isolation" ON public.grades;
DROP POLICY IF EXISTS "Organization isolation" ON public.attendance;
DROP POLICY IF EXISTS "Organization isolation" ON public.enrollments;
DROP POLICY IF EXISTS "Organization isolation" ON public.assessments;
DROP POLICY IF EXISTS "Organization isolation" ON public.classes;
DROP POLICY IF EXISTS "Organization isolation" ON public.subjects;
DROP POLICY IF EXISTS "Organization isolation" ON public.interactions;
DROP POLICY IF EXISTS "Organization isolation" ON public.documents;
DROP POLICY IF EXISTS "Organization isolation" ON public.consents;
DROP POLICY IF EXISTS "Organization isolation" ON public.audit_logs;

-- 5. Políticas padronizadas (USING + WITH CHECK)
-- Regra geral: requer autenticado E pertencer à mesma organização

-- students
CREATE POLICY "students_secure_access" ON public.students
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- guardians
CREATE POLICY "guardians_secure_access" ON public.guardians
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- grades
CREATE POLICY "grades_secure_access" ON public.grades
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- attendance
CREATE POLICY "attendance_secure_access" ON public.attendance
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- enrollments
CREATE POLICY "enrollments_secure_access" ON public.enrollments
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- assessments
CREATE POLICY "assessments_secure_access" ON public.assessments
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- classes
CREATE POLICY "classes_secure_access" ON public.classes
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- subjects
CREATE POLICY "subjects_secure_access" ON public.subjects
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- interactions
CREATE POLICY "interactions_secure_access" ON public.interactions
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- documents
CREATE POLICY "documents_secure_access" ON public.documents
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- consents
CREATE POLICY "consents_secure_access" ON public.consents
  FOR ALL USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() 
  )
  WITH CHECK ( 
    organization_id = public.current_org_id() 
  );

-- audit_logs (somente admins podem ver, sistema pode inserir)
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "audit_logs_admin_view" ON public.audit_logs
  FOR SELECT USING ( 
    public.is_authenticated() AND 
    organization_id = public.current_org_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND organization_id = public.current_org_id() 
      AND role IN ('admin', 'coordenacao')
    )
  );

CREATE POLICY "audit_logs_system_insert" ON public.audit_logs
  FOR INSERT WITH CHECK ( 
    organization_id = public.current_org_id() 
  );