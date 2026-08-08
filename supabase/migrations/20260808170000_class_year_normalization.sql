-- classes.year normalization: desconectar do INTEGER solto e vincular a periods real
--
-- Decisão de schema: adicionar period_id (FK a periods) sem dropar year:
-- - year INTEGER fica, não quebra queries antigas no client
-- - period_id UUID fica nullable — classes sem período vinculado continuam funcionando
-- - client migra gradualmente pra usar period_id + join periods
-- - quando todas as turmas forem parametrizadas, year vira dead column e pode dropar em session futura
--
-- Data real hoje: classes.year=2026, mas periods está vazio (nenhuma linha).
-- Zero risco de constraint violation, coexistência limpa.

ALTER TABLE public.classes
ADD COLUMN period_id UUID REFERENCES public.periods(id) ON DELETE RESTRICT;

CREATE INDEX idx_classes_period_id ON public.classes(period_id);
