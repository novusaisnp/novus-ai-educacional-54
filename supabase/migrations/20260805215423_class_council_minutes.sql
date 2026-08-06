-- Ata de conselho de classe digital (Fase 1 — "Somar do MVP"): registra a
-- decisão formal do colegiado sobre cada aluno de uma turma ao final de um
-- academic_term (bimestre/trimestre) — aprovado/progressão parcial/retido.
-- Diferente de term_results (por aluno×disciplina, calculado), a decisão do
-- conselho é sobre o aluno como um todo, redigida pela coordenação/admin.
--
-- class_councils: a ata em si (turma × período), 2 estados (rascunho/
-- concluida — "concluída" já significa assinada e com PDF gerado, mesmo
-- evento atômico do contrato de matrícula).
-- class_council_opinions: parecer + decisão por aluno dentro da ata, sem FK
-- direta pra term_results (um aluno tem N term_results, um por disciplina —
-- o parecer é sobre o aluno como um todo; vínculo é só contextual via
-- student_id/term_id herdado da ata).

CREATE TABLE public.class_councils (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  term_id uuid NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'concluida')),
  signer_name text,
  finalized_by uuid REFERENCES auth.users(id),
  finalized_at timestamptz,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, term_id)
);

ALTER TABLE public.class_councils ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_class_councils_organization_id ON public.class_councils(organization_id);
CREATE INDEX idx_class_councils_class_id ON public.class_councils(class_id);
CREATE INDEX idx_class_councils_term_id ON public.class_councils(term_id);

CREATE POLICY "class_councils_manage" ON public.class_councils
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "class_councils_select" ON public.class_councils
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_class_councils_updated_at
  BEFORE UPDATE ON public.class_councils
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- finalized_at não usa DEFAULT now() (só atua em INSERT) — a finalização é um
-- UPDATE numa linha que já existe em rascunho. Trigger garante timestamp
-- autoritativo do servidor, mesma garantia já usada em enrollment_contracts.
CREATE OR REPLACE FUNCTION public.set_class_council_finalized_at()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'rascunho' AND NEW.status = 'concluida' THEN
    NEW.finalized_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER class_councils_set_finalized_at
  BEFORE UPDATE ON public.class_councils
  FOR EACH ROW EXECUTE FUNCTION public.set_class_council_finalized_at();

CREATE TABLE public.class_council_opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_council_id uuid NOT NULL REFERENCES public.class_councils(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  opinion_text text,
  decision text CHECK (decision IS NULL OR decision IN ('aprovado', 'progressao_parcial', 'retido')),
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_council_id, student_id)
);

ALTER TABLE public.class_council_opinions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_class_council_opinions_organization_id ON public.class_council_opinions(organization_id);
CREATE INDEX idx_class_council_opinions_class_council_id ON public.class_council_opinions(class_council_id);
CREATE INDEX idx_class_council_opinions_student_id ON public.class_council_opinions(student_id);

-- Mesmo grupo restrito de class_councils — o parecer é conteúdo da própria
-- ata oficial, não lançamento operacional tipo nota/chamada (aberto a
-- professor). Decisão de negócio confirmada com o usuário.
CREATE POLICY "class_council_opinions_manage" ON public.class_council_opinions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "class_council_opinions_select" ON public.class_council_opinions
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_class_council_opinions_updated_at
  BEFORE UPDATE ON public.class_council_opinions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
