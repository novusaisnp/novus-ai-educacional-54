-- Config da integração ERP por organização (sai do localStorage)
CREATE TABLE IF NOT EXISTS public.erp_integration_config (
  organization_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  mock boolean NOT NULL DEFAULT true,
  base_url text,
  signing_secret text,
  empresa_representada_id uuid,
  events jsonb NOT NULL DEFAULT '{"clientUpsert":false,"receivableCreated":false,"paymentWebhook":false}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_integration_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "erp_integration_config_select" ON public.erp_integration_config
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "erp_integration_config_insert" ON public.erp_integration_config
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "erp_integration_config_update" ON public.erp_integration_config
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "erp_integration_config_delete" ON public.erp_integration_config
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- Títulos/pagamentos recebidos do ERP (Porta 2 - Liquidação)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  guardian_id uuid REFERENCES public.guardians(id),
  external_id text,
  numero_documento text,
  description text,
  amount numeric,
  due_date date,
  payment_date date,
  payment_method text,
  status text NOT NULL DEFAULT 'aberto', -- aberto, pago, parcial, vencido, cancelado
  raw_event jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financial_transactions_select" ON public.financial_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "financial_transactions_insert" ON public.financial_transactions
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "financial_transactions_update" ON public.financial_transactions
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "financial_transactions_delete" ON public.financial_transactions
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE INDEX IF NOT EXISTS idx_financial_transactions_organization_id ON public.financial_transactions(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_transactions_org_external ON public.financial_transactions(organization_id, external_id) WHERE external_id IS NOT NULL;
