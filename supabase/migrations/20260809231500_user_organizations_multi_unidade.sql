-- Fase 2: uma pessoa pode ter acesso a mais de uma unidade (CNPJ/tenant diferente
-- no ERP). Backbone multi-tenant existente (profiles.organization_id + current_org_id(),
-- usado por quase toda RLS) não é trocado -- blast radius grande demais. profiles
-- passa a significar "unidade/cargo ativos agora"; user_organizations guarda todos
-- os vínculos. Trocar de unidade é sempre via RPC controlada (switch_active_organization),
-- nunca um UPDATE direto do client.

CREATE TABLE public.user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin','coordenacao','professor','secretario','responsavel')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships" ON public.user_organizations
  FOR SELECT USING (user_id = auth.uid());

-- Backfill: todo profile existente vira 1 vínculo (comportamento hoje é 1:1, sem regressão).
INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT id, organization_id, role FROM public.profiles
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- RPC controlada de troca de unidade: só reatribui profiles.organization_id/role
-- pra um vínculo que já existe em user_organizations.
CREATE OR REPLACE FUNCTION public.switch_active_organization(p_organization_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.user_organizations
   WHERE user_id = auth.uid() AND organization_id = p_organization_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Usuário não tem vínculo com esta organização' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.allow_org_switch', 'true', true);
  UPDATE public.profiles SET organization_id = p_organization_id, role = v_role WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.switch_active_organization(uuid) TO authenticated;

-- Válvula de escape na trigger de auto-escalação (20260809230000): a RPC acima seta
-- app.allow_org_switch antes do UPDATE; um client direto não tem como setar essa GUC
-- (PostgREST não expõe set_config pro caller), então continua bloqueado como antes.
CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id
     AND coalesce(current_setting('app.allow_org_switch', true), '') <> 'true'
     AND (
       NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
       NEW.role IS DISTINCT FROM OLD.role
     ) THEN
    RAISE EXCEPTION 'Não é permitido alterar organization_id ou role do próprio perfil diretamente'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
