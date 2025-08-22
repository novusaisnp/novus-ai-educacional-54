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
import { UserMinus, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SecretariaVisitantes() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'visitantes');

  const { data: visitors = [], isLoading } = useQuery({
    queryKey: ['visitors', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('visit_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteVisitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('visitors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visitante excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir visitante',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['visitors'] });
  };

  const filteredVisitors = visitors.filter(visitor =>
    visitor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (visitor.document && visitor.document.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserMinus className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Visitantes</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Visitante
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
                  placeholder="Buscar por nome ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Visitantes ({filteredVisitors.length})</CardTitle>
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Data/Hora Visita</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell className="font-medium">{visitor.full_name}</TableCell>
                    <TableCell>{visitor.document || '-'}</TableCell>
                    <TableCell>{visitor.phone || '-'}</TableCell>
                    <TableCell>{formatDateTime(visitor.visit_date)}</TableCell>
                    <TableCell>{visitor.purpose || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteVisitor.mutate(visitor.id)}
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
        defaultTab="visitantes"
      />
    </div>
  );
}