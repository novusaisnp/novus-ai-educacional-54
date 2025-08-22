import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserX, Search, UserCheck } from 'lucide-react';
import { ModalMestre } from '@/features/secretaria/hub/ModalMestre';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SecretariaExAlunos() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isMatriculaModalOpen, setIsMatriculaModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: exAlunos = [], isLoading } = useQuery({
    queryKey: ['ex_alunos', orgData?.organization_id],
    queryFn: async () => {
      // Buscar alunos com status diferente de 'ativo' ou sem matrícula ativa no período atual
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          enrollments(
            id,
            status,
            enrollment_date,
            classes(name, year)
          )
        `)
        .in('status', ['inativo', 'transferido'])
        .order('updated_at', { ascending: false });
      
      if (error) throw error;

      // Processar dados para mostrar informações da última matrícula
      return data.map(student => {
        const lastEnrollment = student.enrollments?.sort((a, b) => 
          new Date(b.enrollment_date).getTime() - new Date(a.enrollment_date).getTime()
        )[0];

        return {
          ...student,
          lastClass: lastEnrollment?.classes?.name || 'N/A',
          lastYear: lastEnrollment?.classes?.year || 'N/A',
          exitDate: student.updated_at,
          reason: student.status === 'transferido' ? 'Transferência' : 'Inativo'
        };
      });
    },
    enabled: !!orgData?.organization_id,
  });

  const handleReactivateStudent = (studentId: string) => {
    setSelectedStudent(studentId);
    setIsMatriculaModalOpen(true);
  };

  const handleCloseMatriculaModal = () => {
    setIsMatriculaModalOpen(false);
    setSelectedStudent(null);
  };

  const filteredExAlunos = exAlunos.filter(student => {
    const matchesSearch = `${student.first_name} ${student.last_name}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || student.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      inativo: { label: 'Inativo', variant: 'secondary' as const },
      transferido: { label: 'Transferido', variant: 'destructive' as const },
    };
    
    return variants[status as keyof typeof variants] || { label: status, variant: 'secondary' as const };
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
                  placeholder="Buscar por nome..."
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
                <SelectItem value="inativo">Inativo</SelectItem>
                <SelectItem value="transferido">Transferido</SelectItem>
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
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Última Turma</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Data Saída</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExAlunos.map((student) => {
                  const statusBadge = getStatusBadge(student.status);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>{student.lastClass}</TableCell>
                      <TableCell>{student.lastYear}</TableCell>
                      <TableCell>{formatDate(student.exitDate)}</TableCell>
                      <TableCell>{student.reason}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => handleReactivateStudent(student.id)}
                          title="Reativar/Matricular"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para Reativar/Matricular */}
      <ModalMestre
        isOpen={isMatriculaModalOpen}
        onClose={handleCloseMatriculaModal}
        defaultTab="matriculas"
      />
    </div>
  );
}