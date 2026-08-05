-- Modelo (template) do contrato de matrícula editável pela secretaria, sem
-- depender de deploy — pedido explícito do usuário durante a implementação da
-- assinatura eletrônica de matrícula: o texto do contrato precisa poder ser
-- atualizado conforme variação de mercado/legislação. `body` guarda o texto com
-- placeholders no formato {{chave}} (ex: {{aluno}}, {{valor_mensalidade}}),
-- substituídos em src/features/secretaria/lib/enrollmentContractTemplate.ts
-- (renderContractText). Só 1 template pode estar ativo por organização por vez
-- (índice único parcial abaixo) — é esse que enrollment_contracts referencia
-- via template_id no momento da assinatura.

CREATE TABLE public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.enrollment_contracts
  ADD COLUMN template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL;

ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_contract_templates_org ON public.contract_templates(organization_id);

-- Garante no máximo 1 template ativo por organização, sem precisar de trigger
-- pra "desativar os outros" — o UPDATE que ativa uma versão nova só funciona se
-- desativar a anterior antes (feito na mesma transação pelo hook de mutation).
CREATE UNIQUE INDEX idx_contract_templates_one_active_per_org
  ON public.contract_templates(organization_id) WHERE is_active;

CREATE POLICY "contract_templates_manage" ON public.contract_templates
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "contract_templates_select" ON public.contract_templates
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
