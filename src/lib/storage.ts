import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentRecord {
  id: string;
  title: string;
  file_path: string;
  created_at: string;
  tags?: string[];
  document_type?: string | null;
  validation_status?: string;
  ai_notes?: string | null;
}

export const buildOrgPrefix = (orgId: string): string => {
  return orgId;
};

export const avatarPath = (orgId: string, studentId: string, file: File): string => {
  const ext = file.name.split('.').pop();
  const uuid = uuidv4();
  return `${orgId}/students/${studentId}/avatar-${uuid}.${ext}`;
};

export const docPath = (orgId: string, studentId: string, file: File): string => {
  const ext = file.name.split('.').pop();
  const uuid = uuidv4();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${orgId}/students/${studentId}/doc-${uuid}-${safeName}`;
};

export const uploadAvatar = async (file: File, orgId: string, studentId: string) => {
  const path = avatarPath(orgId, studentId, file);

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });

  if (error) throw error;

  // documents não tem UNIQUE constraint pra (organization_id, owner_type,
  // owner_id, title) — só PK(id) e FK(organization_id) (conferido via
  // pg_get_constraintdef) — então upsert com onConflict nessas colunas
  // sempre falhava com 400 (42P10). Em vez de criar um índice parcial só
  // pra avatar (uploadDoc depende de títulos poderem se repetir), resolve
  // explícito: busca a linha existente e decide insert/update.
  const { data: existing, error: existingError } = await supabase
    .from('documents')
    .select('id, file_path')
    .eq('organization_id', orgId)
    .eq('owner_type', 'student')
    .eq('owner_id', studentId)
    .eq('title', 'avatar')
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    organization_id: orgId,
    owner_type: 'student',
    owner_id: studentId,
    title: 'avatar',
    file_path: `avatars/${path}`,
    tags: ['avatar'],
  };

  const { data: docData, error: docError } = existing
    ? await supabase.from('documents').update(payload).eq('id', existing.id).select().single()
    : await supabase.from('documents').insert(payload).select().single();
  if (docError) throw docError;

  // Melhor esforço: remove o avatar antigo do storage (cada upload gera um
  // path com UUID novo via avatarPath, então sem isso o bucket acumula um
  // arquivo órfão a cada troca de foto). Falha aqui não deve derrubar o
  // upload que já foi bem-sucedido.
  if (existing && existing.file_path !== payload.file_path) {
    const [oldBucket, ...oldPathParts] = existing.file_path.split('/');
    try {
      await deleteStorageFile(oldBucket, oldPathParts.join('/'));
    } catch {
      // arquivo antigo pode já não existir — ignora
    }
  }

  return { data, docData };
};

export const uploadDoc = async (file: File, orgId: string, studentId: string) => {
  const path = docPath(orgId, studentId, file);
  
  const { data, error } = await supabase.storage
    .from('docs')
    .upload(path, file);

  if (error) throw error;

  // Inserir documento
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      organization_id: orgId,
      owner_type: 'student',
      owner_id: studentId,
      title: file.name,
      file_path: `docs/${path}`,
      tags: []
    })
    .select()
    .single();

  if (docError) throw docError;

  return { data, docData };
};

export const guardianDocPath = (orgId: string, guardianId: string, file: File): string => {
  const ext = file.name.split('.').pop();
  const uuid = uuidv4();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${orgId}/guardians/${guardianId}/doc-${uuid}-${safeName}`;
};

// Upload feito pelo próprio responsável (portal) — owner_type='guardian', path
// separado de uploadDoc (que é owner_type='student', usado pelo staff) porque as
// policies de RLS (tabela documents e storage.objects do bucket docs) distinguem
// os dois casos via current_org_id() (staff) vs current_guardian_org_id() (guardian).
export const uploadGuardianDoc = async (file: File, orgId: string, guardianId: string, tags: string[] = []) => {
  const path = guardianDocPath(orgId, guardianId, file);

  const { data, error } = await supabase.storage
    .from('docs')
    .upload(path, file);

  if (error) throw error;

  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      organization_id: orgId,
      owner_type: 'guardian',
      owner_id: guardianId,
      title: file.name,
      file_path: `docs/${path}`,
      tags,
    })
    .select()
    .single();

  if (docError) throw docError;

  return { data, docData };
};

// Foto do mural (post type='foto'). `documents` é polimórfico sem FK, então
// owner_type='announcement' não exige nada de schema — mesmo caminho de
// uploadDoc/uploadGuardianDoc, só muda o dono.
export const uploadAnnouncementPhoto = async (file: File, orgId: string, announcementId: string) => {
  const ext = file.name.split('.').pop();
  const path = `${orgId}/announcements/${announcementId}/${uuidv4()}.${ext}`;

  const { error } = await supabase.storage.from('docs').upload(path, file);
  if (error) throw error;

  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      organization_id: orgId,
      owner_type: 'announcement',
      owner_id: announcementId,
      title: file.name,
      file_path: `docs/${path}`,
      tags: ['mural'],
    })
    .select()
    .single();

  if (docError) throw docError;
  return { path, docData };
};

export const getSignedUrl = async (bucket: string, path: string, expiresInSec: number = 3600) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSec);

  if (error) throw error;
  return data.signedUrl;
};

export const deleteStorageFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};

export const getFileTypeFromPath = (filePath: string): string => {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
    return 'Imagem';
  }
  
  if (ext === 'pdf') {
    return 'PDF';
  }
  
  return 'Documento';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};