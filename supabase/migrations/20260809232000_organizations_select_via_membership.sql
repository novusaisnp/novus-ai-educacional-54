-- organizations_select só permite ver a org ativa (profiles.organization_id) --
-- o seletor de unidade pós-login precisa listar TODAS as orgs vinculadas ao
-- usuário (user_organizations), não só a ativa.
CREATE POLICY "organizations_select_via_membership" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid())
  );
