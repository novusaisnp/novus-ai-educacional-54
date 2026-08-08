-- Bug real achado de passagem enquanto implementava upload de anexo de justificativa
-- de falta (Fase 4, última fatia): as policies de storage.objects do bucket 'docs'
-- (docs_insert/docs_select/docs_update/docs_delete, ver supabase/migrations mais
-- antigas) exigem (storage.foldername(name))[1] = current_org_id()::text. Igual ao
-- bug de tabela já corrigido em 20260808210000_fix_portal_guardian_rls.sql,
-- current_org_id() faz JOIN só com profiles — sempre NULL pra sessão de guardian
-- (sem linha em profiles). Isso nunca foi pego porque nenhum guardian real tentou
-- upload até agora. Sem este fix, qualquer tentativa de anexar atestado pelo portal
-- falharia silenciosamente com "new row violates row-level security policy" no
-- storage, mesmo com a tabela documents já liberada pra guardian desde a migration
-- anterior (RLS de tabela e de storage.objects são independentes).
--
-- Fix aditivo (mesmo padrão — RLS é OR'd, zero risco pro que já funciona pra staff):
-- policies novas pro bucket 'docs' usando current_guardian_org_id() em vez de
-- current_org_id(). Guardian sobe pra <org_id>/guardians/<guardian_id>/... (mesmo
-- prefixo de organização exigido pelas outras policies, só muda o dono do subpath).

CREATE POLICY "docs_insert_guardian" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'docs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (public.current_guardian_org_id())::text
  );

CREATE POLICY "docs_select_guardian" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'docs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = (public.current_guardian_org_id())::text
  );
