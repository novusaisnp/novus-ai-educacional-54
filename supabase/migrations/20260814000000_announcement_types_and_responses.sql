-- Mural vira feed tipado: aviso, foto, autorização e enquete não são 4 telas,
-- são 4 tipos de card no mesmo feed (modelo Agenda Edu). Fotos reusam
-- `documents` com owner_type='announcement' — nada de tabela nova pra isso.
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'aviso',
  ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.announcements
  DROP CONSTRAINT IF EXISTS announcements_type_check;

ALTER TABLE public.announcements
  ADD CONSTRAINT announcements_type_check
  CHECK (type IN ('aviso', 'foto', 'autorizacao', 'enquete'));

-- Resposta da família a um post: serve autorização (assinada) E enquete
-- (opção escolhida) — a diferença mora no jsonb, não em duas tabelas.
CREATE TABLE IF NOT EXISTS public.announcement_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.entidades(id),
  student_id UUID REFERENCES public.students(id),
  response JSONB NOT NULL DEFAULT '{}'::jsonb,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UNIQUE obrigatória: o upsert do app usa
  -- onConflict: 'announcement_id,guardian_id'. Sem constraint real batendo
  -- exatamente com essa lista, o PostgREST devolve 42P10 escondido atrás de
  -- um toast genérico (armadilha recorrente deste repo).
  CONSTRAINT announcement_responses_unique UNIQUE (announcement_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS announcement_responses_announcement_idx
  ON public.announcement_responses (announcement_id);

ALTER TABLE public.announcement_responses ENABLE ROW LEVEL SECURITY;

-- RLS sem policy é o bug nº1 deste schema; as 3 abaixo são explícitas.
DROP POLICY IF EXISTS announcement_responses_select_staff ON public.announcement_responses;
CREATE POLICY announcement_responses_select_staff ON public.announcement_responses
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

DROP POLICY IF EXISTS announcement_responses_select_guardian ON public.announcement_responses;
CREATE POLICY announcement_responses_select_guardian ON public.announcement_responses
  FOR SELECT
  USING (
    organization_id = current_guardian_org_id()
    AND guardian_id IN (SELECT id FROM public.entidades WHERE user_id = auth.uid())
  );

-- Responsável escreve/atualiza só a própria resposta.
DROP POLICY IF EXISTS announcement_responses_write_guardian ON public.announcement_responses;
CREATE POLICY announcement_responses_write_guardian ON public.announcement_responses
  FOR ALL
  USING (
    organization_id = current_guardian_org_id()
    AND guardian_id IN (SELECT id FROM public.entidades WHERE user_id = auth.uid())
  )
  WITH CHECK (
    organization_id = current_guardian_org_id()
    AND guardian_id IN (SELECT id FROM public.entidades WHERE user_id = auth.uid())
  );
