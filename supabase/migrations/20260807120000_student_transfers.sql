-- Transferência escolar (Fase 1 — última fatia do "somar do MVP"): registra a
-- saída formal de um aluno para outra instituição, gera a guia de
-- transferência (histórico acadêmico por período/disciplina, reaproveitando
-- term_results) com assinatura eletrônica simples, e — ao finalizar — encerra
-- o vínculo do aluno com a escola automaticamente (decisão de negócio
-- confirmada com o usuário).
--
-- Mesmo padrão de 2 estados já usado em enrollment_contracts/class_councils:
-- rascunho (editável) -> concluida (assinada, PDF gerado, imutável).

CREATE TABLE public.student_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  destination_school text,
  reason text,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'concluida')),
  signer_name text,
  finalized_by uuid REFERENCES auth.users(id),
  finalized_at timestamptz,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_transfers ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_student_transfers_organization_id ON public.student_transfers(organization_id);
CREATE INDEX idx_student_transfers_student_id ON public.student_transfers(student_id);
CREATE INDEX idx_student_transfers_enrollment_id ON public.student_transfers(enrollment_id);

-- Mesmo grupo de enrollment_contracts (secretário emite documento oficial,
-- não é exclusivo de admin/coordenação como o parecer do conselho de classe).
CREATE POLICY "student_transfers_manage" ON public.student_transfers
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "student_transfers_select" ON public.student_transfers
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_student_transfers_updated_at
  BEFORE UPDATE ON public.student_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- finalized_at: mesmo padrão de class_councils (UPDATE numa linha que já
-- existe em rascunho, não INSERT já assinado).
CREATE OR REPLACE FUNCTION public.set_student_transfer_finalized_at()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'rascunho' AND NEW.status = 'concluida' THEN
    NEW.finalized_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_transfers_set_finalized_at
  BEFORE UPDATE ON public.student_transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_student_transfer_finalized_at();

-- Efeito de negócio: finalizar a transferência é o gatilho oficial que
-- encerra o vínculo do aluno com a escola — decisão confirmada com o
-- usuário (não fica manual). Roda dentro da mesma transação do UPDATE que
-- finaliza, então não há risco de status divergente por falha no meio do
-- caminho (diferente das conversões multi-tabela sequenciais no client,
-- que são um risco já aceito em outros fluxos deste app).
CREATE OR REPLACE FUNCTION public.apply_student_transfer_status()
RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'rascunho' AND NEW.status = 'concluida' THEN
    UPDATE public.students SET status = 'transferido' WHERE id = NEW.student_id;
    UPDATE public.enrollments SET status = 'transferida' WHERE id = NEW.enrollment_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER student_transfers_apply_status
  AFTER UPDATE ON public.student_transfers
  FOR EACH ROW EXECUTE FUNCTION public.apply_student_transfer_status();
