-- Sala/ambiente físico (Fase 3): tabela de salas + vínculo com turmas
--
-- Decisão de schema: uma turma pode estar em uma sala (ou nenhuma).
-- - room_id nullable em classes (opcional, mesmo padrão de period_id)
-- - classrooms.type para diferenciar sala regular, lab, auditório, etc.
-- - capacity de informação, não enforcement (não há trigger de reserva de lugar)

-- 1) CLASSROOMS — salas/ambientes físicos
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  type TEXT NOT NULL DEFAULT 'classroom' CHECK (type IN ('classroom', 'lab', 'auditorium', 'library', 'other')),
  capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
  building TEXT,
  resources TEXT[],
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_classrooms_organization_id ON public.classrooms(organization_id);

CREATE POLICY "classrooms_select" ON public.classrooms
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "classrooms_insert" ON public.classrooms
  FOR INSERT WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "classrooms_update" ON public.classrooms
  FOR UPDATE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id())
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "classrooms_delete" ON public.classrooms
  FOR DELETE USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE TRIGGER update_classrooms_updated_at
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) FK CLASSROOMS em CLASSES
ALTER TABLE public.classes
ADD COLUMN room_id UUID REFERENCES public.classrooms(id) ON DELETE SET NULL;

CREATE INDEX idx_classes_room_id ON public.classes(room_id);
