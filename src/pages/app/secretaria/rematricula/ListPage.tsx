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
import { RotateCcw, Search, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

export default function SecretariaRematriculaListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'rematricula');

  const { data: rematriculas = [], isLoading } = useQuery({
    queryKey: ['re_enrollments', orgData?.organization_id],
    queryFn: async () => {
      // Placeholder query since re_enrollments table doesn't exist yet
      return [];
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteRematricula = useMutation({
    mutationFn: async (id: string) => {
      // Placeholder mutation
      throw new Error('Funcionalidade ainda não implementada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
      toast({ title: 'Rematrícula excluída com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir rematrícula',
        description: error.message 
      });
    },
  });

  const approveRematricula = useMutation({
    mutationFn: async (id: string) => {
      // Placeholder mutation
      throw new Error('Funcionalidade ainda não implementada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
      toast({ title: 'Rematrícula aprovada com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao aprovar rematrícula',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
  };

  const filteredRematriculas = rematriculas.filter(rematricula => {
    const matchesSearch = rematricula.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rematricula.guardian_name && rematricula.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || rematricula.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'em_analise', label: 'Em Análise' },
    { value: 'aprovada', label: 'Aprovada' },
    { value: 'finalizada', label: 'Finalizada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <RotateCcw className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Rematrícula</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Rematrícula
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
                  placeholder="Buscar por nome do aluno ou responsável..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
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
          <CardTitle>Lista de Rematrículas ({filteredRematriculas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredRematriculas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma rematrícula encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhuma rematrícula corresponde aos critérios de busca.' : 'Ainda não há rematrículas cadastradas.'}
              </p>
              <Button onClick={handleOpenModal}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeira Rematrícula
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Aluno</TableHead>
                  <TableHead>Série Atual</TableHead>
                  <TableHead>Série Destino</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRematriculas.map((rematricula) => (
                  <TableRow key={rematricula.id}>
                    <TableCell className="font-medium">{rematricula.student_name}</TableCell>
                    <TableCell>{rematricula.current_grade}</TableCell>
                    <TableCell>{rematricula.target_grade}</TableCell>
                    <TableCell>{rematricula.guardian_name}</TableCell>
                    <TableCell>{new Date(rematricula.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          rematricula.status === 'aprovada' ? 'default' :
                          rematricula.status === 'finalizada' ? 'default' :
                          rematricula.status === 'em_analise' ? 'secondary' :
                          rematricula.status === 'cancelada' ? 'destructive' :
                          'outline'
                        }
                      >
                        {statusOptions.find(s => s.value === rematricula.status)?.label || rematricula.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {rematricula.status === 'pendente' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => approveRematricula.mutate(rematricula.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteRematricula.mutate(rematricula.id)}
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
        defaultTab="rematricula"
      />
    </div>
  );
}