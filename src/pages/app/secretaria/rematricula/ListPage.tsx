import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Search, Plus, Trash2, CheckCircle, Check, Users } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', variant: 'secondary' as const },
  { value: 'em_analise', label: 'Em Análise', variant: 'secondary' as const },
  { value: 'aprovada', label: 'Aprovada', variant: 'default' as const },
  { value: 'finalizada', label: 'Finalizada', variant: 'outline' as const },
  { value: 'cancelada', label: 'Cancelada', variant: 'destructive' as const },
];

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
      const { data, error } = await supabase
        .from('re_enrollments')
        .select(`
          *,
          students(first_name, last_name),
          current_class:classes!re_enrollments_current_class_id_fkey(name, grade, year),
          target_class:classes!re_enrollments_target_class_id_fkey(name, grade, year)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteRematricula = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('re_enrollments')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
      toast({ title: 'Rematrícula excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir rematrícula',
        description: error.message,
      });
    },
  });

  const approveRematricula = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('re_enrollments')
        .update({ status: 'aprovada' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
      toast({ title: 'Rematrícula aprovada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar rematrícula',
        description: error.message,
      });
    },
  });

  const finalizeRematricula = useMutation({
    mutationFn: async (rematricula: any) => {
      if (!rematricula.target_class_id) {
        throw new Error('Esta solicitação não tem turma de destino definida.');
      }

      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert({
          organization_id: orgData?.organization_id,
          student_id: rematricula.student_id,
          class_id: rematricula.target_class_id,
          status: 'ativa',
          enrollment_date: new Date().toISOString().split('T')[0],
        });

      if (enrollmentError) throw enrollmentError;

      const { error: updateError } = await supabase
        .from('re_enrollments')
        .update({ status: 'finalizada' })
        .eq('id', rematricula.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast({ title: 'Rematrícula finalizada! Matrícula criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar rematrícula',
        description: error.message,
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

  const filteredRematriculas = rematriculas.filter((rematricula: any) => {
    const studentName = `${rematricula.students?.first_name ?? ''} ${rematricula.students?.last_name ?? ''}`.trim();
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rematricula.guardian_name && rematricula.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = selectedStatus === 'all' || rematricula.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? { label: statusOption.label, variant: statusOption.variant } : { label: status, variant: 'secondary' as const };
  };

  const formatDate = (date: string) => format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <RotateCcw className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Rematrícula</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/app/secretaria/rematricula/lote">
              <Users className="mr-2 h-4 w-4" />
              Rematrícula em Lote
            </Link>
          </Button>
          <Button onClick={handleOpenModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Rematrícula
          </Button>
        </div>
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
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((status) => (
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
                  <TableHead>Turma Atual</TableHead>
                  <TableHead>Turma Destino</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[150px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRematriculas.map((rematricula: any) => {
                  const statusBadge = getStatusBadge(rematricula.status);
                  const studentName = `${rematricula.students?.first_name ?? ''} ${rematricula.students?.last_name ?? ''}`.trim();
                  return (
                    <TableRow key={rematricula.id}>
                      <TableCell className="font-medium">{studentName || '-'}</TableCell>
                      <TableCell>{rematricula.current_class?.name || '-'}</TableCell>
                      <TableCell>{rematricula.target_class?.name || '-'}</TableCell>
                      <TableCell>{rematricula.guardian_name || '-'}</TableCell>
                      <TableCell>{formatDate(rematricula.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {rematricula.status === 'pendente' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveRematricula.mutate(rematricula.id)}
                              disabled={approveRematricula.isPending}
                              title="Aprovar"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {rematricula.status === 'aprovada' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => finalizeRematricula.mutate(rematricula)}
                              disabled={finalizeRematricula.isPending}
                              title="Finalizar (cria a matrícula)"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
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
                  );
                })}
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
