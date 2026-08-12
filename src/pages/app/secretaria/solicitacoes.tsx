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
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HelpCircle, Search, Plus, Edit, Trash2, Paperclip, Download } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SubmodalSolicitacoes } from '@/features/secretaria/solicitacoes/SubmodalSolicitacoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { RequestRow } from '@/integrations/supabase/db-types';

const REQUEST_TYPES = [
  { value: 'declaracao', label: 'Declaração' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'segunda_via', label: 'Segunda Via' },
  { value: 'historico', label: 'Histórico Escolar' },
  { value: 'outros', label: 'Outros' },
];

const STATUS_OPTIONS = [
  { value: 'aberta', label: 'Aberta', variant: 'secondary' as const },
  { value: 'em_andamento', label: 'Em Andamento', variant: 'default' as const },
  { value: 'concluida', label: 'Concluída', variant: 'outline' as const },
  { value: 'cancelada', label: 'Cancelada', variant: 'destructive' as const },
];

export default function SecretariaSolicitacoes() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'solicitacoes');
  const [editingRequest, setEditingRequest] = useState<RequestRow | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      toast({ title: 'Solicitação excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir solicitação',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const handleCloseEdit = () => {
    setEditingRequest(null);
    queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const editModalContext = {
    orgId: orgData?.organization_id || '',
    onSaved: handleCloseEdit,
    onClose: handleCloseEdit,
  };

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('edu-docs')
      .createSignedUrl(path, 3600);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao acessar documento',
        description: error.message,
      });
      return;
    }

    window.open(data.signedUrl, '_blank');
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.request_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || request.request_type === selectedType;
    const matchesStatus = selectedStatus === 'all' || request.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getRequestTypeLabel = (type: string) => {
    return REQUEST_TYPES.find(t => t.value === type)?.label || type;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? { label: statusOption.label, variant: statusOption.variant } : { label: status, variant: 'secondary' as const };
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <HelpCircle className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Solicitações</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Solicitação
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
                  placeholder="Buscar por tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {REQUEST_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitações ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma solicitação encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhuma solicitação corresponde aos critérios de busca.' : 'Ainda não há solicitações cadastradas.'}
              </p>
              <Button onClick={handleOpenModal}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeira Solicitação
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const statusBadge = getStatusBadge(request.status);
                  return (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">
                        {getRequestTypeLabel(request.request_type)}
                      </TableCell>
                      <TableCell>{request.requester_type}</TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {(request.payload as { document_path?: string } | null)?.document_path && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload((request.payload as { document_path: string }).document_path)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditingRequest(request)}>
                            <Paperclip className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingRequest(request)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRequest.mutate(request.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ModalMestre
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        defaultTab="solicitacoes"
      />

      <Dialog open={!!editingRequest} onOpenChange={(open) => !open && setEditingRequest(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Solicitação</DialogTitle>
          </DialogHeader>
          {editingRequest && (
            <SubmodalSolicitacoes
              context={editModalContext}
              editingSolicitacao={editingRequest}
              onEditingChange={(r) => setEditingRequest(r as RequestRow | null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}