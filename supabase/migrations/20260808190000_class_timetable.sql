-- Grade horária (Fase 3): time slots + vínculo class_subjects→time_slot
--
-- Decisão de schema:
-- - time_slots: dia semana + horário (recorrência semanal simples)
-- - class_subjects.time_slot_id opcional (sem enforcement de conflito, só referência)
-- - sem suporte a: períodos diferentes com horários diferentes (fica pra V2)

-- 1) TIME_SLOTS — horários recorrentes (dia da semana + hora)
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, day_of_week, start_time, end_time),
  CHECK (end_time > start_time)
);

ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_time_slots_organization_id ON public.time_slots(organization_id);
CREATE INDEX idx_time_slots_day_of_week ON public.time_slots(day_of_week);

CREATE POLICY "time_slots_select" ON public.time_slots
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "time_slots_insert" ON public.time_slots
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "time_slots_update" ON public.time_slots
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "time_slots_delete" ON public.time_slots
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_time_slots_updated_at
  BEFORE UPDATE ON public.time_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) FK TIME_SLOT em CLASS_SUBJECTS (quando agendada na grade)
ALTER TABLE public.class_subjects
ADD COLUMN time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;

CREATE INDEX idx_class_subjects_time_slot_id ON public.class_subjects(time_slot_id);
