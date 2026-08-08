-- classes.grade era TEXT solto, desconectado da tabela normalizada `series`
-- (que já existe e é usada por waitlist_applications). Confirmado no banco real
-- antes desta migration: só 1 turma existe em produção, com grade=NULL — sem
-- dado real pra perder, seguro dropar a coluna em vez de manter as duas.
ALTER TABLE public.classes
  ADD COLUMN series_id UUID REFERENCES public.series(id) ON DELETE RESTRICT;

ALTER TABLE public.classes DROP COLUMN grade;

CREATE INDEX idx_classes_series_id ON public.classes(series_id);
