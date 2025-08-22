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
import { HelpCircle, Search, Plus, Edit, Trash2, Download } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

export default function SecretariaSolicitacoesListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'solicitacoes');

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['service_requests', orgData?.organization_id],
    queryFn: async () => {
      // Placeholder query since service_requests table doesn't exist yet
      return [];
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteSolicitacao = useMutation({
    mutationFn: async (id: string) => {
      // Placeholder mutation
      throw new Error('Funcionalidade ainda não implementada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service_requests'] });
      toast({ title: 'Solicitação excluída com sucesso!' });
    },
    onError: (error: any) => {
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
    queryClient.invalidateQueries({ queryKey: ['service_requests'] });
  };

  const filteredSolicitacoes = solicitacoes.filter(solicitacao => {
    const matchesSearch = solicitacao.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (solicitacao.student_name && solicitacao.student_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = selectedType === 'all' || solicitacao.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || solicitacao.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const typeOptions = [
    { value: 'all', label: 'Todos os tipos' },
    { value: 'declaracao', label: 'Declaração' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'segunda_via', label: 'Segunda Via' },
    { value: 'historico', label: 'Histórico' },
    { value: 'outros', label: 'Outros' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'em_andamento', label: 'Em Andamento' },
    { value: 'concluida', label: 'Concluída' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

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
                  placeholder="Buscar por título ou nome do aluno..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitações ({filteredSolicitacoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredSolicitacoes.length === 0 ? (
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
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSolicitacoes.map((solicitacao) => (
                  <TableRow key={solicitacao.id}>
                    <TableCell className="font-medium">{solicitacao.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeOptions.find(t => t.value === solicitacao.type)?.label || solicitacao.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{solicitacao.student_name || '-'}</TableCell>
                    <TableCell>{new Date(solicitacao.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          solicitacao.status === 'concluida' ? 'default' :
                          solicitacao.status === 'em_andamento' ? 'secondary' :
                          solicitacao.status === 'cancelada' ? 'destructive' :
                          'outline'
                        }
                      >
                        {statusOptions.find(s => s.value === solicitacao.status)?.label || solicitacao.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {solicitacao.document_path && (
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteSolicitacao.mutate(solicitacao.id)}
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
        defaultTab="solicitacoes"
      />
    </div>
  );
}