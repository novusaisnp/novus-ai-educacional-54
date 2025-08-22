-- Criar buckets se não existirem
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('docs', 'docs', false)
ON CONFLICT (id) DO NOTHING;

-- Ativar RLS em storage.objects se ainda não estiver
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "storage_select_org" ON storage.objects;
DROP POLICY IF EXISTS "storage_modify_org" ON storage.objects;

-- Política de leitura: somente autenticado e no mesmo org (prefixo do path = org_id)
CREATE POLICY "storage_select_org" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN ('avatars', 'docs')
  AND (split_part(name, '/', 1))::uuid = public.current_org_id()
);

-- Política de escrita (insert/update/delete) restrita ao prefixo da org
CREATE POLICY "storage_modify_org" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id IN ('avatars', 'docs')
  AND (split_part(name, '/', 1))::uuid = public.current_org_id()
)
WITH CHECK (
  bucket_id IN ('avatars', 'docs')
  AND (split_part(name, '/', 1))::uuid = public.current_org_id()
);