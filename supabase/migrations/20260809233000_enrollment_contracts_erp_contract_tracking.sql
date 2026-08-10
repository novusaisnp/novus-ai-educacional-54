-- Rastreio do sync de Contrato pro ERP (Porta 1) — mesmo padrão de
-- erp_receivable_status/erp_receivable_error/erp_receivable_synced_at já
-- existentes nesta tabela. `erp_contract_id` já existe desde a criação da
-- tabela (gancho de forward-compat, comentário original da migration
-- 20260805100000), só passa a ser populado agora.
ALTER TABLE public.enrollment_contracts
  ADD COLUMN IF NOT EXISTS erp_contract_status text NOT NULL DEFAULT 'pending'
    CHECK (erp_contract_status IN ('pending','ok','skipped','mock','error')),
  ADD COLUMN IF NOT EXISTS erp_contract_error text,
  ADD COLUMN IF NOT EXISTS erp_contract_synced_at timestamptz;
