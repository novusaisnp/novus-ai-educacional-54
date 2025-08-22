import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { auditPII } from '@/lib/pii';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

export default function SecretariaResponsaveisListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'responsaveis');

  const { data: responsaveis = [], isLoading } = useQuery({
    queryKey: ['v_guardians_safe', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_guardians_safe')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteResponsavel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guardians')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['v_guardians_safe'] });
      toast({ title: 'Responsável excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir responsável',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['v_guardians_safe'] });
  };

  // Auditar PII quando admin/coord/secretario visualizar dados completos
  const handleViewDetails = async (responsavel: any) => {
    if (userRole && ['admin', 'coordenacao', 'secretario'].includes(userRole)) {
      const piiColumns = [];
      if (responsavel.phone) piiColumns.push('phone');
      if (responsavel.email) piiColumns.push('email');
      
      if (piiColumns.length > 0) {
        await auditPII('guardians', responsavel.id, piiColumns);
      }
    }
  };

  const filteredResponsaveis = responsaveis.filter(responsavel =>
    responsavel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (responsavel.email && responsavel.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserPlus className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Responsáveis</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Responsável
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
                  placeholder="Buscar por nome ou e-mail..."
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
          <CardTitle>Lista de Responsáveis ({filteredResponsaveis.length})</CardTitle>
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
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Relacionamento</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponsaveis.map((responsavel) => (
                  <TableRow key={responsavel.id}>
                    <TableCell className="font-medium">
                      {responsavel.name}
                    </TableCell>
                    <TableCell>{responsavel.email || '-'}</TableCell>
                    <TableCell>{responsavel.phone || '-'}</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {responsavel.relationship || 'Não informado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(responsavel)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteResponsavel.mutate(responsavel.id)}
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
        defaultTab="responsaveis"
      />
    </div>
  );
}