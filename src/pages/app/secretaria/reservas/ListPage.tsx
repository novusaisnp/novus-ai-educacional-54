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
import { ClipboardList, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

export default function SecretariaReservasListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'reservas');

  const { data: reservas = [], isLoading } = useQuery({
    queryKey: ['seat_reservations', orgData?.organization_id],
    queryFn: async () => {
      // Placeholder query since seat_reservations table doesn't exist yet
      return [];
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteReserva = useMutation({
    mutationFn: async (id: string) => {
      // Placeholder mutation
      throw new Error('Funcionalidade ainda não implementada');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seat_reservations'] });
      toast({ title: 'Reserva excluída com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir reserva',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['seat_reservations'] });
  };

  const filteredReservas = reservas.filter(reserva => {
    const matchesSearch = reserva.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reserva.guardian_name && reserva.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || reserva.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusOptions = [
    { value: 'all', label: 'Todos os status' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'confirmada', label: 'Confirmada' },
    { value: 'matriculada', label: 'Matriculada' },
    { value: 'expirada', label: 'Expirada' },
    { value: 'cancelada', label: 'Cancelada' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Reservas de Vaga</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Reserva
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
          <CardTitle>Lista de Reservas ({filteredReservas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredReservas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma reserva encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhuma reserva corresponde aos critérios de busca.' : 'Ainda não há reservas de vaga cadastradas.'}
              </p>
              <Button onClick={handleOpenModal}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeira Reserva
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Aluno</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Série Desejada</TableHead>
                  <TableHead>Data da Reserva</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservas.map((reserva) => (
                  <TableRow key={reserva.id}>
                    <TableCell className="font-medium">{reserva.student_name}</TableCell>
                    <TableCell>{reserva.guardian_name}</TableCell>
                    <TableCell>{reserva.desired_grade}</TableCell>
                    <TableCell>{new Date(reserva.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{reserva.expires_at ? new Date(reserva.expires_at).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          reserva.status === 'confirmada' ? 'default' :
                          reserva.status === 'matriculada' ? 'default' :
                          reserva.status === 'expirada' ? 'destructive' :
                          reserva.status === 'cancelada' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {statusOptions.find(s => s.value === reserva.status)?.label || reserva.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteReserva.mutate(reserva.id)}
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
        defaultTab="reservas"
      />
    </div>
  );
}