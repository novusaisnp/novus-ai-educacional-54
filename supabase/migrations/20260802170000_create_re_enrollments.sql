-- REMATRÍCULA COM APROVAÇÃO (solicitação individual, distinta da ferramenta em lote)
CREATE TABLE IF NOT EXISTS public.re_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id),
  current_class_id uuid REFERENCES public.classes(id),
  target_class_id uuid REFERENCES public.classes(id),
  guardian_name text,
  guardian_phone text,
  status text NOT NULL DEFAULT 'pendente', -- pendente, em_analise, aprovada, finalizada, cancelada
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.re_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "re_enrollments_select" ON public.re_enrollments
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "re_enrollments_insert" ON public.re_enrollments
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "re_enrollments_update" ON public.re_enrollments
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "re_enrollments_delete" ON public.re_enrollments
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_re_enrollments_organization_id ON public.re_enrollments(organization_id);
CREATE INDEX IF NOT EXISTS idx_re_enrollments_student_id ON public.re_enrollments(student_id);
