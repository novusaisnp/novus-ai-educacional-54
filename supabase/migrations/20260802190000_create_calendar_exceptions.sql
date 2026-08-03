CREATE TABLE IF NOT EXISTS public.calendar_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  date date NOT NULL,
  type text NOT NULL CHECK (type IN ('feriado','recesso','reposicao')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, date)
);

ALTER TABLE public.calendar_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_exceptions_select" ON public.calendar_exceptions
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "calendar_exceptions_insert" ON public.calendar_exceptions
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "calendar_exceptions_update" ON public.calendar_exceptions
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "calendar_exceptions_delete" ON public.calendar_exceptions
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_calendar_exceptions_organization_id ON public.calendar_exceptions(organization_id);

CREATE TRIGGER update_calendar_exceptions_updated_at
  BEFORE UPDATE ON public.calendar_exceptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
