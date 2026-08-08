import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Upload, FileText, Download, Trash2, Eye, ClipboardList } from 'lucide-react';
import { SecretariaModalContext } from '../types';

const solicitacaoSchema = z.object({
  request_type: z.string().min(1, 'Tipo de solicitação é obrigatório'),
  requester_type: z.string().min(1, 'Tipo de solicitante é obrigatório'),
  requester_id: z.string().optional(),
  payload: z.record(z.any()).optional(),
  notes: z.string().optional(),
  files: z.array(z.instanceof(File)).optional(),
});

type SolicitacaoFormData = z.infer<typeof solicitacaoSchema>;

interface SubmodalSolicitacoesProps {
  context: SecretariaModalContext;
  editingSolicitacao?: any;
  onEditingChange?: (solicitacao: any) => void;
}

const requestTypes = [
  { value: 'declaracao_matricula', label: 'Declaração de Matrícula' },
  { value: 'declaracao_conclusao', label: 'Declaração de Conclusão' },
  { value: 'historico_escolar', label: 'Histórico Escolar' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'segunda_via_documento', label: '2ª Via de Documento' },
  { value: 'atestado_frequencia', label: 'Atestado de Frequência' },
  { value: 'cancelamento_matricula', label: 'Cancelamento de Matrícula' },
  { value: 'outro', label: 'Outro' },
];

const requesterTypes = [
  { value: 'student', label: 'Estudante' },
  { value: 'guardian', label: 'Responsável' },
  { value: 'staff', label: 'Funcionário' },
  { value: 'third_party', label: 'Terceiro' },
];

const statusOptions = [
  { value: 'aberta', label: 'Aberta', variant: 'default' as const },
  { value: 'em_andamento', label: 'Em Andamento', variant: 'secondary' as const },
  { value: 'concluida', label: 'Concluída', variant: 'default' as const },
  { value: 'cancelada', label: 'Cancelada', variant: 'destructive' as const },
];

export function SubmodalSolicitacoes({ 
  context, 
  editingSolicitacao, 
  onEditingChange 
}: SubmodalSolicitacoesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const form = useForm<SolicitacaoFormData>({
    resolver: zodResolver(solicitacaoSchema),
    defaultValues: {
      request_type: editingSolicitacao?.request_type || '',
      requester_type: editingSolicitacao?.requester_type || '',
      requester_id: editingSolicitacao?.requester_id || '',
      payload: editingSolicitacao?.payload || {},
      notes: editingSolicitacao?.notes || '',
    },
  });

  // Buscar documentos anexos se editando
  const { data: attachments = [] } = useQuery({
    queryKey: ['request-attachments', editingSolicitacao?.id],
    queryFn: async () => {
      if (!editingSolicitacao?.id) return [];
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('owner_type', 'service_request')
        .eq('owner_id', editingSolicitacao.id)
        .eq('organization_id', context.orgId);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!editingSolicitacao?.id && !!context.orgId,
  });

  const createSolicitacaoMutation = useMutation({
    mutationFn: async (data: SolicitacaoFormData) => {
      // Criar solicitação
      const { data: solicitacao, error } = await supabase
        .from('requests')
        .insert({
          request_type: data.request_type,
          requester_type: data.requester_type,
          requester_id: data.requester_id || null,
          payload: data.payload || {},
          status: 'aberta',
          organization_id: context.orgId,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload de arquivos anexos
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${context.orgId}/service_request/${solicitacao.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

          // Upload do arquivo
          const { error: uploadError } = await supabase.storage
            .from('edu-docs')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

          // Criar registro do documento
          const { error: docError } = await supabase
            .from('documents')
            .insert({
              title: `Anexo - ${file.name}`,
              file_path: fileName,
              owner_type: 'service_request',
              owner_id: solicitacao.id,
              organization_id: context.orgId,
            });

          if (docError) throw docError;
        }
      }

      return solicitacao;
    },
    onSuccess: () => {
      toast({ title: 'Solicitação criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      form.reset();
      setSelectedFiles([]);
      setUploadProgress({});
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao criar solicitação:', error);
      toast({
        title: 'Erro ao criar solicitação',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      setUploadProgress({});
    },
  });

  const updateSolicitacaoMutation = useMutation({
    mutationFn: async (data: SolicitacaoFormData) => {
      if (!editingSolicitacao?.id) throw new Error('ID da solicitação não encontrado');

      const { error } = await supabase
        .from('requests')
        .update({
          request_type: data.request_type,
          requester_type: data.requester_type,
          requester_id: data.requester_id || null,
          payload: data.payload || {},
        })
        .eq('id', editingSolicitacao.id)
        .eq('organization_id', context.orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Solicitação atualizada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      onEditingChange?.(null);
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao atualizar solicitação:', error);
      toast({
        title: 'Erro ao atualizar solicitação',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (!editingSolicitacao?.id) throw new Error('ID da solicitação não encontrado');

      const { error } = await supabase
        .from('requests')
        .update({ status: newStatus })
        .eq('id', editingSolicitacao.id)
        .eq('organization_id', context.orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Status atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar status',
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
      queryClient.invalidateQueries({ queryKey: ['request-attachments', editingSolicitacao?.id] });
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: 'Erro ao excluir documento',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: SolicitacaoFormData) => {
    setIsSubmitting(true);
    try {
      if (editingSolicitacao) {
        await updateSolicitacaoMutation.mutateAsync(data);
      } else {
        await createSolicitacaoMutation.mutateAsync(data);
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
          {editingSolicitacao ? 'Editar Solicitação' : 'Nova Solicitação'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Gerencie solicitações de serviços e documentos.
        </p>
      </div>

      {editingSolicitacao && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Status da Solicitação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge 
                variant={statusOptions.find(s => s.value === editingSolicitacao.status)?.variant}
              >
                {statusOptions.find(s => s.value === editingSolicitacao.status)?.label}
              </Badge>
              <Select 
                defaultValue={editingSolicitacao.status} 
                onValueChange={(value) => updateStatusMutation.mutate(value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Solicitação *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {requestTypes.map((type) => (
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
              name="requester_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Solicitante *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {requesterTypes.map((type) => (
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
              name="requester_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Solicitante</FormLabel>
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

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Detalhes adicionais sobre a solicitação..."
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!editingSolicitacao && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Anexos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                      />
                      <p className="text-sm text-muted-foreground mt-2">
                        Formatos aceitos: PDF, Imagens (JPG, PNG), Word
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

          {editingSolicitacao && attachments.length > 0 && (
            <>
              <Separator />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Anexos Existentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attachments.map((doc) => (
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
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : editingSolicitacao ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}