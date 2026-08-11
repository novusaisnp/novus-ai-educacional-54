-- Cadastro Unificado de Entidades — Fase 6 (Educacional)
-- Ordem: Visitantes (zero FK) -> Equipe (aditivo) -> Responsaveis (cutover real).
-- Ver C:\Users\maxwe\.claude\plans\tranquil-growing-zephyr.md

-- ===== 1. VISITANTES =====
-- visitors tinha 0 linhas em producao (confirmado antes desta migration) e
-- nenhuma FK dependente (documents/interactions/consents/requests usam pares
-- *_type/*_id em texto solto, sem CHECK que aceite 'visitor' hoje) -- drop direto.
-- v_leads/v_interactions/v_demandas dependem de visitors/guardians e nao tem
-- nenhum consumidor real no codigo (so aparecem no types.ts gerado) -- CASCADE
-- e coerente com o corte seco ja decidido, nao sobra view legada quebrada.
DROP TABLE IF EXISTS public.visitors CASCADE;

-- ===== 2. EQUIPE (aditivo) =====
-- profiles.id É auth.users.id (RLS inteiro depende disso via current_org_id())
-- -- entidade_id é só um vinculo novo, nao troca identidade nenhuma.
ALTER TABLE public.profiles ADD COLUMN entidade_id uuid REFERENCES public.entidades(id);

DO $$
DECLARE
  r record;
  v_entidade_id uuid;
BEGIN
  FOR r IN SELECT id, organization_id, full_name, cpf, email FROM public.profiles WHERE organization_id IS NOT NULL LOOP
    INSERT INTO public.entidades (organization_id, tipo_pessoa, nome, cpf, email, ativo)
    VALUES (r.organization_id, 'PF', r.full_name, r.cpf, r.email, true)
    RETURNING id INTO v_entidade_id;

    INSERT INTO public.entidade_papeis (entidade_id, organization_id, papel, ativo)
    VALUES (v_entidade_id, r.organization_id, 'EQUIPE', true);

    UPDATE public.profiles SET entidade_id = v_entidade_id WHERE id = r.id;
  END LOOP;
END $$;

-- ===== 3. RESPONSAVEIS (cutover real) =====
-- Preserva o id original de guardians -> zero reescrita nas FKs dependentes
-- (student_guardians/attendance_justifications/enrollment_contracts/financial_transactions
-- so trocam o alvo da FK, nao o valor da coluna). Sem colisao de CPF com Equipe
-- confirmada antes desta migration (profiles.cpf era null na unica linha real).
INSERT INTO public.entidades (id, organization_id, tipo_pessoa, nome, cpf, email, telefone, user_id, ativo, created_at, updated_at)
SELECT g.id, g.organization_id, 'PF', g.name, g.cpf, g.email, g.phone, g.user_id, true, g.created_at, g.updated_at
FROM public.guardians g;

INSERT INTO public.entidade_papeis (entidade_id, organization_id, papel, dados_papel, ativo)
SELECT g.id, g.organization_id, 'RESPONSAVEL',
  CASE WHEN g.relationship IS NOT NULL THEN jsonb_build_object('relationship', g.relationship) ELSE NULL END,
  true
FROM public.guardians g;

-- Retarget de FK: mantém o nome da coluna guardian_id (padrão já usado na Fase 2
-- do ERP -- menor raio de mudança em código, o id já é o mesmo valor).
ALTER TABLE public.student_guardians DROP CONSTRAINT student_guardians_guardian_id_fkey;
ALTER TABLE public.student_guardians ADD CONSTRAINT student_guardians_guardian_id_fkey
  FOREIGN KEY (guardian_id) REFERENCES public.entidades(id) ON DELETE CASCADE;

ALTER TABLE public.attendance_justifications DROP CONSTRAINT attendance_justifications_guardian_id_fkey;
ALTER TABLE public.attendance_justifications ADD CONSTRAINT attendance_justifications_guardian_id_fkey
  FOREIGN KEY (guardian_id) REFERENCES public.entidades(id) ON DELETE CASCADE;

ALTER TABLE public.enrollment_contracts DROP CONSTRAINT enrollment_contracts_guardian_id_fkey;
ALTER TABLE public.enrollment_contracts ADD CONSTRAINT enrollment_contracts_guardian_id_fkey
  FOREIGN KEY (guardian_id) REFERENCES public.entidades(id) ON DELETE SET NULL;

ALTER TABLE public.financial_transactions DROP CONSTRAINT financial_transactions_guardian_id_fkey;
ALTER TABLE public.financial_transactions ADD CONSTRAINT financial_transactions_guardian_id_fkey
  FOREIGN KEY (guardian_id) REFERENCES public.entidades(id);

-- current_guardian_id()/current_guardian_org_id() liam guardians.user_id direto
-- -- agora leem entidades+entidade_papeis papel RESPONSAVEL ativo. Mesma
-- assinatura, mesmos nomes: nenhuma policy que os chama precisa mudar.
CREATE OR REPLACE FUNCTION public.current_guardian_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$
  SELECT e.id
  FROM public.entidades e
  JOIN public.entidade_papeis ep ON ep.entidade_id = e.id AND ep.papel = 'RESPONSAVEL' AND ep.ativo = true
  WHERE e.user_id = auth.uid()
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.current_guardian_org_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $function$
  SELECT e.organization_id
  FROM public.entidades e
  WHERE e.id = public.current_guardian_id();
$function$;

-- Portal (guardian) precisa ler seu próprio papel/dados_papel (relationship)
-- direto, sem passar pelas funcoes SECURITY DEFINER acima -- mesma logica de
-- entidades_select_own criada na Fase 5.
CREATE POLICY "entidade_papeis_select_own" ON public.entidade_papeis
  FOR SELECT TO authenticated
  USING (entidade_id IN (SELECT id FROM public.entidades WHERE user_id = auth.uid()));

DROP TABLE public.guardians CASCADE;
