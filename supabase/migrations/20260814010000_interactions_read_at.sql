-- Chat família <-> escola reusa `interactions` (entity_type='guardian',
-- direction diz quem falou, summary é o texto). Só faltava saber o que já foi
-- lido, pro badge de não-lidas do app mobile.
ALTER TABLE public.interactions
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
