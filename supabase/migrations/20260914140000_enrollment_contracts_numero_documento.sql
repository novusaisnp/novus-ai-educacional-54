-- Achado real ao testar o portal financeiro do responsavel (2026-09-14, ver
-- novusai-erp: correcao do webhook titulo.liquidado): edu-erp-webhook grava
-- financial_transactions sem NUNCA preencher guardian_id, porque nao ha como
-- casar o pagamento de volta com o responsavel certo -- o numero_documento da
-- mensalidade (formato "MAT-<8 primeiros chars do enrollment_id>") so existia
-- calculado em JS na hora de criar (signEnrollmentContract.ts), nunca
-- persistido em coluna. Todas as parcelas recorrentes de uma mensalidade
-- reusam o MESMO numero_documento no ERP (materializar_recorrencias so muda
-- numero_parcela), entao esta coluna serve pra casar qualquer mes, nao so o
-- primeiro.
ALTER TABLE public.enrollment_contracts
  ADD COLUMN IF NOT EXISTS numero_documento text;

COMMENT ON COLUMN public.enrollment_contracts.numero_documento IS
  'numero_documento do titulo avulso recorrente criado no ERP (Porta 1) para '
  'a mensalidade desta matricula -- usado por edu-erp-webhook para resolver '
  'guardian_id ao processar o evento titulo.liquidado (Porta 2 reversa).';

-- Backfill: mesma formula usada em signEnrollmentContract.ts.
UPDATE public.enrollment_contracts
SET numero_documento = 'MAT-' || upper(left(enrollment_id::text, 8))
WHERE numero_documento IS NULL;

CREATE INDEX IF NOT EXISTS enrollment_contracts_org_numero_documento_idx
  ON public.enrollment_contracts (organization_id, numero_documento)
  WHERE numero_documento IS NOT NULL;
