
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Search, UserPlus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnrollmentInsert, EnrollmentUpdate } from '@/integrations/supabase/db-types';
import { useOrganization } from '@/hooks/useOrganization';
import { SubmodalMatriculas } from '@/features/secretaria/matriculas/SubmodalMatriculas';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const enrollmentSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno'),
  class_id: z.string().uuid('Selecione uma turma'),
  status: z.enum(['ativa', 'trancada', 'concluida', 'transferida']).default('ativa'),
  enrollment_date: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export default function Matriculas() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'matriculas');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Função para fechar o modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };

  // Hook para obter organização do usuário
  const { data: orgData, isLoading: isLoadingOrg } = useOrganization();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      student_id: '',
      class_id: '',
      status: 'ativa',
      enrollment_date: new Date().toISOString().split('T')[0],
    },
  });

  // Query para listar matrículas com joins
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['enrollments', searchTerm, statusFilter, classFilter, yearFilter],
    queryFn: async () => {
      let query = supabase
        .from('enrollments')
        .select(`
          *,
          students!inner(id, first_name, last_name),
          classes!inner(id, name, year, grade, shift)
        `);

      // Filtros
      if (searchTerm) {
        query = query.or(`students.first_name.ilike.%${searchTerm}%,students.last_name.ilike.%${searchTerm}%`);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (classFilter && classFilter !== 'all') {
        query = query.eq('class_id', classFilter);
      }

      if (yearFilter && yearFilter !== 'all') {
        // Corrigindo o erro: convertendo string para number explicitamente
        const yearNumber = Number(yearFilter);
        if (!isNaN(yearNumber)) {
          query = query.eq('classes.year', yearNumber);
        }
      }

      const { data, error } = await query.order('enrollment_date', { ascending: false });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar matrículas',
          description: error.message,
        });
        throw error;
      }

      return data;
    },
  });

  // Query para carregar alunos para o select
  const { data: students } = useQuery({
    queryKey: ['students-for-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('status', 'ativo')
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes-for-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, grade, shift')
        .order('year', { ascending: false })
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  const { data: years } = useQuery({
    queryKey: ['classes-years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('year')
        .order('year', { ascending: false });

      if (error) throw error;
      
      const uniqueYears = [...new Set(data.map(item => item.year))];
      return uniqueYears;
    },
  });

  // Mutation para criar/editar matrícula
  const enrollmentMutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      if (editingEnrollment) {
        const payload: EnrollmentUpdate = {
          student_id: data.student_id,
          class_id: data.class_id,
          status: data.status,
          enrollment_date: data.enrollment_date || undefined,
        };

        const { data: updated, error } = await supabase
          .from('enrollments')
          .update(payload)
          .eq('id', editingEnrollment.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        if (!orgData?.organization_id) throw new Error('Organization ID não encontrado');
        
        const payload: EnrollmentInsert = {
          organization_id: orgData.organization_id,
          student_id: data.student_id,
          class_id: data.class_id,
          status: data.status,
          enrollment_date: data.enrollment_date || undefined,
        };

        const { data: created, error } = await supabase
          .from('enrollments')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast({
        title: editingEnrollment ? 'Matrícula atualizada' : 'Matrícula criada',
        description: editingEnrollment ? 'Matrícula atualizada com sucesso.' : 'Nova matrícula criada com sucesso.',
      });
      setIsCreateOpen(false);
      setEditingEnrollment(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar matrícula',
        description: error.message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast({
        title: 'Matrícula removida',
        description: 'Matrícula removida com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover matrícula',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: EnrollmentFormData) => {
    enrollmentMutation.mutate(data);
  };

  const handleEdit = (enrollment: any) => {
    setEditingEnrollment(enrollment);
    form.reset({
      student_id: enrollment.student_id,
      class_id: enrollment.class_id,
      status: enrollment.status,
      enrollment_date: enrollment.enrollment_date || '',
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      ativa: 'Ativa',
      trancada: 'Trancada',
      concluida: 'Concluída',
      transferida: 'Transferida',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ativa: 'text-emerald-600 bg-emerald-50',
      trancada: 'text-amber-600 bg-amber-50',
      concluida: 'text-sky-600 bg-sky-50',
      transferida: 'text-gray-600 bg-gray-50',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Context para o submodal
  const modalContext = {
    orgId: orgData?.organization_id || '',
    onSaved: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setIsCreateOpen(false);
      setEditingEnrollment(null);
    },
    onClose: () => {
      setIsCreateOpen(false);
      setEditingEnrollment(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Matrículas</h1>
          <p className="text-muted-foreground">Gerenciar matrículas de alunos</p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingEnrollment(null);
              form.reset({
                student_id: '',
                class_id: '',
                status: 'ativa',
                enrollment_date: new Date().toISOString().split('T')[0],
              });
            }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Nova Matrícula
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEnrollment ? 'Editar Matrícula' : 'Nova Matrícula'}
              </DialogTitle>
            </DialogHeader>
            <SubmodalMatriculas
              context={modalContext}
              editingEnrollment={editingEnrollment}
              onEditingChange={setEditingEnrollment}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ativa">Ativa</SelectItem>
                <SelectItem value="trancada">Trancada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
                <SelectItem value="transferida">Transferida</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classes?.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {years?.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de matrículas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Matrículas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : enrollments && enrollments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data da Matrícula</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      {enrollment.students.first_name} {enrollment.students.last_name}
                    </TableCell>
                    <TableCell>
                      {enrollment.classes.name}
                      {enrollment.classes.grade && ` - ${enrollment.classes.grade}`}
                    </TableCell>
                    <TableCell>{enrollment.classes.year}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                        {getStatusLabel(enrollment.status)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(enrollment.enrollment_date)}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(enrollment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover esta matrícula? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(enrollment.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <UserPlus className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-semibold text-muted-foreground">Nenhuma matrícula encontrada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece criando uma nova matrícula.
              </p>
              <div className="mt-6">
                <Button onClick={() => setIsCreateOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nova Matrícula
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalMestre
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        defaultTab="matriculas"
      />
    </div>
  );
}
