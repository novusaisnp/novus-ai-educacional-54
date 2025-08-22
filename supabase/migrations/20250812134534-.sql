-- Create organizations table first (base table for RLS)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','coordenacao','professor','secretaria','responsavel')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and create indexes for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Create helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  person_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT,
  document_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('ativo','inativo','transferido')) DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_students_organization_id ON public.students(organization_id);
CREATE INDEX idx_students_status ON public.students(status);

-- Create guardians table
CREATE TABLE public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_guardians_organization_id ON public.guardians(organization_id);

-- Create student_guardians junction table
CREATE TABLE public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  legal_consent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, guardian_id)
);

ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_student_guardians_organization_id ON public.student_guardians(organization_id);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  bncc_axis TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_subjects_organization_id ON public.subjects(organization_id);

-- Create classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  year INTEGER NOT NULL,
  grade TEXT,
  shift TEXT CHECK (shift IN ('manha','tarde','noite','integral')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_classes_organization_id ON public.classes(organization_id);

-- Create enrollments table
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ativa','trancada','concluida','transferida')) DEFAULT 'ativa',
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, class_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_enrollments_organization_id ON public.enrollments(organization_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);

-- Create assessments table
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  weight NUMERIC(5,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_assessments_organization_id ON public.assessments(organization_id);

-- Create grades table
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  grade NUMERIC(5,2),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, student_id)
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_grades_organization_id ON public.grades(organization_id);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('presente','falta','atraso','justificada')),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id, student_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attendance_organization_id ON public.attendance(organization_id);

-- Create interactions table
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('aluno','responsavel','turma')),
  entity_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('app','email','sms','telefone','presencial')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  summary TEXT NOT NULL,
  payload JSONB,
  performed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_interactions_organization_id ON public.interactions(organization_id);
CREATE INDEX idx_interactions_entity ON public.interactions(entity_type, entity_id);
CREATE INDEX idx_interactions_channel ON public.interactions(channel);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('aluno','responsavel')),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_documents_organization_id ON public.documents(organization_id);
CREATE INDEX idx_documents_owner ON public.documents(owner_type, owner_id);

-- Create consents table (LGPD)
CREATE TABLE public.consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  holder_type TEXT NOT NULL CHECK (holder_type IN ('aluno','responsavel')),
  holder_id UUID NOT NULL,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_consents_organization_id ON public.consents(organization_id);
CREATE INDEX idx_consents_holder ON public.consents(holder_type, holder_id);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  row_id UUID,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_logs_organization_id ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor);

-- Create storage bucket for educational documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('edu-docs', 'edu-docs', false);

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization" ON public.organizations
  FOR SELECT USING (id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in same organization" ON public.profiles
  FOR SELECT USING (organization_id = public.current_org_id());

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all profiles in organization" ON public.profiles
  FOR ALL USING (
    organization_id = public.current_org_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND organization_id = public.current_org_id() 
      AND role IN ('admin', 'coordenacao')
    )
  );

-- Generic RLS policies for all organizational tables
CREATE POLICY "Organization isolation" ON public.students
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.guardians
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.student_guardians
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.subjects
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.classes
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.enrollments
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.assessments
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.grades
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.attendance
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.interactions
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.documents
  FOR ALL USING (organization_id = public.current_org_id());

CREATE POLICY "Organization isolation" ON public.consents
  FOR ALL USING (organization_id = public.current_org_id());

-- Audit logs - only admin/coordenacao can view
CREATE POLICY "Admin can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    organization_id = public.current_org_id() AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND organization_id = public.current_org_id() 
      AND role IN ('admin', 'coordenacao')
    )
  );

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

-- Storage policies for edu-docs bucket
CREATE POLICY "Organization file access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'edu-docs' AND
    (storage.foldername(name))[1] = (
      SELECT organization_id::text 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization file upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'edu-docs' AND
    (storage.foldername(name))[1] = (
      SELECT organization_id::text 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization file update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'edu-docs' AND
    (storage.foldername(name))[1] = (
      SELECT organization_id::text 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Organization file delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'edu-docs' AND
    (storage.foldername(name))[1] = (
      SELECT organization_id::text 
      FROM public.profiles 
      WHERE id = auth.uid()
    )
  );

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guardians_updated_at
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_guardians_updated_at
  BEFORE UPDATE ON public.student_guardians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consents_updated_at
  BEFORE UPDATE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();