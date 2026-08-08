
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import { ClassInsert, ClassUpdate } from '@/integrations/supabase/db-types';
import { useOrganization } from '@/hooks/useOrganization';
import { SubmodalTurmas } from '@/features/secretaria/turmas/SubmodalTurmas';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import type { Database } from '@/integrations/supabase/types';

type ClassWithEnrollmentCount = Database['public']['Tables']['classes']['Row'] & {
  enrollments: { count: number }[];
};

export default function Turmas() {
  const [searchParams] = useSearchParams();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassWithEnrollmentCount | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'turmas');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['classes.list'] });
  };

  // Hook para obter organização do usuário
  const { data: orgData, isLoading: isLoadingOrg } = useOrganization();

  // Query para listar turmas
  const { data: classes, isLoading } = useQuery({
    queryKey: ['classes.list', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          enrollments(count)
        `)
        .order('year', { ascending: false })
        .order('name');

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar turmas',
          description: error.message,
        });
        throw error;
      }

      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  // Mutation para deletar turma
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes.list'] });
      toast({
        title: 'Turma removida',
        description: 'Turma removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover turma',
        description: error.message,
      });
    },
  });

  const handleEdit = (classItem: ClassWithEnrollmentCount) => {
    setEditingClass(classItem);
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta turma?')) {
      deleteMutation.mutate(id);
    }
  };

  const getShiftLabel = (shift: string) => {
    const labels = {
      manha: 'Manhã',
      tarde: 'Tarde',
      noite: 'Noite',
    };
    return labels[shift as keyof typeof labels] || shift;
  };

  // Context para o submodal
  const modalContext = {
    orgId: orgData?.organization_id || '',
    onSaved: () => {
      queryClient.invalidateQueries({ queryKey: ['classes.list'] });
      setIsCreateOpen(false);
      setEditingClass(null);
    },
    onClose: () => {
      setIsCreateOpen(false);
      setEditingClass(null);
    },
  };

  if (isLoadingOrg) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Turmas</h1>
          <p className="text-muted-foreground">Gerenciar turmas da instituição</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingClass(null);
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? 'Editar Turma' : 'Nova Turma'}
              </DialogTitle>
            </DialogHeader>
            <SubmodalTurmas
              context={modalContext}
              editingClass={editingClass}
              onEditingChange={(classItem) => setEditingClass(classItem as ClassWithEnrollmentCount | null)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela de turmas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Turmas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Total de Alunos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes?.map((classItem) => (
                  <TableRow key={classItem.id}>
                    <TableCell className="font-medium">{classItem.name}</TableCell>
                    <TableCell>{classItem.year}</TableCell>
                    <TableCell>{getShiftLabel(classItem.shift)}</TableCell>
                    <TableCell>{classItem.grade || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        {classItem.enrollments?.[0]?.count || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(classItem)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(classItem.id)}
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
        defaultTab="turmas"
      />
    </div>
  );
}
