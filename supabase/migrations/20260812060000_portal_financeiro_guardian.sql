-- Portal/app da família nunca conseguiu ver o financeiro, por duas razões
-- independentes — ambas só apareceram no primeiro live-test com login de
-- responsável (2026-08-12):
--
-- 1. erp_integration_config só é legível por staff (current_org_id() lê
--    profiles, e responsável não tem profile). getERPConfig caía no default
--    "desligado" e a tela mostrava "financeiro indisponível" mesmo com o ERP
--    ativo. A tabela guarda signing_secret, então a correção NÃO é abrir a
--    linha pro responsável: é uma função que devolve só o booleano.
--
-- 2. financial_transactions só tinha policy de staff — o responsável não
--    enxergava as próprias mensalidades nem quando chegava a consultar.

CREATE OR REPLACE FUNCTION public.erp_financeiro_ativo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.erp_integration_config c
    WHERE c.organization_id = COALESCE(public.current_org_id(), public.current_guardian_org_id())
      AND c.enabled
      AND NOT c.mock
  );
$$;

REVOKE ALL ON FUNCTION public.erp_financeiro_ativo() FROM public;
GRANT EXECUTE ON FUNCTION public.erp_financeiro_ativo() TO authenticated;

DROP POLICY IF EXISTS financial_transactions_select_guardian ON public.financial_transactions;
CREATE POLICY financial_transactions_select_guardian
  ON public.financial_transactions
  FOR SELECT
  USING (
    organization_id = public.current_guardian_org_id()
    AND guardian_id = public.current_guardian_id()
  );
