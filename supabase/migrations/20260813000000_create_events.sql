-- Eventos escolares: staff cadastra, qualquer staff do org ve, familia ve no portal.
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX events_org_date_idx ON public.events (organization_id, event_date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Staff: qualquer papel do org ve; so admin/coordenacao/secretario cria/edita/apaga
-- (mesmo corte de announcements_manage).
CREATE POLICY events_select ON public.events
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

CREATE POLICY events_manage ON public.events
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

-- Portal: responsavel so le os eventos da propria organizacao.
CREATE POLICY events_select_guardian ON public.events
  FOR SELECT
  USING (organization_id = current_guardian_org_id());
