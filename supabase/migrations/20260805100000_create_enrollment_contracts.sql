-- Contrato de matrícula com assinatura eletrônica simples (nome digitado + aceite +
-- hash SHA-256 do texto do contrato + timestamp autoritativo do Postgres via
-- DEFAULT now()) e o PDF gerado fica anexado via `documents` (owner_type='student',
-- tag 'contrato_matricula'). Sem provedor externo de assinatura (Clicksign/D4Sign/
-- DocuSign) e sem vínculo com "Contrato" formal no ERP — decisão consciente: o
-- endpoint `sync-webhook` do novusai-erp tem 2 bugs reais e bloqueantes hoje
-- (syncContrato nunca popula a coluna NOT NULL `titulo`; syncFinanceiro nunca
-- mapeia `recorrente`/`periodicidade`), fora do escopo deste repo corrigir agora.
-- O texto do contrato em si é fixado no front (buildContractText em
-- src/features/secretaria/lib/enrollmentContractTemplate.ts) e sua versão é
-- gravada em `contract_version` — sem tabela de templates nesta fatia (YAGNI: só
-- há 1 template hoje).
--
-- is_recurring/recurrence_period/erp_contract_id existem desde já como ganchos de
-- forward-compatibility: quando os 2 bugs do novusai-erp forem corrigidos, ativar
-- recorrência automática e vínculo com Contrato formal no ERP não deve exigir
-- migration nova, só passar a popular esses campos de verdade.

CREATE TABLE public.enrollment_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id uuid REFERENCES public.guardians(id) ON DELETE SET NULL,

  contract_version text NOT NULL DEFAULT 'novus-matricula-v1',
  contract_text text NOT NULL,
  contract_hash text NOT NULL,

  monthly_fee_amount numeric(10,2) NOT NULL CHECK (monthly_fee_amount > 0),
  due_day smallint NOT NULL CHECK (due_day BETWEEN 1 AND 28),

  is_recurring boolean NOT NULL DEFAULT true,
  recurrence_period text NOT NULL DEFAULT 'MENSAL',
  erp_contract_id text,

  signer_name text NOT NULL,
  signer_accepted_terms boolean NOT NULL DEFAULT false CHECK (signer_accepted_terms IS TRUE),
  signed_at timestamptz NOT NULL DEFAULT now(),

  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,

  erp_receivable_status text NOT NULL DEFAULT 'pending'
    CHECK (erp_receivable_status IN ('pending','ok','skipped','mock','error')),
  erp_receivable_error text,
  erp_receivable_synced_at timestamptz,

  status text NOT NULL DEFAULT 'assinado' CHECK (status IN ('assinado','cancelado')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (enrollment_id)
);

ALTER TABLE public.enrollment_contracts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_enrollment_contracts_org ON public.enrollment_contracts(organization_id);
CREATE INDEX idx_enrollment_contracts_student ON public.enrollment_contracts(student_id);

CREATE POLICY "enrollment_contracts_manage" ON public.enrollment_contracts
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "enrollment_contracts_select" ON public.enrollment_contracts
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_enrollment_contracts_updated_at
  BEFORE UPDATE ON public.enrollment_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
