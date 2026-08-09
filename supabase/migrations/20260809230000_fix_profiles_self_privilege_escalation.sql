-- A policy "Users can update own profile" (20250815110059) tem FOR UPDATE USING (id = auth.uid())
-- sem WITH CHECK, e current_org_id()/get_current_user_role() leem o valor NOVO da própria linha
-- durante o CHECK (comparação consigo mesma, sempre verdadeira) - RLS sozinho não bloqueia troca
-- de organization_id/role. Trigger com acesso a OLD/NEW é o jeito correto de impedir isso.

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.id AND (
    NEW.organization_id IS DISTINCT FROM OLD.organization_id OR
    NEW.role IS DISTINCT FROM OLD.role
  ) THEN
    RAISE EXCEPTION 'Não é permitido alterar organization_id ou role do próprio perfil diretamente'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_self_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_privilege_escalation();
