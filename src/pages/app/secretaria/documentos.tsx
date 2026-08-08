import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Plus, Download, Eye, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const OWNER_TYPES = [
  { value: 'student', label: 'Aluno' },
  { value: 'guardian', label: 'Responsável' },
  { value: 'request', label: 'Solicitação' },
  { value: 'other', label: 'Outros' },
];

export default function SecretariaDocumentos() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOwnerType, setSelectedOwnerType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'documentos');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', orgData?.organization_id, selectedOwnerType],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (selectedOwnerType !== 'all') {
        query = query.eq('owner_type', selectedOwnerType);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({ title: 'Documento excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir documento',
        description: error.message,
      });
    },
  });

  const handleView = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('docs')
        .createSignedUrl(filePath.replace('docs/', ''), 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao visualizar documento',
        description: (error as Error).message,
      });
    }
  };

  const handleDownload = async (filePath: string, title: string) => {
    try {
      const { data } = await supabase.storage
        .from('docs')
        .createSignedUrl(filePath.replace('docs/', ''), 3600);

      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao baixar documento',
        description: (error as Error).message,
      });
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOwnerTypeLabel = (ownerType: string) => {
    return OWNER_TYPES.find(type => type.value === ownerType)?.label || ownerType;
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Documentos</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedOwnerType} onValueChange={setSelectedOwnerType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo de proprietário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {OWNER_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Documentos ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Data Upload</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getOwnerTypeLabel(document.owner_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {document.tags && document.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {document.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {document.tags.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{document.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{formatDate(document.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownload(document.file_path, document.title)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleView(document.file_path)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir este documento? Se ele estiver anexado a um contrato, ata ou guia de transferência assinados, a referência será desvinculada em silêncio.')) {
                              deleteDocument.mutate(document.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalMestre
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        defaultTab="documentos"
      />
    </div>
  );
}