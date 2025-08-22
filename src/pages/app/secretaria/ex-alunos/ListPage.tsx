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
import { UserX, Search, Edit, Eye } from 'lucide-react';

export default function SecretariaExAlunosListPage() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReason, setSelectedReason] = useState('all');

  const { data: exAlunos = [], isLoading } = useQuery({
    queryKey: ['ex_students', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          student_status_events(
            event_type,
            event_date,
            reason,
            notes
          )
        `)
        .eq('status', 'inativo')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const filteredExAlunos = exAlunos.filter(aluno => {
    const matchesSearch = aluno.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      aluno.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (aluno.document_id && aluno.document_id.includes(searchTerm));
    
    const lastEvent = aluno.student_status_events?.[0];
    const matchesReason = selectedReason === 'all';
    
    return matchesSearch && matchesReason;
  });

  const reasonOptions = [
    { value: 'all', label: 'Todos os motivos' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'formatura', label: 'Formatura' },
    { value: 'abandono', label: 'Abandono' },
    { value: 'outros', label: 'Outros' },
  ];

  const getStatusBadge = (eventType: string) => {
    switch (eventType) {
      case 'transferencia':
        return <Badge variant="outline">Transferido</Badge>;
      case 'formatura':
        return <Badge variant="default">Formado</Badge>;
      case 'abandono':
        return <Badge variant="destructive">Abandono</Badge>;
      default:
        return <Badge variant="secondary">Inativo</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserX className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Ex-Alunos</h1>
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
                  placeholder="Buscar por nome ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por motivo" />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ex-Alunos ({filteredExAlunos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredExAlunos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserX className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum ex-aluno encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum ex-aluno corresponde aos critérios de busca.' : 'Ainda não há ex-alunos registrados.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead>Data de Saída</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExAlunos.map((aluno) => {
                  const lastEvent = aluno.student_status_events?.[0];
                  return (
                    <TableRow key={aluno.id}>
                      <TableCell className="font-medium">
                        {aluno.first_name} {aluno.last_name}
                      </TableCell>
                      <TableCell>{aluno.document_id || '-'}</TableCell>
                      <TableCell>
                        {aluno.birth_date ? new Date(aluno.birth_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Ex-aluno</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
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
    </div>
  );
}