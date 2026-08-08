import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Download, Trash2, Eye } from 'lucide-react';
import { SecretariaModalContext } from '../types';

const documentSchema = z.object({
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  owner_type: z.string().min(1, 'Tipo de proprietário é obrigatório'),
  owner_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  files: z.array(z.instanceof(File)).optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface SubmodalDocumentosProps {
  context: SecretariaModalContext;
  editingDocument?: any;
  onEditingChange?: (document: any) => void;
}

const ownerTypes = [
  { value: 'student', label: 'Estudante' },
  { value: 'guardian', label: 'Responsável' },
  { value: 'enrollment', label: 'Matrícula' },
  { value: 'class', label: 'Turma' },
  { value: 'event', label: 'Evento' },
  { value: 'service_request', label: 'Solicitação' },
  { value: 'template', label: 'Modelo' },
  { value: 'visitor', label: 'Visitante' },
  { value: 'institution', label: 'Instituição' },
  { value: 'other', label: 'Outros' },
];

export function SubmodalDocumentos({ 
  context, 
  editingDocument, 
  onEditingChange 
}: SubmodalDocumentosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: editingDocument?.title || '',
      owner_type: editingDocument?.owner_type || '',
      owner_id: editingDocument?.owner_id || '',
      tags: editingDocument?.tags || [],
    },
  });

  // Repopular form quando o documento em edição muda (mount do modal já pode ter
  // acontecido antes de editingDocument chegar via seed do ModalMestre)
  useEffect(() => {
    if (editingDocument) {
      form.reset({
        title: editingDocument.title || '',
        owner_type: editingDocument.owner_type || '',
        owner_id: editingDocument.owner_id || '',
        tags: editingDocument.tags || [],
      });
    }
  }, [editingDocument, form]);

  // Buscar documentos existentes se editando
  const { data: existingFiles = [] } = useQuery({
    queryKey: ['document-files', editingDocument?.id],
    queryFn: async () => {
      if (!editingDocument?.id) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', editingDocument.id)
        .eq('organization_id', context.orgId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingDocument?.id && !!context.orgId,
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!selectedFiles.length) {
        throw new Error('Selecione pelo menos um arquivo');
      }

      const documents = [];

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${context.orgId}/${data.owner_type}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        // Upload do arquivo
        const { error: uploadError } = await supabase.storage
          .from('edu-docs')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        // Criar registro no banco
        const { data: document, error } = await supabase
          .from('documents')
          .insert({
            title: selectedFiles.length === 1 ? data.title : `${data.title} - ${file.name}`,
            file_path: fileName,
            owner_type: data.owner_type,
            owner_id: data.owner_id || null,
            tags: data.tags || [],
            organization_id: context.orgId,
          })
          .select()
          .single();

        if (error) throw error;
        documents.push(document);
      }

      return documents;
    },
    onSuccess: () => {
      toast({ title: 'Documentos enviados com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      form.reset();
      setSelectedFiles([]);
      setUploadProgress({});
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao enviar documentos:', error);
      toast({
        title: 'Erro ao enviar documentos',
        description: error.message || 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      setUploadProgress({});
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: DocumentFormData) => {
      if (!editingDocument?.id) throw new Error('ID do documento não encontrado');

      const { error } = await supabase
        .from('documents')
        .update({
          title: data.title,
          owner_type: data.owner_type,
          owner_id: data.owner_id || null,
          tags: data.tags || [],
        })
        .eq('id', editingDocument.id)
        .eq('organization_id', context.orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Documento atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      onEditingChange?.(null);
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao atualizar documento:', error);
      toast({
        title: 'Erro ao atualizar documento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('edu-docs')
        .createSignedUrl(filePath, 3600); // 1 hora

      if (error) throw error;

      // Abrir em nova aba
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Erro ao gerar URL do documento:', error);
      toast({
        title: 'Erro ao acessar documento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const deleteDocument = async (docId: string, filePath: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      // Excluir arquivo do storage
      await supabase.storage
        .from('edu-docs')
        .remove([filePath]);

      // Excluir registro do banco
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)
        .eq('organization_id', context.orgId);

      if (error) throw error;

      toast({ title: 'Documento excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: 'Erro ao excluir documento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: DocumentFormData) => {
    setIsSubmitting(true);
    try {
      if (editingDocument) {
        await updateDocumentMutation.mutateAsync(data);
      } else {
        await createDocumentMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {editingDocument ? 'Editar Documento' : 'Novo Documento'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Gerencie documentos e arquivos da instituição.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o título do documento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Proprietário *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ownerTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Proprietário</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="ID específico (opcional)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!editingDocument && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload de Arquivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Formatos aceitos: PDF, Imagens (JPG, PNG), Word, Excel
                      </p>
                    </div>

                    {selectedFiles.length > 0 && (
                      <div className="space-y-2">
                        <Label>Arquivos Selecionados:</Label>
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm">{file.name}</span>
                              <Badge variant="outline">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </Badge>
                            </div>
                            {uploadProgress[file.name] !== undefined && (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-secondary rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress[file.name]}%` }}
                                  />
                                </div>
                                <span className="text-xs">{uploadProgress[file.name]}%</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {editingDocument && existingFiles.length > 0 && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Arquivos Existentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {existingFiles.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{doc.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => downloadDocument(doc.file_path, doc.title)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => deleteDocument(doc.id, doc.file_path)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onEditingChange?.(null)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || (!editingDocument && selectedFiles.length === 0)}
            >
              {isSubmitting ? 'Salvando...' : editingDocument ? 'Atualizar' : 'Enviar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}