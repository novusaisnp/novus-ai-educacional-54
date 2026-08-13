-- Um e-mail é staff OU responsável, nunca os dois.
--
-- Regra de negócio: colaborador da escola usa e-mail corporativo; como
-- responsável (inclusive quando o filho estuda onde ele trabalha), usa e-mail
-- pessoal. Um mesmo login nunca acumula os dois papéis.
--
-- Por que no banco e não só na UI: existem quatro caminhos de escrita para
-- esses papéis — a Edge Function `create-staff-user`, a tela de Entidades, o
-- signup do portal e SQL manual pelo Dashboard. Validação em formulário cobre
-- um; o trigger cobre os quatro.
--
-- A checagem casa por `user_id` E por e-mail. Só `user_id` deixaria passar o
-- caso mais provável: um responsável cadastrado pela secretaria que ainda não
-- criou conta (user_id NULL) e cujo e-mail é depois convidado como colaborador.
--
-- Verificado antes de escrever esta migration: nenhuma linha viola a regra hoje
-- (3 usuários, 2 staff e 1 responsável, sem interseção), então o trigger pode
-- nascer bloqueando tudo, sem exceção para dado legado.

-- Papel EQUIPE em `entidades` não conflita com nada aqui: o cutover
-- 20260811010000 criou uma entidade EQUIPE espelhando cada profile, de
-- propósito. A regra é só sobre RESPONSAVEL.
CREATE OR REPLACE FUNCTION public.email_ja_e_responsavel(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entidades e
    JOIN public.entidade_papeis ep ON ep.entidade_id = e.id
    WHERE ep.papel = 'RESPONSAVEL'
      AND ep.ativo
      AND e.deleted_at IS NULL
      AND (
        (p_user_id IS NOT NULL AND e.user_id = p_user_id)
        OR (p_email IS NOT NULL AND lower(trim(e.email)) = lower(trim(p_email)))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.email_ja_e_staff(p_user_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p_user_id IS NOT NULL AND p.id = p_user_id)
       OR (p_email IS NOT NULL AND lower(trim(p.email)) = lower(trim(p_email)))
  );
$$;

-- Direção 1: virar staff quando já é responsável.
CREATE OR REPLACE FUNCTION public.trg_profile_nao_pode_ser_responsavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.email_ja_e_responsavel(NEW.id, NEW.email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado como responsável e não pode ser usado por um colaborador. Use o e-mail corporativo.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profile_nao_pode_ser_responsavel ON public.profiles;
CREATE TRIGGER profile_nao_pode_ser_responsavel
  BEFORE INSERT OR UPDATE OF id, email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_profile_nao_pode_ser_responsavel();

-- Direção 2: virar responsável quando já é staff. Dois gatilhos porque o papel
-- e a identidade moram em tabelas diferentes: o papel entra por
-- `entidade_papeis`, o vínculo com o login por `entidades.user_id`/`email`.
CREATE OR REPLACE FUNCTION public.trg_responsavel_nao_pode_ser_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  SELECT e.user_id, e.email INTO v_user_id, v_email
  FROM public.entidades e WHERE e.id = NEW.entidade_id;

  IF NEW.papel = 'RESPONSAVEL' AND NEW.ativo AND public.email_ja_e_staff(v_user_id, v_email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado como colaborador da escola e não pode acessar o portal de responsáveis. Cadastre um e-mail pessoal.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS responsavel_nao_pode_ser_staff ON public.entidade_papeis;
CREATE TRIGGER responsavel_nao_pode_ser_staff
  BEFORE INSERT OR UPDATE OF papel, ativo ON public.entidade_papeis
  FOR EACH ROW EXECUTE FUNCTION public.trg_responsavel_nao_pode_ser_staff();

CREATE OR REPLACE FUNCTION public.trg_entidade_user_nao_pode_ser_staff()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.entidade_papeis ep
    WHERE ep.entidade_id = NEW.id AND ep.papel = 'RESPONSAVEL' AND ep.ativo
  ) AND public.email_ja_e_staff(NEW.user_id, NEW.email) THEN
    RAISE EXCEPTION 'Este e-mail já está cadastrado como colaborador da escola e não pode acessar o portal de responsáveis. Cadastre um e-mail pessoal.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entidade_user_nao_pode_ser_staff ON public.entidades;
CREATE TRIGGER entidade_user_nao_pode_ser_staff
  BEFORE INSERT OR UPDATE OF user_id, email ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.trg_entidade_user_nao_pode_ser_staff();

-- 'responsavel' vem do modelo anterior às `entidades`, quando responsável
-- morava em profiles. Com os triggers acima ele deixa de ser alcançável, e
-- mantê-lo no CHECK só convida alguém a recriar o híbrido por SQL — ainda mais
-- porque `m/index.tsx` trata qualquer role não-nula como staff, então um
-- profile 'responsavel' cairia na pele de staff mesmo se marcado ao contrário.
--
-- Os outros quatro valores ficam como estão: 'secretario' (não 'secretaria')
-- já foi acertado em 20260807130000 e bate com o app.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin','coordenacao','professor','secretario'));

-- Dívida do cutover para `entidades`: esta função faz UPDATE em
-- public.guardians, tabela dropada em 20260811010000. O trigger que a chamava
-- já foi removido do auth.users (confirmado no banco), mas a função continuava
-- lá, pronta pra ser religada por engano num INSERT de auth.users.
DROP FUNCTION IF EXISTS public.link_user_to_guardian() CASCADE;
