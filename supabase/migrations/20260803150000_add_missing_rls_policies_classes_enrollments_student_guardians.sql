-- classes, enrollments e student_guardians tinham RLS habilitado sem NENHUMA policy
-- (default-deny total: SELECT retornava vazio silenciosamente, INSERT/UPDATE/DELETE
-- falhavam com "new row violates row-level security policy"). Descoberto testando
-- ao vivo o funil de admissão — sem isso, matricular um aluno é impossível mesmo
-- com o código do app correto. Réplica do padrão já usado em students/guardians.

CREATE POLICY "classes_manage" ON public.classes
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "classes_select" ON public.classes
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "enrollments_manage" ON public.enrollments
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "enrollments_select" ON public.enrollments
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

CREATE POLICY "student_guardians_manage" ON public.student_guardians
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "student_guardians_select" ON public.student_guardians
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());
