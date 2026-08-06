import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Plus, Edit, Trash2, CalendarDays, CalendarClock, GraduationCap } from 'lucide-react';
import { SubmodalPeriodos } from '@/features/secretaria/periodos/SubmodalPeriodos';
import EmptyState from '@/components/EmptyState';
import { IconBadge } from '@/components/IconBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAcademicSettings, useUpdateAcademicSettings } from '@/hooks/useAcademicSettings';
import { useUserRole } from '@/hooks/useUserRole';

function AcademicSettingsCard() {
  const { data: role } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao';
  const { data: settings } = useAcademicSettings();
  const updateSettings = useUpdateAcademicSettings();
  const [value, setValue] = useState<string>('');

  const currentValue = value || settings?.minimumPassingAverage?.toString() || '';

  if (!canManage) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Média Mínima de Aprovação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">
              Nota mínima (0 a 10) para aprovação direta na disciplina, sem recuperação
            </label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="10"
              className="w-32"
              placeholder={settings?.minimumPassingAverage?.toString() ?? '6.0'}
              value={currentValue}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <Button
            onClick={() => updateSettings.mutate(parseFloat(currentValue) || 6.0)}
            disabled={updateSettings.isPending || !currentValue}
          >
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SecretariaPeriodos() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('modal') === 'periodos');
  const [editingId, setEditingId] = useState<string | undefined>(undefined);

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['periods', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .order('year', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const deletePeriod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('periods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast({ title: 'Período excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir período',
        description: error.message
      });
    },
  });

  const handleOpenModal = () => {
    setEditingId(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(undefined);
    queryClient.invalidateQueries({ queryKey: ['periods'] });
  };

  const years = [...new Set(periods.map(p => p.year))].sort((a, b) => b - a);

  const filteredPeriods = periods.filter(period => {
    const matchesSearch = period.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === 'all' || period.year.toString() === selectedYear;
    return matchesSearch && matchesYear;
  });

  const formatDate = (date: string) => {
    return format(new Date(`${date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <IconBadge icon={Calendar} tone="primary" />
          <h1 className="text-2xl font-bold">Períodos</h1>
        </div>
        <Button onClick={handleOpenModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Período
        </Button>
      </div>

      <AcademicSettingsCard />

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
                  placeholder="Buscar por nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Períodos ({filteredPeriods.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredPeriods.length === 0 ? (
            <EmptyState
              title="Nenhum período encontrado"
              description="Cadastre o primeiro período/ano letivo para começar a organizar o calendário escolar."
              action={
                <Button onClick={handleOpenModal}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Período
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeriods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">{period.name}</TableCell>
                    <TableCell>{period.year}</TableCell>
                    <TableCell>{formatDate(period.date_start)}</TableCell>
                    <TableCell>{formatDate(period.date_end)}</TableCell>
                    <TableCell>
                      <Badge variant={period.active ? 'default' : 'secondary'}>
                        {period.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Calendário letivo"
                          onClick={() => navigate(`/app/secretaria/periodos/${period.id}/calendario`)}
                        >
                          <CalendarDays className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Bimestres/Trimestres"
                          onClick={() => navigate(`/app/secretaria/periodos/${period.id}/termos`)}
                        >
                          <CalendarClock className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(period.id)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePeriod.mutate(period.id)}
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

      <SubmodalPeriodos
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        editingId={editingId}
      />
    </div>
  );
}
