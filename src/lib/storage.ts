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

  // Inserir/atualizar documento para o avatar
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .upsert({
      organization_id: orgId,
      owner_type: 'student',
      owner_id: studentId,
      title: 'avatar',
      file_path: `avatars/${path}`,
      tags: ['avatar']
    }, {
      onConflict: 'organization_id,owner_type,owner_id,title'
    })
    .select()
    .single();

  if (docError) throw docError;

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