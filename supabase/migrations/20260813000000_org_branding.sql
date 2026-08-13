-- A logo da empresa representada tem que aparecer em todo ambiente (desktop,
-- portal e app), mas quem monta essa URL depende de duas tabelas que o
-- responsável não enxerga: organizations (policies via profiles/user_organizations,
-- ambas staff-only) e erp_integration_config (staff-only, e guarda o
-- signing_secret, que não pode vazar pro cliente).
--
-- Esta função devolve só o que é público de fato — nome, logo local e os dois
-- campos necessários pra montar a URL da logo no ERP — pra qualquer usuário
-- autenticado da organização, seja staff ou responsável.

CREATE OR REPLACE FUNCTION public.org_branding()
RETURNS TABLE (
  organization_id uuid,
  name text,
  logo_url text,
  erp_base_url text,
  empresa_representada_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
  SELECT
    o.id,
    o.name,
    o.logo_url,
    CASE WHEN c.enabled THEN c.base_url END,
    CASE WHEN c.enabled THEN c.empresa_representada_id END
  FROM public.organizations o
  LEFT JOIN public.erp_integration_config c ON c.organization_id = o.id
  WHERE o.id = COALESCE(public.current_org_id(), public.current_guardian_org_id());
$$;

REVOKE ALL ON FUNCTION public.org_branding() FROM public;
GRANT EXECUTE ON FUNCTION public.org_branding() TO authenticated;
