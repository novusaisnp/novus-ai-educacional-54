-- Fase 1.5 (Educação Inclusiva), primeira fatia: PEI (Plano Educacional
-- Individualizado). Núcleo estruturado — diagnóstico/necessidades, metas,
-- adaptações (como lista, não texto livre — cada item vira um chip
-- individual na UI, mais fácil de aplicar em sala), profissional
-- responsável (nem sempre um usuário do sistema — pode ser terapeuta
-- externo), status ativo/encerrado, datas de início/revisão.
--
-- Laudo médico/psicopedagógico é anexado via `documents` já existente
-- (owner_type='aluno', document_type='laudo') — não duplicado aqui, só
-- referenciado por laudo_document_id quando o usuário já subiu o arquivo.
--
-- Um aluno pode ter mais de um PEI ao longo do tempo (revisão anual gera
-- histórico) — sem UNIQUE(student_id), sem "PEI ativo único" forçado no
-- banco; a UI decide o que mostrar como atual (status='ativo' mais recente).

CREATE TABLE public.student_pei (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  diagnosis text,
  needs text,
  goals text,
  accommodations text[] NOT NULL DEFAULT '{}',
  responsible_professional text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'encerrado')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  review_date date,
  laudo_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_pei ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_student_pei_organization_id ON public.student_pei(organization_id);
CREATE INDEX idx_student_pei_student_id ON public.student_pei(student_id);

-- Conteúdo sensível (diagnóstico/laudo, dado de saúde sob LGPD) — escrita
-- restrita a admin/coordenação, mesmo grupo já usado em class_councils.
-- Leitura aberta a qualquer autenticado da organização, mesmo padrão já
-- usado em `consents` (também dado sensível): professor precisa ver
-- adaptações pra aplicar em sala, sem depender de tela própria de
-- coordenação pra cada consulta.
CREATE POLICY "student_pei_manage" ON public.student_pei
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "student_pei_select" ON public.student_pei
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_student_pei_updated_at
  BEFORE UPDATE ON public.student_pei
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
