
-- Migration: Sistema de Notificações Omnicanal + Templates + Consentimentos LGPD
-- Criado: 2025-01-21

-- 1. Templates de notificação por organização
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  event_type text NOT NULL, -- e.g. 'erp.receivable_due', 'docs.pending', 'crm.request_update', 'acad.absence_alert', 'acad.grade_published'
  name text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  subject text,           -- para email
  body_md text NOT NULL,  -- markdown com placeholders: {{name}}, {{link}}, {{amount}}, etc.
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, channel, event_type, version)
);

-- 2. Fila de notificações para envio
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  event_type text NOT NULL,
  recipient text NOT NULL,     -- email ou telefone E.164
  payload jsonb NOT NULL,      -- dados para merge no template (ex: {name, link, amount})
  template_id uuid REFERENCES public.notification_templates(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','skipped')),
  error text,
  scheduled_for timestamp with time zone DEFAULT now(),
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Log de entregas (imutável para auditoria)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  queue_id uuid NOT NULL REFERENCES public.notification_queue(id),
  provider_message_id text,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped','delivered','bounced','read')),
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Consentimentos de contato (LGPD)
CREATE TABLE IF NOT EXISTS public.contact_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  owner_type text NOT NULL CHECK (owner_type IN ('guardian','staff')),
  owner_id uuid NOT NULL,      -- id do guardian/staff
  channel text NOT NULL CHECK (channel IN ('email','whatsapp')),
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (organization_id, owner_type, owner_id, channel)
);

-- 5. Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  -- Adicionar triggers se não existirem
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_templates_updated_at') THEN
    CREATE TRIGGER update_notification_templates_updated_at 
      BEFORE UPDATE ON public.notification_templates 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notification_queue_updated_at') THEN
    CREATE TRIGGER update_notification_queue_updated_at 
      BEFORE UPDATE ON public.notification_queue 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contact_consents_updated_at') THEN
    CREATE TRIGGER update_contact_consents_updated_at 
      BEFORE UPDATE ON public.contact_consents 
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 6. Habilitar RLS em todas as tabelas
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_consents ENABLE ROW LEVEL SECURITY;

-- 7. Políticas RLS por organização
DO $$
BEGIN
  -- Templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'templates_select_org' AND tablename = 'notification_templates') THEN
    CREATE POLICY "templates_select_org" ON public.notification_templates
    FOR SELECT USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'templates_write_org' AND tablename = 'notification_templates') THEN
    CREATE POLICY "templates_write_org" ON public.notification_templates
    FOR ALL USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
      AND public.get_current_user_role() = ANY(ARRAY['admin', 'coordenacao'])
    )
    WITH CHECK (organization_id = public.current_org_id());
  END IF;

  -- Queue
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'queue_select_org' AND tablename = 'notification_queue') THEN
    CREATE POLICY "queue_select_org" ON public.notification_queue
    FOR SELECT USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'queue_write_org' AND tablename = 'notification_queue') THEN
    CREATE POLICY "queue_write_org" ON public.notification_queue
    FOR ALL USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
    )
    WITH CHECK (organization_id = public.current_org_id());
  END IF;

  -- Deliveries (apenas leitura)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'deliveries_select_org' AND tablename = 'notification_deliveries') THEN
    CREATE POLICY "deliveries_select_org" ON public.notification_deliveries
    FOR SELECT USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'deliveries_insert_system' AND tablename = 'notification_deliveries') THEN
    CREATE POLICY "deliveries_insert_system" ON public.notification_deliveries
    FOR INSERT WITH CHECK (organization_id = public.current_org_id());
  END IF;

  -- Consents
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'consents_select_org' AND tablename = 'contact_consents') THEN
    CREATE POLICY "consents_select_org" ON public.contact_consents
    FOR SELECT USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'consents_write_org' AND tablename = 'contact_consents') THEN
    CREATE POLICY "consents_write_org" ON public.contact_consents
    FOR ALL USING (
      auth.uid() IS NOT NULL 
      AND organization_id = public.current_org_id()
    )
    WITH CHECK (organization_id = public.current_org_id());
  END IF;
END$$;

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_org_channel_event 
ON public.notification_templates (organization_id, channel, event_type, is_active);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status_scheduled 
ON public.notification_queue (status, scheduled_for) WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_notification_queue_org_status 
ON public.notification_queue (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_queue_status 
ON public.notification_deliveries (queue_id, status);

CREATE INDEX IF NOT EXISTS idx_contact_consents_owner_channel 
ON public.contact_consents (organization_id, owner_type, owner_id, channel);

-- 9. Templates padrão para começar
INSERT INTO public.notification_templates (organization_id, channel, event_type, name, subject, body_md)
SELECT 
  o.id as organization_id,
  'email' as channel,
  'erp.receivable_due' as event_type,
  'Cobrança em Vencimento' as name,
  'Mensalidade em vencimento - {{student_name}}' as subject,
  E'Olá **{{guardian_name}}**!\n\nA mensalidade do(a) aluno(a) **{{student_name}}** está vencendo em {{due_date}}.\n\n**Valor:** {{amount}}\n\n[Acesse o Portal do Responsável]({{link}}) para efetuar o pagamento.\n\nAtenciosamente,\n{{organization_name}}' as body_md
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates nt 
  WHERE nt.organization_id = o.id 
    AND nt.channel = 'email' 
    AND nt.event_type = 'erp.receivable_due'
);

-- Template para documentos pendentes
INSERT INTO public.notification_templates (organization_id, channel, event_type, name, subject, body_md)
SELECT 
  o.id as organization_id,
  'email' as channel,
  'docs.pending' as event_type,
  'Documentos Pendentes' as name,
  'Documentos pendentes - {{student_name}}' as subject,
  E'Olá **{{guardian_name}}**!\n\nTemos documentos pendentes para o(a) aluno(a) **{{student_name}}**.\n\n**Documentos necessários:**\n{{document_list}}\n\n[Acesse o Portal do Responsável]({{link}}) para fazer o upload dos documentos.\n\nAtenciosamente,\n{{organization_name}}' as body_md
FROM public.organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates nt 
  WHERE nt.organization_id = o.id 
    AND nt.channel = 'email' 
    AND nt.event_type = 'docs.pending'
);
