-- Enforcement de conflito de horário (professor/sala), Fase 4. Sem UNIQUE constraint direta
-- porque a checagem depende de join com classes (sala é da turma, não da atribuição) e usa
-- NULLs (sem horário/professor definido ainda é estado válido, não bloqueado aqui).

-- (a) Ao atribuir/editar disciplina-turma-horário: barra professor em 2 turmas no mesmo
-- horário, e barra 2 turmas com a mesma sala (classes.room_id) no mesmo horário.
CREATE OR REPLACE FUNCTION public.check_schedule_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_room_id UUID;
  v_conflict_class TEXT;
  v_conflict_subject TEXT;
BEGIN
  IF NEW.time_slot_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.teacher_id IS NOT NULL THEN
    SELECT c.name, s.name INTO v_conflict_class, v_conflict_subject
    FROM public.class_subjects cs
    JOIN public.classes c ON c.id = cs.class_id
    JOIN public.subjects s ON s.id = cs.subject_id
    WHERE cs.organization_id = NEW.organization_id
      AND cs.time_slot_id = NEW.time_slot_id
      AND cs.teacher_id = NEW.teacher_id
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF v_conflict_class IS NOT NULL THEN
      RAISE EXCEPTION 'Professor já está alocado nesse horário na turma % (%)', v_conflict_class, v_conflict_subject;
    END IF;
  END IF;

  SELECT room_id INTO v_room_id FROM public.classes WHERE id = NEW.class_id;

  IF v_room_id IS NOT NULL THEN
    v_conflict_class := NULL;

    SELECT c.name INTO v_conflict_class
    FROM public.class_subjects cs
    JOIN public.classes c ON c.id = cs.class_id
    WHERE cs.time_slot_id = NEW.time_slot_id
      AND cs.class_id != NEW.class_id
      AND c.room_id = v_room_id
      AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;

    IF v_conflict_class IS NOT NULL THEN
      RAISE EXCEPTION 'Sala já está ocupada nesse horário pela turma %', v_conflict_class;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS class_subjects_schedule_conflict ON public.class_subjects;
CREATE TRIGGER class_subjects_schedule_conflict
  BEFORE INSERT OR UPDATE ON public.class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.check_schedule_conflict();

-- (b) Ao trocar a sala de uma turma (classes.room_id): revalida os horários já atribuídos
-- na grade dessa turma contra outras turmas que já usam a sala nova nesses horários. Sem isso
-- o trigger acima nunca dispara de novo pra esse caminho (currículo já montado antes da sala
-- ser definida/trocada).
CREATE OR REPLACE FUNCTION public.check_class_room_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_conflict_class TEXT;
BEGIN
  IF NEW.room_id IS NULL OR NEW.room_id IS NOT DISTINCT FROM OLD.room_id THEN
    RETURN NEW;
  END IF;

  SELECT c.name INTO v_conflict_class
  FROM public.class_subjects cs
  JOIN public.classes c ON c.id = cs.class_id
  WHERE cs.class_id != NEW.id
    AND c.room_id = NEW.room_id
    AND cs.time_slot_id IN (
      SELECT time_slot_id FROM public.class_subjects
      WHERE class_id = NEW.id AND time_slot_id IS NOT NULL
    )
  LIMIT 1;

  IF v_conflict_class IS NOT NULL THEN
    RAISE EXCEPTION 'Sala já está ocupada em um dos horários dessa turma pela turma %', v_conflict_class;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS classes_room_schedule_conflict ON public.classes;
CREATE TRIGGER classes_room_schedule_conflict
  BEFORE UPDATE OF room_id ON public.classes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_class_room_conflict();
