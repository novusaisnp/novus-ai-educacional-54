-- Revogação de acesso (Porta 0.2). Para revogar de verdade não basta apagar o vínculo em
-- user_organizations: current_org_id() lia profiles.organization_id sozinho, então um
-- usuário sem vínculo nenhum continuava passando em toda a RLS (dezenas de policies do
-- formato `organization_id = current_org_id() AND get_current_user_role() = ANY(...)`).
--
-- Fix na raiz, não por tabela: current_org_id() passa a exigir que o vínculo exista.
-- profiles continua sendo "unidade/cargo ativos agora"; user_organizations vira a
-- autoridade sobre *poder ou não* estar naquela unidade.

-- 1) Backfill defensivo. O backfill original (20260809231500) cobriu o que existia
-- naquele momento, mas `create_admin_user` e `centelha-provisiona-organizacao` criavam
-- profile sem vínculo — essas contas seriam trancadas fora pelo passo 2. As duas
-- funções foram corrigidas no mesmo commit; isto recupera quem já foi criado por elas.
INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT p.id, p.organization_id, p.role
  FROM public.profiles p
 WHERE p.organization_id IS NOT NULL
   AND p.role IN ('admin','coordenacao','professor','secretario','responsavel')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 2) O vínculo passa a ser condição. Sem linha em user_organizations para a organização
-- ativa, current_org_id() retorna NULL e toda a RLS fecha junto — é isso que faz a
-- revogação valer sem tocar em nenhuma policy.
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
  SELECT p.organization_id
  FROM public.profiles p
  JOIN public.user_organizations uo
    ON uo.user_id = p.id
   AND uo.organization_id = p.organization_id
  WHERE p.id = auth.uid()
  LIMIT 1;
$function$;

COMMENT ON FUNCTION public.current_org_id() IS
  'Organização ativa do usuário, válida somente enquanto existir o vínculo correspondente em user_organizations. Apagar o vínculo revoga o acesso em toda a RLS.';
