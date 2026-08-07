
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentRecord, uploadAvatar, uploadDoc, deleteStorageFile, getSignedUrl } from '@/lib/storage';

// Busca em lote o avatar de vários alunos de uma vez (uma query só, não uma
// por linha) — usado pela miniatura na lista de Alunos. Bucket `avatars` no
// banco real está com public=false (a migration original dizia `true`, mas
// diverge do estado real — conferido via SQL direto, mesmo padrão de
// "migration não bate com banco" já documentado no CLAUDE.md), então precisa
// de signed URL, igual ao avatar único de StudentAvatar.
export const useStudentAvatars = (studentIds: string[]) => {
  const idsKey = [...studentIds].sort().join(',');

  return useQuery({
    queryKey: ['documents.avatars_by_student', idsKey],
    queryFn: async (): Promise<Record<string, string>> => {
      if (studentIds.length === 0) return {};

      const { data, error } = await supabase
        .from('documents')
        .select('owner_id, file_path')
        .eq('owner_type', 'student')
        .eq('title', 'avatar')
        .in('owner_id', studentIds);

      if (error) throw error;

      const entries = await Promise.all(
        (data || []).map(async (doc) => {
          const [bucket, ...pathParts] = doc.file_path.split('/');
          const url = await getSignedUrl(bucket, pathParts.join('/'), 3600);
          return [doc.owner_id, url] as const;
        })
      );

      return Object.fromEntries(entries);
    },
    enabled: studentIds.length > 0,
    staleTime: 30 * 60 * 1000,
  });
};

export const useDocuments = (studentId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar organização do usuário
  const { data: userOrg } = useQuery({
    queryKey: ['userOrganization'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data.organization_id;
    },
  });

  // Query para buscar documentos do aluno
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents.byOwner', userOrg ?? null, 'student', studentId ?? null],
    queryFn: async () => {
      if (!studentId) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, file_path, created_at, tags, document_type, validation_status, ai_notes')
        .eq('owner_type', 'student')
        .eq('owner_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocumentRecord[];
    },
    enabled: !!studentId && !!userOrg,
  });

  // Avatar do aluno (primeiro documento com tag avatar)
  const avatar = documents?.find(doc => 
    doc.title === 'avatar' || doc.tags?.includes('avatar')
  );

  // Documentos que não são avatar
  const attachments = documents?.filter(doc => 
    doc.title !== 'avatar' && !doc.tags?.includes('avatar')
  ) || [];

  // Mutation para upload de avatar
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!userOrg || !studentId) throw new Error('Dados faltando');
      return uploadAvatar(file, userOrg, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents.byOwner', userOrg, 'student', studentId] });
      toast({
        title: 'Avatar atualizado',
        description: 'Avatar do aluno foi atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message,
      });
    },
  });

  // Mutation para upload de documentos
  const uploadDocMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!userOrg || !studentId) throw new Error('Dados faltando');
      return uploadDoc(file, userOrg, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents.byOwner', userOrg, 'student', studentId] });
      toast({
        title: 'Documento anexado',
        description: 'Documento foi anexado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload',
        description: error.message,
      });
    },
  });

  // Mutation para deletar documento
  const deleteDocMutation = useMutation({
    mutationFn: async (doc: DocumentRecord) => {
      // Extrair bucket e path do file_path
      const [bucket, ...pathParts] = doc.file_path.split('/');
      const path = pathParts.join('/');

      // Deletar do storage
      await deleteStorageFile(bucket, path);

      // Deletar do banco
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents.byOwner', userOrg, 'student', studentId] });
      toast({
        title: 'Documento removido',
        description: 'Documento foi removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover documento',
        description: error.message,
      });
    },
  });

  // Mutation para validar documento por IA (classifica tipo + legibilidade)
  const validateDocMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke('ai-document-validation', {
        body: { document_id: documentId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents.byOwner', userOrg, 'student', studentId] });
      toast({
        title: 'Validação concluída',
        description: 'O documento foi analisado pela IA.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao validar documento',
        description: error.message,
      });
    },
  });

  return {
    documents,
    avatar,
    attachments,
    isLoading,
    uploadAvatarMutation,
    uploadDocMutation,
    deleteDocMutation,
    validateDocMutation,
  };
};
