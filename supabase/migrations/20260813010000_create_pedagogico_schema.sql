-- Modulo Pedagogico completo (Planos de Aula, Acompanhamento, Projetos, Objetivos).
-- Escopo: uso interno de staff (professor/coordenacao/admin), sem exposicao no Portal
-- (nao e informacao que a familia acompanha, ao contrario de notas/frequencia).
-- Mesmo padrao de RLS ja usado em assessments/class_councils: manage = admin/
-- coordenacao/professor, select = qualquer staff do org.

CREATE TABLE public.lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  class_id UUID NOT NULL REFERENCES public.classes(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  term_id UUID REFERENCES public.academic_terms(id),
  title TEXT NOT NULL,
  objectives TEXT,
  content TEXT,
  lesson_date DATE NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX lesson_plans_org_date_idx ON public.lesson_plans (organization_id, lesson_date DESC);
CREATE INDEX lesson_plans_class_idx ON public.lesson_plans (class_id);

CREATE TABLE public.student_tracking_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  student_id UUID NOT NULL REFERENCES public.students(id),
  category TEXT NOT NULL DEFAULT 'academico' CHECK (category IN ('academico', 'comportamental', 'socioemocional', 'outro')),
  note TEXT NOT NULL,
  note_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX student_tracking_notes_org_student_idx ON public.student_tracking_notes (organization_id, student_id, note_date DESC);

CREATE TABLE public.pedagogical_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  class_id UUID REFERENCES public.classes(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planejamento' CHECK (status IN ('planejamento', 'em_andamento', 'concluido', 'cancelado')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pedagogical_projects_org_idx ON public.pedagogical_projects (organization_id, status);

CREATE TABLE public.pedagogical_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  project_id UUID REFERENCES public.pedagogical_projects(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.classes(id),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado', 'em_andamento', 'concluido')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pedagogical_goals_org_idx ON public.pedagogical_goals (organization_id, status);
CREATE INDEX pedagogical_goals_project_idx ON public.pedagogical_goals (project_id);

ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_tracking_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedagogical_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedagogical_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY lesson_plans_select ON public.lesson_plans FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());
CREATE POLICY lesson_plans_manage ON public.lesson_plans FOR ALL
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']))
  WITH CHECK (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']));

CREATE POLICY student_tracking_notes_select ON public.student_tracking_notes FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());
CREATE POLICY student_tracking_notes_manage ON public.student_tracking_notes FOR ALL
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']))
  WITH CHECK (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']));

CREATE POLICY pedagogical_projects_select ON public.pedagogical_projects FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());
CREATE POLICY pedagogical_projects_manage ON public.pedagogical_projects FOR ALL
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']))
  WITH CHECK (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']));

CREATE POLICY pedagogical_goals_select ON public.pedagogical_goals FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());
CREATE POLICY pedagogical_goals_manage ON public.pedagogical_goals FOR ALL
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']))
  WITH CHECK (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor']));
