-- Mural de avisos: staff posta, família vê no portal (só leitura, sem push).
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX announcements_org_created_idx ON public.announcements (organization_id, created_at DESC);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Staff: qualquer papel do org vê; só admin/coordenacao/secretario cria/edita/apaga.
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

CREATE POLICY announcements_manage ON public.announcements
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

-- Portal: responsável só lê os avisos da própria organização.
CREATE POLICY announcements_select_guardian ON public.announcements
  FOR SELECT
  USING (organization_id = current_guardian_org_id());
