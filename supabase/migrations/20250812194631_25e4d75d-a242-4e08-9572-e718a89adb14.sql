
-- Criar bucket avatars (privado, apenas imagens, 5MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  false,
  5242880, -- 5MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Criar bucket docs (privado, imagens e PDFs, 10MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'docs',
  'docs',
  false, 
  10485760, -- 10MB em bytes
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
);

-- Aplicar RLS no storage.objects (caso ainda não esteja ativado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para o bucket avatars
CREATE POLICY "Avatars: Users can view files in their organization" ON storage.objects
FOR SELECT USING (
  bucket_id = 'avatars' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

CREATE POLICY "Avatars: Users can upload files to their organization" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

CREATE POLICY "Avatars: Users can update files in their organization" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

CREATE POLICY "Avatars: Users can delete files in their organization" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

-- Políticas RLS para o bucket docs
CREATE POLICY "Docs: Users can view files in their organization" ON storage.objects
FOR SELECT USING (
  bucket_id = 'docs' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

CREATE POLICY "Docs: Users can upload files to their organization" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'docs' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

CREATE POLICY "Docs: Users can update files in their organization" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'docs' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);

CREATE POLICY "Docs: Users can delete files in their organization" ON storage.objects
FOR DELETE USING (
  bucket_id = 'docs' AND
  is_authenticated() AND
  (storage.foldername(name))[1] = current_org_id()::text
);
