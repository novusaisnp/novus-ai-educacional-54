-- Cadastro Unificado de Entidades — Fase 5 (Educacional)
-- Schema enxuto (não é cópia do ERP): Educacional é push-only pro ERP
-- (decisão do usuário) — só persiste localmente o essencial que FKs locais
-- usam. Papéis-alvo: RESPONSAVEL, VISITANTE, EQUIPE. Ver
-- C:\Users\maxwe\.claude\plans\tranquil-growing-zephyr.md pro plano completo.

CREATE TABLE public.entidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tipo_pessoa varchar NOT NULL DEFAULT 'PF' CHECK (tipo_pessoa IN ('PF','PJ')),
  nome text NOT NULL,
  cpf text,
  documento_outro text,
  email text,
  telefone text,
  user_id uuid REFERENCES auth.users(id),
  ativo boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_entidades_org ON public.entidades(organization_id);
CREATE INDEX idx_entidades_cpf ON public.entidades(organization_id, cpf) WHERE cpf IS NOT NULL;
CREATE INDEX idx_entidades_user ON public.entidades(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entidades TO authenticated;
ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entidades_manage" ON public.entidades
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin','coordenacao','secretario']))
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "entidades_select" ON public.entidades
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

CREATE POLICY "entidades_select_own" ON public.entidades
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_entidades_updated_at
  BEFORE UPDATE ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- papeis_catalogo: mesmo padrão do ERP — regra de PF/PJ por papel vive aqui,
-- não hardcoded em formulário. Todos PF hoje (nenhum papel atual precisa de
-- PJ), mas a coluna existe pra um papel futuro tipo "Paciente" poder usar.
CREATE TABLE public.papeis_catalogo (
  codigo varchar PRIMARY KEY,
  nome_exibicao varchar NOT NULL,
  tipo_pessoa_permitido varchar NOT NULL CHECK (tipo_pessoa_permitido IN ('PF','PJ','AMBOS')),
  ativo boolean NOT NULL DEFAULT true
);

INSERT INTO public.papeis_catalogo (codigo, nome_exibicao, tipo_pessoa_permitido) VALUES
  ('RESPONSAVEL', 'Responsável', 'PF'),
  ('VISITANTE', 'Visitante', 'PF'),
  ('EQUIPE', 'Equipe', 'PF');

GRANT SELECT ON public.papeis_catalogo TO authenticated;
ALTER TABLE public.papeis_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "papeis_catalogo_select_all" ON public.papeis_catalogo
  FOR SELECT TO authenticated USING (true);

-- entidade_papeis: dados_papel jsonb carrega os poucos campos específicos
-- de papel (relationship do Responsável; relation/visit_date/purpose/notes
-- do Visitante) — proporcional aqui, sem FK própria, diferente da extensão
-- dedicada de Colaborador no ERP.
CREATE TABLE public.entidade_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  papel varchar NOT NULL REFERENCES public.papeis_catalogo(codigo),
  ativo boolean NOT NULL DEFAULT true,
  dados_papel jsonb,
  ativado_em timestamptz NOT NULL DEFAULT now(),
  desativado_em timestamptz,
  UNIQUE(entidade_id, papel)
);

CREATE INDEX idx_entidade_papeis_entidade ON public.entidade_papeis(entidade_id);
CREATE INDEX idx_entidade_papeis_org_papel ON public.entidade_papeis(organization_id, papel);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entidade_papeis TO authenticated;
ALTER TABLE public.entidade_papeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entidade_papeis_manage" ON public.entidade_papeis
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id() AND get_current_user_role() = ANY (ARRAY['admin','coordenacao','secretario']))
  WITH CHECK (organization_id = current_org_id());

CREATE POLICY "entidade_papeis_select" ON public.entidade_papeis
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND organization_id = current_org_id());

-- Regra de PF/PJ por papel — mesmo trigger do ERP, mesmo propósito.
CREATE OR REPLACE FUNCTION public.validar_papel_tipo_pessoa()
RETURNS trigger AS $$
DECLARE
  v_tipo_pessoa varchar;
  v_permitido varchar;
BEGIN
  SELECT tipo_pessoa INTO v_tipo_pessoa FROM public.entidades WHERE id = NEW.entidade_id;
  SELECT tipo_pessoa_permitido INTO v_permitido FROM public.papeis_catalogo WHERE codigo = NEW.papel;

  IF v_permitido IS NOT NULL AND v_permitido <> 'AMBOS' AND v_permitido <> v_tipo_pessoa THEN
    RAISE EXCEPTION 'Papel % não permite entidade do tipo % (permitido: %)', NEW.papel, v_tipo_pessoa, v_permitido;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validar_papel_tipo_pessoa
  BEFORE INSERT OR UPDATE ON public.entidade_papeis
  FOR EACH ROW EXECUTE FUNCTION public.validar_papel_tipo_pessoa();

-- entidade_id_map: tabela de trabalho da Fase 6 (backfill), dropada no fim.
CREATE TABLE public.entidade_id_map (
  tabela_origem varchar NOT NULL,
  id_origem uuid NOT NULL,
  entidade_id uuid NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  PRIMARY KEY (tabela_origem, id_origem)
);
ALTER TABLE public.entidade_id_map ENABLE ROW LEVEL SECURITY;
