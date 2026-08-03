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
import { ClipboardList, Search, Plus, Edit, Trash2, UserCheck, Check, X } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { ConverterReservaDialog } from '@/features/secretaria/reservas/ConverterReservaDialog';
import { IconBadge } from '@/components/IconBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente', variant: 'secondary' as const },
  { value: 'aprovada', label: 'Aprovada', variant: 'default' as const },
  { value: 'rejeitada', label: 'Rejeitada', variant: 'destructive' as const },
  { value: 'convertida', label: 'Convertida', variant: 'outline' as const },
];

export default function SecretariaReservas() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<any | null>(null);
  const [converterApplication, setConverterApplication] = useState<any | null>(null);

  // Verificar se deve abrir o modal baseado na URL
  useState(() => {
    if (searchParams.get('modal') === 'reservas') {
      setIsModalOpen(true);
    }
  });

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ['waitlist_applications', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('waitlist_applications')
        .select(`
          *,
          segments(name),
          series(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waitlist_applications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist_applications'] });
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

  const approveApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waitlist_applications')
        .update({ status: 'aprovada' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist_applications'] });
      toast({ title: 'Reserva aprovada com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao aprovar reserva',
        description: error.message,
      });
    },
  });

  const rejectApplication = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('waitlist_applications')
        .update({ status: 'rejeitada' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waitlist_applications'] });
      toast({ title: 'Reserva rejeitada.' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao rejeitar reserva',
        description: error.message,
      });
    },
  });

  const handleOpenModal = () => {
    setEditingApplication(null);
    setIsModalOpen(true);
  };

  const handleEdit = (application: any) => {
    setEditingApplication(application);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingApplication(null);
    queryClient.invalidateQueries({ queryKey: ['waitlist_applications'] });
  };

  const handleConvertToEnrollment = (application: any) => {
    setConverterApplication(application);
  };

  const handleCloseConverter = () => {
    setConverterApplication(null);
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.student_full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.guardian_name && app.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? { label: statusOption.label, variant: statusOption.variant } : { label: status, variant: 'secondary' as const };
  };

  const formatDate = (date: string | null) => {
    return date ? format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }) : '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <IconBadge icon={ClipboardList} tone="warm" />
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
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
          <CardTitle>Lista de Reservas ({filteredApplications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredApplications.length === 0 ? (
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
                  <TableHead>Aluno</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Segmento/Série</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((application) => {
                  const statusBadge = getStatusBadge(application.status);
                  return (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{application.student_full_name}</TableCell>
                      <TableCell>{formatDate(application.birth_date)}</TableCell>
                      <TableCell>{application.guardian_name || '-'}</TableCell>
                      <TableCell>{application.guardian_phone || '-'}</TableCell>
                      <TableCell>
                        {application.segments?.name} / {application.series?.name}
                      </TableCell>
                      <TableCell>{application.desired_year}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {application.status === 'pendente' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Aprovar"
                                onClick={() => approveApplication.mutate(application.id)}
                                disabled={approveApplication.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                title="Rejeitar"
                                onClick={() => rejectApplication.mutate(application.id)}
                                disabled={rejectApplication.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {application.status === 'aprovada' && (
                            <Button
                              size="sm"
                              variant="default"
                              title="Converter em Matrícula"
                              onClick={() => handleConvertToEnrollment(application)}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" title="Editar" onClick={() => handleEdit(application)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            title="Excluir"
                            onClick={() => deleteApplication.mutate(application.id)}
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
        defaultTab="reservas"
        editingItem={editingApplication}
      />

      {converterApplication && (
        <ConverterReservaDialog
          open={!!converterApplication}
          onClose={handleCloseConverter}
          application={converterApplication}
          orgId={orgData?.organization_id || ''}
        />
      )}
    </div>
  );
}