-- documents tinha RLS habilitado sem NENHUMA política (mesmo bug já corrigido em
-- classes/enrollments/student_guardians) e os buckets de storage não tinham
-- política de DELETE. Descoberto planejando o GED do aluno com validação por IA.

CREATE POLICY "documents_manage" ON public.documents
  FOR ALL USING (
    auth.uid() IS NOT NULL AND organization_id = public.current_org_id()
    AND public.get_current_user_role() = ANY (ARRAY['admin', 'coordenacao', 'secretario'])
  )
  WITH CHECK (organization_id = public.current_org_id());

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (auth.uid() IS NOT NULL AND organization_id = public.current_org_id());

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS ai_notes text,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz;

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );

CREATE POLICY "docs_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'docs' AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );
