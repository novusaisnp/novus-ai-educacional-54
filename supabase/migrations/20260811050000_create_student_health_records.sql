-- Prontuário digital: saúde, alergias, contato de emergência. Dado sensível
-- (LGPD art. 11) — tabela própria, não misturada em `students`, RLS restrita
-- a quem de fato precisa escrever (admin/coordenacao/secretario, mesmo corte
-- de `students_manage`). Um registro "vivo" por aluno, não histórico
-- versionado (diferente de `student_pei`) — contato de emergência desatualizado
-- não tem valor de manter como revisão antiga.
CREATE TABLE public.student_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  student_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  blood_type TEXT,
  allergies TEXT,
  medical_conditions TEXT,
  medications TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX student_health_records_org_idx ON public.student_health_records (organization_id);

ALTER TABLE public.student_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_health_records_select ON public.student_health_records
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

CREATE POLICY student_health_records_manage ON public.student_health_records
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND organization_id = current_org_id()
    AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND organization_id = current_org_id()
    AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  );

CREATE TRIGGER update_student_health_records_updated_at
  BEFORE UPDATE ON public.student_health_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
