import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortalData } from '@/hooks/usePortalData';
import { useOrganization } from '@/hooks/useOrganization';
import { logAudit } from '@/lib/audit/logAudit';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import PortalPageHeader from '@/components/portal/PortalPageHeader';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Download,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function PortalDocumentos() {
  const { orgId } = useOrganization();
  const { guardian, documents, loading } = usePortalData();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (orgId && guardian?.id) {
      logAudit({
        organization_id: orgId,
        action: 'view_documents',
        table_name: 'portal',
      });
    }
  }, [orgId, guardian?.id]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!guardian?.id || !orgId) throw new Error('Guardian não encontrado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${guardian.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('edu-docs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          organization_id: orgId,
          owner_type: 'guardian',
          owner_id: guardian.id,
          title: file.name,
          file_path: `edu-docs/${fileName}`,
          tags: ['uploaded', 'pending']
        });

      if (dbError) throw dbError;

      // Log audit
      await logAudit({
        organization_id: orgId,
        action: 'upload_document',
        table_name: 'portal',
        diff: { type: file.name }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-documents'] });
      toast({
        title: 'Documento enviado',
        description: 'Seu documento foi enviado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro no upload',
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (document: any) => {
      // Delete from storage
      const fileName = document.file_path.replace('edu-docs/', '');
      await supabase.storage.from('edu-docs').remove([fileName]);

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-documents'] });
      toast({
        title: 'Documento removido',
        description: 'Documento foi removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover',
        description: error.message,
      });
    },
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O arquivo deve ter no máximo 10MB.',
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      event.target.value = ''; // Reset input
    }
  }, [uploadMutation, toast]);

  const getStatusIcon = (tags: string[] = []) => {
    if (tags.includes('approved')) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (tags.includes('rejected')) {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
    return <Clock className="h-4 w-4 text-yellow-600" />;
  };

  const getStatusLabel = (tags: string[] = []) => {
    if (tags.includes('approved')) return 'Aprovado';
    if (tags.includes('rejected')) return 'Rejeitado';
    return 'Pendente';
  };

  const getStatusVariant = (tags: string[] = []): "default" | "secondary" | "destructive" | "outline" => {
    if (tags.includes('approved')) return 'default';
    if (tags.includes('rejected')) return 'destructive';
    return 'outline';
  };

  const downloadDocument = async (document: any) => {
    const fileName = document.file_path.replace('edu-docs/', '');
    const { data, error } = await supabase.storage
      .from('edu-docs')
      .createSignedUrl(fileName, 60);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o documento.',
      });
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Documentos"
        description="Envie e acompanhe seus documentos"
        icon={<FileText className="h-5 w-5 text-primary" />}
      />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Documento</CardTitle>
          <CardDescription>
            Envie documentos solicitados pela escola (máximo 10MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="document">Arquivo</Label>
              <Input
                id="document"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
              </p>
            </div>
            {uploading && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Enviando...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Documentos</CardTitle>
          <CardDescription>
            Documentos enviados e seu status de aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="space-y-4">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(document.tags)}
                    <div>
                      <p className="font-medium">{document.title}</p>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>
                          Enviado em: {new Date(document.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge variant={getStatusVariant(document.tags)}>
                      {getStatusLabel(document.tags)}
                    </Badge>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(document)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {document.tags?.includes('pending') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate(document)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum documento"
              description="Você ainda não enviou nenhum documento."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}