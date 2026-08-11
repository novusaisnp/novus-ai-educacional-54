-- Detecção de choque de horário: mesma turma não pode ter 2 matérias no
-- mesmo slot, mesmo professor não pode estar em 2 turmas no mesmo slot,
-- mesma sala (classes.room_id, sala é fixa por turma) não pode ser usada
-- por 2 turmas no mesmo slot. Mesmo padrão de check_class_capacity() —
-- trigger no ponto único de escrita (class_subjects), cobre todo caller.
CREATE OR REPLACE FUNCTION public.check_schedule_conflict()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_room_id UUID;
  v_conflict RECORD;
BEGIN
  IF NEW.time_slot_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.name AS label INTO v_conflict
  FROM public.class_subjects cs
  JOIN public.subjects s ON s.id = cs.subject_id
  WHERE cs.class_id = NEW.class_id
    AND cs.time_slot_id = NEW.time_slot_id
    AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF FOUND THEN
    RAISE EXCEPTION 'Turma já tem % nesse horário', v_conflict.label;
  END IF;

  IF NEW.teacher_id IS NOT NULL THEN
    SELECT c.name AS label INTO v_conflict
    FROM public.class_subjects cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE cs.teacher_id = NEW.teacher_id
      AND cs.time_slot_id = NEW.time_slot_id
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF FOUND THEN
      RAISE EXCEPTION 'Professor já está na turma % nesse horário', v_conflict.label;
    END IF;
  END IF;

  SELECT room_id INTO v_room_id FROM public.classes WHERE id = NEW.class_id;
  IF v_room_id IS NOT NULL THEN
    SELECT c.name AS label INTO v_conflict
    FROM public.class_subjects cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE c.room_id = v_room_id
      AND cs.class_id != NEW.class_id
      AND cs.time_slot_id = NEW.time_slot_id
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF FOUND THEN
      RAISE EXCEPTION 'Sala já ocupada pela turma % nesse horário', v_conflict.label;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_schedule_conflict
  BEFORE INSERT OR UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION check_schedule_conflict();
