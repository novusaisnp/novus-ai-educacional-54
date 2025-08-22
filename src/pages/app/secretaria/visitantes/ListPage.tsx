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
import { UserMinus, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

export default function SecretariaVisitantesListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'visitantes');

  const { data: visitantes = [], isLoading } = useQuery({
    queryKey: ['visitors', orgData?.organization_id],
    queryFn: async () => {
      // Placeholder query since visitors table doesn't exist yet
      return [];
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteVisitante = useMutation({
    mutationFn: async (id: string) => {
      // Placeholder mutation
      throw new Error('Funcionalidade ainda não implementada');
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

  const filteredVisitantes = visitantes.filter(visitante =>
    visitante.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (visitante.document && visitante.document.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <CardTitle>Lista de Visitantes ({filteredVisitantes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredVisitantes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserMinus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum visitante encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'Nenhum visitante corresponde aos critérios de busca.' : 'Ainda não há visitantes cadastrados.'}
              </p>
              <Button onClick={handleOpenModal}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Visitante
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Última Visita</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitantes.map((visitante) => (
                  <TableRow key={visitante.id}>
                    <TableCell className="font-medium">{visitante.name}</TableCell>
                    <TableCell>{visitante.document || '-'}</TableCell>
                    <TableCell>{visitante.phone || '-'}</TableCell>
                    <TableCell>{visitante.last_visit ? new Date(visitante.last_visit).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <Badge variant="default">Ativo</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteVisitante.mutate(visitante.id)}
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