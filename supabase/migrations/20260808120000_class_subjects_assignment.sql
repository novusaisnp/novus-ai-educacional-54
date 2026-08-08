-- Fase 3 (Turmas & Horários), primeira fatia: atribuição disciplina↔turma↔professor.
-- Hoje (confirmado por grep antes desta migration) não existe nenhum vínculo formal
-- entre disciplina, turma e professor — profiles.role='professor' é só um valor solto.
-- Qualquer usuário autenticado pode lançar nota/chamada para qualquer combinação
-- turma×disciplina em chamada.tsx/notas.tsx, sem trava de atribuição real. Esta tabela
-- é também pré-requisito de dado real para sala/horário (fatias futuras da Fase 3) —
-- não faz sentido desenhar grade horária sem saber quem leciona o quê em qual turma.
--
-- class_subjects: uma linha por (turma, disciplina) = a "grade curricular" daquela
-- turma. teacher_id é nullable de propósito — permite cadastrar a disciplina na turma
-- antes de definir o professor responsável (fluxo comum: currículo primeiro, alocação
-- de professor depois), e classes existentes (sem nenhuma linha aqui ainda) continuam
-- funcionando sem trava até serem configuradas — ver comentário de fallback no client.

CREATE TABLE public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, subject_id)
);

ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_class_subjects_organization_id ON public.class_subjects(organization_id);
CREATE INDEX idx_class_subjects_class_id ON public.class_subjects(class_id);
CREATE INDEX idx_class_subjects_subject_id ON public.class_subjects(subject_id);
CREATE INDEX idx_class_subjects_teacher_id ON public.class_subjects(teacher_id);

-- Gerir a atribuição (criar/editar/remover) é decisão institucional de quem monta o
-- currículo, mesmo grupo restrito já usado em class_councils_manage — não é
-- lançamento operacional de professor (esse é o próprio uso da tabela, não sua gestão).
CREATE POLICY "class_subjects_manage" ON public.class_subjects
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao'])
  )
  WITH CHECK (organization_id = public.current_org_id());

-- SELECT aberto a qualquer usuário autenticado da organização: professor precisa ler
-- suas próprias atribuições para os filtros de chamada.tsx/notas.tsx funcionarem, e
-- "quem leciona o quê em qual turma" não é dado sensível dentro da própria organização
-- (mesmo raciocínio já usado em class_councils_select).
CREATE POLICY "class_subjects_select" ON public.class_subjects
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_class_subjects_updated_at
  BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
