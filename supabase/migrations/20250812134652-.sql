-- Insert seed data for testing
-- Create a test organization if it doesn't exist
INSERT INTO public.organizations (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'NOVUS.AI - Escola Teste')
ON CONFLICT (id) DO NOTHING;

-- Create test subjects
INSERT INTO public.subjects (organization_id, name, code, bncc_axis) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Matemática', 'MAT001', 'Números e Álgebra'),
  ('00000000-0000-0000-0000-000000000001', 'Português', 'POR001', 'Linguagens e Códigos')
ON CONFLICT (code) DO NOTHING;

-- Create test class
INSERT INTO public.classes (organization_id, name, year, grade, shift) VALUES
  ('00000000-0000-0000-0000-000000000001', '5º Ano A', 2024, '5º Ano', 'manha')
ON CONFLICT DO NOTHING;

-- Create test students
INSERT INTO public.students (organization_id, person_id, first_name, last_name, birth_date, gender, document_id, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'EST001', 'Ana', 'Silva', '2014-05-15', 'Feminino', '123.456.789-01', 'ativo'),
  ('00000000-0000-0000-0000-000000000001', 'EST002', 'João', 'Santos', '2014-08-22', 'Masculino', '987.654.321-02', 'ativo')
ON CONFLICT (person_id) DO NOTHING;

-- Create test guardian
INSERT INTO public.guardians (organization_id, name, email, phone, relationship) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Maria Silva', 'maria.silva@email.com', '(11) 99999-9999', 'Mãe')
ON CONFLICT DO NOTHING;

-- Link student to guardian
INSERT INTO public.student_guardians (organization_id, student_id, guardian_id, is_primary, legal_consent)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  s.id,
  g.id,
  true,
  true
FROM public.students s, public.guardians g
WHERE s.person_id = 'EST001' AND g.name = 'Maria Silva'
ON CONFLICT (student_id, guardian_id) DO NOTHING;

-- Create enrollment
INSERT INTO public.enrollments (organization_id, student_id, class_id, status, enrollment_date)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  s.id,
  c.id,
  'ativa',
  '2024-02-01'
FROM public.students s, public.classes c
WHERE s.person_id IN ('EST001', 'EST002') AND c.name = '5º Ano A'
ON CONFLICT (student_id, class_id) DO NOTHING;