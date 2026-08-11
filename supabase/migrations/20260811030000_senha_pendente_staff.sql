-- Fluxo de senha temporaria = e-mail pra staff criado via convite (ver
-- create-staff-user) -- Educacional nao tinha equivalente ao pessoa_pendente
-- do ERP. Mesma logica: marca true na criacao/reset, o proprio usuario limpa
-- depois de definir a senha real no login.
ALTER TABLE public.profiles ADD COLUMN senha_pendente boolean NOT NULL DEFAULT false;

-- profiles_manage_org (UPDATE) exige role admin/coordenacao -- um professor/
-- secretario comum nao consegue limpar a propria flag depois de trocar a
-- senha sem essa RPC (mesmo gap ja resolvido no ERP com clear_pessoa_pendente).
CREATE OR REPLACE FUNCTION public.clear_senha_pendente()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.profiles SET senha_pendente = false WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.clear_senha_pendente() TO authenticated;
