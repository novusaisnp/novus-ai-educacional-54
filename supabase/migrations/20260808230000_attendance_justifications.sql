-- Fase 4, quarta e última fatia: justificativa de falta online pelo responsável.
-- Guardian envia motivo (+ anexo opcional, via documents.owner_type='guardian', mesmo
-- padrão de laudo em student_pei.laudo_document_id) pelo portal. Fica 'pendente' até
-- staff (admin/coordenacao/professor — mesmo grupo de attendance_manage) aprovar ou
-- recusar. Só na aprovação o trigger reflete em attendance.status='justificada' —
-- guardian nunca escreve em attendance diretamente, preserva o registro oficial sob
-- controle da escola (decisão confirmada com o usuário antes de implementar).

CREATE TABLE public.attendance_justifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'recusada')),
  review_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_justifications_org_status
  ON public.attendance_justifications(organization_id, status);
CREATE INDEX idx_attendance_justifications_attendance
  ON public.attendance_justifications(attendance_id);
CREATE INDEX idx_attendance_justifications_guardian
  ON public.attendance_justifications(guardian_id);

-- No máximo 1 justificativa pendente por falta — evita reenvio duplicado enquanto
-- staff ainda não revisou a anterior.
CREATE UNIQUE INDEX idx_attendance_justifications_one_pending
  ON public.attendance_justifications(attendance_id) WHERE status = 'pendente';

ALTER TABLE public.attendance_justifications ENABLE ROW LEVEL SECURITY;

-- Guardian só justifica falta/atraso dos próprios filhos, nunca presença já normal.
CREATE OR REPLACE FUNCTION public.check_attendance_justification_eligible()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM public.attendance WHERE id = NEW.attendance_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Registro de frequência não encontrado';
  END IF;

  IF v_status NOT IN ('falta', 'atraso') THEN
    RAISE EXCEPTION 'Só é possível justificar faltas ou atrasos (status atual: %)', v_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER check_attendance_justification_eligible
  BEFORE INSERT ON public.attendance_justifications
  FOR EACH ROW EXECUTE FUNCTION public.check_attendance_justification_eligible();

-- Justificativa revisada (aprovada/recusada) é definitiva — staff não reabre pendente
-- editando a mesma linha, evita histórico de revisão sobrescrito silenciosamente.
CREATE OR REPLACE FUNCTION public.finalize_attendance_justification_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status <> 'pendente' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'Justificativa já revisada (status: %) não pode ser alterada novamente', OLD.status;
  END IF;

  IF NEW.status <> OLD.status AND NEW.status IN ('aprovada', 'recusada') THEN
    NEW.reviewed_at := now();
    IF NEW.reviewed_by IS NULL THEN
      NEW.reviewed_by := auth.uid();
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER finalize_attendance_justification_review
  BEFORE UPDATE ON public.attendance_justifications
  FOR EACH ROW EXECUTE FUNCTION public.finalize_attendance_justification_review();

-- Aprovação reflete no registro oficial de frequência — único caminho que muda
-- attendance.status pra 'justificada' a partir de uma justificativa do responsável.
CREATE OR REPLACE FUNCTION public.apply_attendance_justification_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'aprovada' AND OLD.status <> 'aprovada' THEN
    UPDATE public.attendance
    SET status = 'justificada',
        note = CASE
          WHEN note IS NULL OR note = '' THEN 'Justificado pelo responsável: ' || NEW.reason
          ELSE note || ' | Justificado pelo responsável: ' || NEW.reason
        END,
        updated_at = now()
    WHERE id = NEW.attendance_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER apply_attendance_justification_approval
  AFTER UPDATE ON public.attendance_justifications
  FOR EACH ROW EXECUTE FUNCTION public.apply_attendance_justification_approval();

-- RLS: guardian cria/lê só as próprias, dos próprios filhos.
CREATE POLICY "attendance_justifications_insert_guardian" ON public.attendance_justifications
  FOR INSERT WITH CHECK (
    guardian_id = public.current_guardian_id()
    AND organization_id = public.current_guardian_org_id()
    AND EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = attendance_justifications.student_id
        AND sg.guardian_id = public.current_guardian_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.attendance a
      WHERE a.id = attendance_justifications.attendance_id
        AND a.student_id = attendance_justifications.student_id
    )
  );

CREATE POLICY "attendance_justifications_select_guardian" ON public.attendance_justifications
  FOR SELECT USING (guardian_id = public.current_guardian_id());

-- RLS: staff (mesmo grupo que lança frequência) lê e revisa da própria organização.
CREATE POLICY "attendance_justifications_select_staff" ON public.attendance_justifications
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor'])
  );

CREATE POLICY "attendance_justifications_update_staff" ON public.attendance_justifications
  FOR UPDATE USING (
    auth.uid() IS NOT NULL
    AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor'])
  )
  WITH CHECK (organization_id = public.current_org_id());
