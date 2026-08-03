-- Rastreabilidade da conversão de reserva de vaga em matrícula real
ALTER TABLE public.waitlist_applications
  ADD COLUMN IF NOT EXISTS converted_student_id uuid REFERENCES public.students(id);
