-- assessments, attendance, consents, grades, interactions e subjects tinham RLS
-- habilitado sem NENHUMA policy ativa no banco real (confirmado via
-- SELECT * FROM pg_policies WHERE tablename IN (...) — zero linhas), apesar da
-- migration inicial (20250812134534) conter "CREATE POLICY Organization isolation"
-- pra essas mesmas tabelas: mesmo padrão já visto em classes/enrollments/
-- student_guardians/documents — arquivo de migration não é garantia do que rodou
-- de fato no banco. Sem isso, frequência, notas, avaliações, disciplinas, CRM
-- (interactions) e consentimento LGPD (consents) são inacessíveis via app.
--
-- Split de roles: subjects/interactions/consents são geridos por
-- admin/coordenacao/secretario (mesmo grupo de classes/enrollments); já
-- assessments/attendance/grades são lançados pelo professor em sala
-- (avaliacoes.tsx/chamada.tsx/notas.tsx só aparecem no menu pra
-- admin/coordenacao/professor — useCanEditGrades em useUserRole.ts confirma
-- 'professor' como role habilitada a editar notas), por isso 'professor' entra
-- no _manage dessas três em vez de 'secretario'.

CREATE POLICY "subjects_manage" ON public.subjects
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "subjects_select" ON public.subjects
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "assessments_manage" ON public.assessments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "assessments_select" ON public.assessments
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "grades_manage" ON public.grades
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "grades_select" ON public.grades
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "attendance_manage" ON public.attendance
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'professor'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "interactions_manage" ON public.interactions
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "interactions_select" ON public.interactions
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "consents_manage" ON public.consents
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "consents_select" ON public.consents
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());
