-- Bug real, confirmado por simulação de RLS (SET ROLE authenticated + request.jwt.claims,
-- transação revertida): guardian nunca tem linha em public.profiles, então
-- current_org_id()/get_current_user_role() (ambas fazem JOIN só com profiles)
-- retornam NULL pra qualquer sessão de responsável. Toda policy do portal tinha a forma
-- "organization_id = current_org_id() AND (staff OR dono)" — como current_org_id() é NULL,
-- a cláusula inteira é falsa mesmo no ramo "é o dono". Resultado: guardians_select,
-- interactions_select, documents_select, requests_access, student_guardians_select,
-- students_select bloqueiam 100% o acesso de um responsável real — confirmado com
-- guardians_visible=0/interactions_visible=0/students_visible=0/attendance_visible=0
-- simulando um guardian sem profile. As policies "guardian pode ver o próprio X" que
-- existiam na migration 20250821145825 tinham o mesmo defeito (mesma cláusula
-- organization_id=current_org_id() gating o ramo do dono) e, além disso, não estão mais
-- ativas no banco real hoje (confirmado via pg_policies — só as policies X_select/X_manage
-- puramente staff estão ativas, mesmo padrão de "migration não é garantia do que rodou de
-- fato" já documentado no CLAUDE.md). Nunca foi pego antes porque nenhuma sessão testou
-- com um guardian de verdade logado (banco real hoje: 5 guardians, 0 com user_id setado).
--
-- Fix: função helper current_guardian_org_id() (evita depender de current_org_id() pra
-- guardian) + policies aditivas novas (não mexem nas policies de staff existentes — RLS
-- policies são OR'd, então isso só abre acesso extra pro ramo guardian, zero risco pro
-- comportamento de staff já funcionando). Cobre também grades/attendance/assessments/
-- subjects, que o portal de notas/frequência (Fase 4) precisa e nunca tiveram ramo guardian.

CREATE OR REPLACE FUNCTION public.current_guardian_org_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
  SELECT g.organization_id
  FROM public.guardians g
  WHERE g.id = public.current_guardian_id();
$$;

-- guardians: responsável sempre pode ler a própria linha (sem depender de current_org_id())
CREATE POLICY "guardians_select_own" ON public.guardians
  FOR SELECT USING (user_id = auth.uid());

-- student_guardians: responsável lê os próprios vínculos
CREATE POLICY "student_guardians_select_own" ON public.student_guardians
  FOR SELECT USING (guardian_id = public.current_guardian_id());

-- students: responsável lê só os alunos vinculados a ele
CREATE POLICY "students_select_guardian" ON public.students
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = students.id AND sg.guardian_id = public.current_guardian_id()
    )
  );

-- interactions: responsável lê/cria só as próprias (entity_type='guardian')
CREATE POLICY "interactions_select_own_guardian" ON public.interactions
  FOR SELECT USING (entity_type = 'guardian' AND entity_id = public.current_guardian_id());

CREATE POLICY "interactions_insert_own_guardian" ON public.interactions
  FOR INSERT WITH CHECK (
    entity_type = 'guardian' AND entity_id = public.current_guardian_id()
    AND organization_id = public.current_guardian_org_id()
  );

-- requests: responsável lê/cria só as próprias (requester_type='guardian')
CREATE POLICY "requests_select_own_guardian" ON public.requests
  FOR SELECT USING (requester_type = 'guardian' AND requester_id = public.current_guardian_id());

CREATE POLICY "requests_insert_own_guardian" ON public.requests
  FOR INSERT WITH CHECK (
    requester_type = 'guardian' AND requester_id = public.current_guardian_id()
    AND organization_id = public.current_guardian_org_id()
  );

-- documents: responsável lê/envia só os próprios (owner_type='guardian')
CREATE POLICY "documents_select_own_guardian" ON public.documents
  FOR SELECT USING (owner_type = 'guardian' AND owner_id = public.current_guardian_id());

CREATE POLICY "documents_insert_own_guardian" ON public.documents
  FOR INSERT WITH CHECK (
    owner_type = 'guardian' AND owner_id = public.current_guardian_id()
    AND organization_id = public.current_guardian_org_id()
  );

-- grades: responsável lê notas só dos próprios filhos (novo, pro portal de notas/frequência)
CREATE POLICY "grades_select_guardian" ON public.grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = grades.student_id AND sg.guardian_id = public.current_guardian_id()
    )
  );

-- attendance: responsável lê frequência só dos próprios filhos
CREATE POLICY "attendance_select_guardian" ON public.attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      WHERE sg.student_id = attendance.student_id AND sg.guardian_id = public.current_guardian_id()
    )
  );

-- assessments: responsável só enxerga a avaliação se existe nota dele vinculada a ela
-- (título/data/peso são contexto da nota, não devem vazar avaliação sem nota lançada)
CREATE POLICY "assessments_select_guardian" ON public.assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.grades gr
      JOIN public.student_guardians sg ON sg.student_id = gr.student_id
      WHERE gr.assessment_id = assessments.id AND sg.guardian_id = public.current_guardian_id()
    )
  );

-- subjects: catálogo de disciplinas não é dado sensível (só nome/código) — liberado
-- pra qualquer guardian autenticado da própria organização, sem precisar de EXISTS por
-- aluno vinculado (evitaria N joins repetidos só pra mostrar o nome da disciplina).
CREATE POLICY "subjects_select_guardian" ON public.subjects
  FOR SELECT USING (organization_id = public.current_guardian_org_id());
