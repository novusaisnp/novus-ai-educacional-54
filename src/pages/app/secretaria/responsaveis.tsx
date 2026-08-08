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
import { UserPlus, Search, Plus, Edit, Trash2 } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import type { GuardianRow } from '@/integrations/supabase/db-types';

type GuardianWithLinks = GuardianRow & { student_guardians: { id: string }[] };

export default function SecretariaResponsaveis() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'responsaveis');
  const [editingItem, setEditingItem] = useState<GuardianWithLinks | undefined>(undefined);

  const { data: guardians = [], isLoading } = useQuery({
    queryKey: ['guardians', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guardians')
        .select(`
          *,
          student_guardians(id)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteGuardian = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guardians')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      toast({ title: 'Responsável excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        variant: 'destructive',
        title: 'Erro ao excluir responsável',
        description: error.message 
      });
    },
  });

  const handleOpenModal = () => {
    setEditingItem(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (guardian: GuardianWithLinks) => {
    setEditingItem(guardian);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(undefined);
    queryClient.invalidateQueries({ queryKey: ['guardians'] });
  };

  const filteredGuardians = guardians.filter(guardian =>
    guardian.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (guardian.email && guardian.email.toLowerCase().includes(searchTerm.toLowerCase()))
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
                  placeholder="Buscar por nome ou email..."
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
          <CardTitle>Lista de Responsáveis ({filteredGuardians.length})</CardTitle>
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
                  <TableHead>Relacionamento</TableHead>
                  <TableHead>Alunos Vinculados</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuardians.map((guardian) => (
                  <TableRow key={guardian.id}>
                    <TableCell className="font-medium">{guardian.name}</TableCell>
                    <TableCell>{guardian.email || '-'}</TableCell>
                    <TableCell>{guardian.phone || '-'}</TableCell>
                    <TableCell>{guardian.relationship || '-'}</TableCell>
                    <TableCell>{guardian.student_guardians?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(guardian)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const hasLinkedStudents = (guardian.student_guardians?.length || 0) > 0;
                            const message = hasLinkedStudents
                              ? `Tem certeza que deseja excluir este responsável? O vínculo com ${guardian.student_guardians.length} aluno(s) será removido junto, sem opção de desfazer.`
                              : 'Tem certeza que deseja excluir este responsável?';
                            if (confirm(message)) {
                              deleteGuardian.mutate(guardian.id);
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
        defaultTab="responsaveis"
        editingItem={editingItem}
      />
    </div>
  );
}