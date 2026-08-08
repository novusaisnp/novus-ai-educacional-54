
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SubjectInsert, SubjectUpdate } from '@/integrations/supabase/db-types';
import type { Database } from '@/integrations/supabase/types';

type Subject = Database['public']['Tables']['subjects']['Row'];
import { useOrganization } from '@/hooks/useOrganization';
import { SubmodalDisciplinas } from '@/features/secretaria/disciplinas/SubmodalDisciplinas';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';

const subjectSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  code: z.string().optional(),
  bncc_axis: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export default function Disciplinas() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'disciplinas');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['subjects'] });
  };

  // Hook para obter organização do usuário
  const { data: orgData, isLoading: isLoadingOrg } = useOrganization();

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      code: '',
      bncc_axis: '',
    },
  });

  // Query para listar disciplinas
  const { data: subjects, isLoading } = useQuery({
    queryKey: ['subjects', searchTerm],
    queryFn: async () => {
      let query = supabase.from('subjects').select('*');

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.order('name');

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar disciplinas',
          description: error.message,
        });
        throw error;
      }

      return data;
    },
  });

  // Mutation para criar/editar disciplina
  const subjectMutation = useMutation({
    mutationFn: async (data: SubjectFormData) => {
      if (editingSubject) {
        const payload: SubjectUpdate = {
          name: data.name,
          code: data.code || undefined,
          bncc_axis: data.bncc_axis || undefined,
        };

        const { data: updated, error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', editingSubject.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        if (!orgData?.organization_id) throw new Error('Organization ID não encontrado');
        
        const payload: SubjectInsert = {
          organization_id: orgData.organization_id,
          name: data.name,
          code: data.code || undefined,
          bncc_axis: data.bncc_axis || undefined,
        };

        const { data: created, error } = await supabase
          .from('subjects')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: editingSubject ? 'Disciplina atualizada' : 'Disciplina criada',
        description: editingSubject ? 'Disciplina atualizada com sucesso.' : 'Nova disciplina criada com sucesso.',
      });
      setIsCreateOpen(false);
      setEditingSubject(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar disciplina',
        description: error.message,
      });
    },
  });

  // Mutation para deletar disciplina
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: 'Disciplina removida',
        description: 'Disciplina removida com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover disciplina',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: SubjectFormData) => {
    subjectMutation.mutate(data);
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    form.reset({
      name: subject.name,
      code: subject.code,
      bncc_axis: subject.bncc_axis || '',
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover esta disciplina?')) {
      deleteMutation.mutate(id);
    }
  };

  // Context para o submodal
  const modalContext = {
    orgId: orgData?.organization_id || '',
    onSaved: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setIsCreateOpen(false);
      setEditingSubject(null);
    },
    onClose: () => {
      setIsCreateOpen(false);
      setEditingSubject(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Disciplinas</h1>
          <p className="text-muted-foreground">Gerenciar disciplinas da instituição</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingSubject(null);
              form.reset();
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Disciplina
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? 'Editar Disciplina' : 'Nova Disciplina'}
              </DialogTitle>
            </DialogHeader>
            <SubmodalDisciplinas
              context={modalContext}
              editingSubject={editingSubject}
              onEditingChange={setEditingSubject}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
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
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de disciplinas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Disciplinas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Eixo BNCC</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects?.map((subject) => (
                  <TableRow key={subject.id}>
                    <TableCell className="font-medium">{subject.name}</TableCell>
                    <TableCell>{subject.code}</TableCell>
                    <TableCell>{subject.bncc_axis || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(subject)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(subject.id)}
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
        defaultTab="disciplinas"
      />
    </div>
  );
}
