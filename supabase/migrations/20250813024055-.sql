-- SECRETARIA - Migração completa com RLS e índices
-- Helper function (idempotente)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.organization_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- 1) UNIDADES (campi/filiais)
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  address jsonb, -- {street, number, district, city, state, zip}
  phone text,
  email text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) SEGMENTOS (Edu Infantil, Fund I, Fund II, Médio)
CREATE TABLE IF NOT EXISTS public.segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,
  code text,
  order_index int DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) SÉRIES (Ano/Série dentro do Segmento)
CREATE TABLE IF NOT EXISTS public.series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  segment_id uuid NOT NULL REFERENCES public.segments(id) ON DELETE RESTRICT,
  name text NOT NULL, -- ex.: 5º Ano
  code text,
  order_index int DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) PERÍODOS LETIVOS
CREATE TABLE IF NOT EXISTS public.periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  name text NOT NULL,    -- ex.: 2025, 1º Sem/2025
  year int NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) VISITANTES
CREATE TABLE IF NOT EXISTS public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  full_name text NOT NULL,
  document text,    -- RG/CPF/Passaporte
  phone text,
  email text,
  relation text,    -- motivo/parentesco
  visit_date timestamptz NOT NULL DEFAULT now(),
  purpose text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6) RESERVAS DE VAGA (lista de espera)
CREATE TABLE IF NOT EXISTS public.waitlist_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  student_full_name text NOT NULL,
  birth_date date,
  guardian_name text,
  guardian_phone text,
  desired_segment_id uuid REFERENCES public.segments(id),
  desired_series_id uuid REFERENCES public.series(id),
  desired_year int,
  status text NOT NULL DEFAULT 'pendente', -- pendente, aprovada, recusada, convertida
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) SOLICITAÇÕES (pedidos gerais à secretaria)
CREATE TABLE IF NOT EXISTS public.requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  request_type text NOT NULL,  -- declaração, histórico, 2ª via, etc.
  requester_type text NOT NULL, -- student|guardian|other
  requester_id uuid,           -- opcional (student_id/guardian_id)
  payload jsonb,               -- dados extras
  status text NOT NULL DEFAULT 'aberta', -- aberta, em_andamento, concluida, recusada
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as novas tabelas
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies explícitas para todas as tabelas
-- UNITS
CREATE POLICY "units_select" ON public.units
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "units_insert" ON public.units
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "units_update" ON public.units
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "units_delete" ON public.units
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- SEGMENTS
CREATE POLICY "segments_select" ON public.segments
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "segments_insert" ON public.segments
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "segments_update" ON public.segments
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "segments_delete" ON public.segments
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- SERIES
CREATE POLICY "series_select" ON public.series
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "series_insert" ON public.series
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "series_update" ON public.series
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "series_delete" ON public.series
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- PERIODS
CREATE POLICY "periods_select" ON public.periods
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "periods_insert" ON public.periods
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "periods_update" ON public.periods
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "periods_delete" ON public.periods
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- VISITORS
CREATE POLICY "visitors_select" ON public.visitors
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "visitors_insert" ON public.visitors
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "visitors_update" ON public.visitors
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "visitors_delete" ON public.visitors
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- WAITLIST_APPLICATIONS
CREATE POLICY "waitlist_applications_select" ON public.waitlist_applications
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "waitlist_applications_insert" ON public.waitlist_applications
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "waitlist_applications_update" ON public.waitlist_applications
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "waitlist_applications_delete" ON public.waitlist_applications
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- REQUESTS
CREATE POLICY "requests_select" ON public.requests
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "requests_insert" ON public.requests
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "requests_update" ON public.requests
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "requests_delete" ON public.requests
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_units_organization_id ON public.units(organization_id);
CREATE INDEX IF NOT EXISTS idx_segments_organization_id ON public.segments(organization_id);
CREATE INDEX IF NOT EXISTS idx_series_organization_id ON public.series(organization_id);
CREATE INDEX IF NOT EXISTS idx_series_segment_id ON public.series(segment_id);
CREATE INDEX IF NOT EXISTS idx_periods_organization_id ON public.periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitors_organization_id ON public.visitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_organization_id ON public.waitlist_applications(organization_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_segment_id ON public.waitlist_applications(desired_segment_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_applications_series_id ON public.waitlist_applications(desired_series_id);
CREATE INDEX IF NOT EXISTS idx_requests_organization_id ON public.requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON public.requests(created_by);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['units','segments','series','periods','visitors','waitlist_applications','requests']
  LOOP
    EXECUTE format('
      CREATE TRIGGER IF NOT EXISTS update_%1$s_updated_at
      BEFORE UPDATE ON public.%1$s
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    ', t);
  END LOOP;
END$$;