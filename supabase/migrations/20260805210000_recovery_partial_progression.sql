-- Recuperação e progressão parcial (Fase 1 — "Somar do MVP"): hoje o sistema só
-- lança nota solta por (avaliação, aluno), sem calcular média, sem conceito de
-- bimestre/trimestre, sem recuperação e sem decidir aprovação. Esta migration
-- cria: academic_terms (bimestre/trimestre, filho de periods), colunas novas em
-- assessments (tipo + vínculo a período), academic_settings (média mínima por
-- organização, default 6.0) e term_results (resultado final armazenado por
-- aluno×disciplina×turma×período — fato auditável, não view, pra não perder
-- rastro de recálculo quando uma nota é lançada com atraso).
--
-- Decisão de negócio confirmada com o usuário: nota_final = MAX(média_original,
-- nota_recuperação); "dependência" (matrícula paralela em disciplina pendente de
-- ano anterior) fica fora desta fatia — exige vínculo aluno↔disciplina
-- independente de turma, que não existe hoje.

-- 1) ACADEMIC_TERMS — bimestre/trimestre, filho de periods
CREATE TABLE public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.periods(id) ON DELETE CASCADE,
  name text NOT NULL,
  term_number int NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(period_id, term_number),
  CHECK (date_end >= date_start)
);

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_academic_terms_organization_id ON public.academic_terms(organization_id);
CREATE INDEX idx_academic_terms_period_id ON public.academic_terms(period_id);

CREATE POLICY "academic_terms_manage" ON public.academic_terms
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "academic_terms_select" ON public.academic_terms
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_academic_terms_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) ASSESSMENTS — tipo (regular/recuperação) + vínculo a período
-- term_id fica nullable: avaliações já existentes não têm bimestre associado e
-- não entram em nenhum cálculo até serem editadas manualmente (gap aceito, sem
-- migração retroativa de dados).
ALTER TABLE public.assessments
  ADD COLUMN term_id uuid REFERENCES public.academic_terms(id) ON DELETE RESTRICT,
  ADD COLUMN assessment_type text NOT NULL DEFAULT 'regular'
    CHECK (assessment_type IN ('regular', 'recuperacao')),
  ADD COLUMN recovers_term_id uuid REFERENCES public.academic_terms(id) ON DELETE RESTRICT;

-- recovers_term_id é separado de term_id porque a prova de recuperação
-- normalmente acontece depois do fim do bimestre — evita forçar a data da
-- recuperação a cair dentro do range do academic_terms que ela resgata.
ALTER TABLE public.assessments ADD CONSTRAINT assessments_recovery_check CHECK (
  (assessment_type = 'recuperacao' AND recovers_term_id IS NOT NULL)
  OR (assessment_type = 'regular' AND recovers_term_id IS NULL)
);

CREATE INDEX idx_assessments_term_id ON public.assessments(term_id);
CREATE INDEX idx_assessments_recovers_term_id ON public.assessments(recovers_term_id);

-- 3) ACADEMIC_SETTINGS — média mínima de aprovação por organização (padrão 1:1
-- já usado em erp_integration_config). Organização sem linha usa o default 6.0
-- no client (upsert lazy na primeira gravação pela UI de configuração).
CREATE TABLE public.academic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  minimum_passing_average numeric(4,2) NOT NULL DEFAULT 6.0
    CHECK (minimum_passing_average >= 0 AND minimum_passing_average <= 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academic_settings_manage" ON public.academic_settings
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "academic_settings_select" ON public.academic_settings
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_academic_settings_updated_at
  BEFORE UPDATE ON public.academic_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) TERM_RESULTS — resultado final por aluno×disciplina×turma×período,
-- armazenado (não view): é a base do futuro boletim/histórico e da futura
-- fatia de dependência; calculated_at permite ver quando foi recalculado sem
-- perder rastro de alterações retroativas de nota.
CREATE TABLE public.term_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  original_average numeric(5,2) NOT NULL,
  recovery_grade numeric(5,2),
  final_grade numeric(5,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('aprovado', 'progressao_parcial')),
  calculated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(term_id, class_id, subject_id, student_id)
);

ALTER TABLE public.term_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_term_results_organization_id ON public.term_results(organization_id);
CREATE INDEX idx_term_results_term_id ON public.term_results(term_id);
CREATE INDEX idx_term_results_student_id ON public.term_results(student_id);
CREATE INDEX idx_term_results_class_subject ON public.term_results(class_id, subject_id);

-- enrollments.status (ativa/trancada/concluida/transferida) não é tocado —
-- progressão parcial é estado por disciplina dentro de um período, granularidade
-- diferente da matrícula geral. Fica só em term_results.status.
CREATE POLICY "term_results_manage" ON public.term_results
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "term_results_select" ON public.term_results
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_term_results_updated_at
  BEFORE UPDATE ON public.term_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
