
-- Criar tabelas para sistema de notificações

-- Tabela para fila de notificações
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  template_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed', 'skipped')),
  error TEXT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para entregas de notificações
CREATE TABLE public.notification_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  queue_id UUID NOT NULL REFERENCES public.notification_queue(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  details JSONB DEFAULT '{}',
  provider_message_id TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para templates de notificações
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  event_type TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  subject TEXT NULL,
  body_md TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, channel, event_type, version)
);

-- Tabela para consentimentos de contato
CREATE TABLE public.contact_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('guardian', 'staff')),
  owner_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  allowed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, owner_type, owner_id, channel)
);

-- RLS para notification_queue
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_queue_secure_access" 
  ON public.notification_queue 
  FOR ALL 
  USING (is_authenticated() AND organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

-- RLS para notification_deliveries
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_deliveries_secure_access" 
  ON public.notification_deliveries 
  FOR ALL 
  USING (is_authenticated() AND organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

-- RLS para notification_templates
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_templates_secure_access" 
  ON public.notification_templates 
  FOR ALL 
  USING (is_authenticated() AND organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

-- RLS para contact_consents
ALTER TABLE public.contact_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_consents_secure_access" 
  ON public.contact_consents 
  FOR ALL 
  USING (is_authenticated() AND organization_id = current_org_id())
  WITH CHECK (organization_id = current_org_id());

-- Triggers para updated_at
CREATE TRIGGER update_notification_queue_updated_at 
  BEFORE UPDATE ON public.notification_queue 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_notification_deliveries_updated_at 
  BEFORE UPDATE ON public.notification_deliveries 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON public.notification_templates 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TRIGGER update_contact_consents_updated_at 
  BEFORE UPDATE ON public.contact_consents 
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
