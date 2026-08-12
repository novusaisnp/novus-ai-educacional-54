ALTER TABLE public.organizations
  ADD COLUMN settings jsonb NOT NULL DEFAULT '{}'::jsonb;
