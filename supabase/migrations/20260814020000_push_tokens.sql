-- Push (FCM). Um token por device; `user_id` é quem recebe — é ele que vai no
-- `notification_queue.recipient` quando channel='push'.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON public.push_tokens (user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- RLS ligado sem policy é o bug recorrente nº1 deste schema — as duas abaixo
-- são explícitas. O dispatcher roda com service_role e ignora RLS.
DROP POLICY IF EXISTS push_tokens_own ON public.push_tokens;
CREATE POLICY push_tokens_own ON public.push_tokens
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS push_tokens_select_staff ON public.push_tokens;
CREATE POLICY push_tokens_select_staff ON public.push_tokens
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

-- 'push' passa a ser canal válido nas 3 tabelas do pipeline de notificação.
ALTER TABLE public.notification_queue DROP CONSTRAINT IF EXISTS notification_queue_channel_check;
ALTER TABLE public.notification_queue ADD CONSTRAINT notification_queue_channel_check
  CHECK (channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'push'::text]));

ALTER TABLE public.notification_templates DROP CONSTRAINT IF EXISTS notification_templates_channel_check;
ALTER TABLE public.notification_templates ADD CONSTRAINT notification_templates_channel_check
  CHECK (channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'push'::text]));

ALTER TABLE public.contact_consents DROP CONSTRAINT IF EXISTS contact_consents_channel_check;
ALTER TABLE public.contact_consents ADD CONSTRAINT contact_consents_channel_check
  CHECK (channel = ANY (ARRAY['email'::text, 'whatsapp'::text, 'push'::text]));
