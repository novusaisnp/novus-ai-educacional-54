-- Capacidade (vagas) por turma. Nullable: turma sem limite configurado não tem trava.
ALTER TABLE public.classes
  ADD COLUMN capacity_limit INTEGER CHECK (capacity_limit IS NULL OR capacity_limit > 0);

-- Trava a nível de banco: matrícula ativa nova/reativada não pode ultrapassar capacity_limit.
-- Só conta 'ativa' (mesmo status que a UI de Turmas usa pra badge de vagas ocupadas).
CREATE OR REPLACE FUNCTION public.check_class_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_active_count INTEGER;
BEGIN
  IF NEW.status != 'ativa' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'ativa' AND OLD.class_id = NEW.class_id THEN
    RETURN NEW;
  END IF;

  SELECT capacity_limit INTO v_capacity FROM public.classes WHERE id = NEW.class_id;

  IF v_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.enrollments
  WHERE class_id = NEW.class_id AND status = 'ativa' AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_active_count >= v_capacity THEN
    RAISE EXCEPTION 'Turma atingiu a capacidade máxima (% vagas)', v_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_class_capacity ON public.enrollments;
CREATE TRIGGER enforce_class_capacity
  BEFORE INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_class_capacity();
