import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Users, Check } from 'lucide-react';

export default function SecretariaRematricula() {
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  // Buscar alunos com matrícula ativa no período atual
  const { data: activeStudents = [], isLoading: isLoadingStudents } = useQuery({
    queryKey: ['active_students_for_reenrollment', orgData?.organization_id],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          enrollments!inner(
            id,
            status,
            classes(
              id,
              name,
              year
            )
          )
        `)
        .eq('status', 'ativo')
        .eq('enrollments.status', 'ativa')
        .order('first_name');
      
      if (error) throw error;
      
      // Filtrar apenas alunos com matrícula ativa no ano atual
      return data.filter(student => 
        student.enrollments.some(enrollment => 
          enrollment.status === 'ativa' && enrollment.classes?.year === currentYear
        )
      ).map(student => ({
        ...student,
        currentClass: student.enrollments.find(e => e.status === 'ativa')?.classes
      }));
    },
    enabled: !!orgData?.organization_id,
  });

  // Buscar períodos disponíveis
  const { data: periods = [] } = useQuery({
    queryKey: ['periods_for_reenrollment', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select('id, name, year')
        .eq('active', true)
        .order('year', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  // Buscar turmas disponíveis
  const { data: classes = [] } = useQuery({
    queryKey: ['classes_for_reenrollment', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade, year')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  // Mutation para criar rematrículas
  const createReenrollments = useMutation({
    mutationFn: async ({ studentIds, periodId, classId }: { 
      studentIds: string[], 
      periodId: string, 
      classId: string 
    }) => {
      // Verificar duplicatas antes de inserir
      const { data: existingEnrollments } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .in('student_id', studentIds);

      const existingStudentIds = existingEnrollments?.map(e => e.student_id) || [];
      const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id));

      if (newStudentIds.length === 0) {
        throw new Error('Todos os alunos selecionados já estão matriculados nesta turma.');
      }

      // Criar novas matrículas
      const enrollmentsToInsert = newStudentIds.map(studentId => ({
        student_id: studentId,
        class_id: classId,
        status: 'ativa',
        enrollment_date: new Date().toISOString().split('T')[0],
        organization_id: orgData?.organization_id
      }));

      const { error } = await supabase
        .from('enrollments')
        .insert(enrollmentsToInsert);

      if (error) throw error;

      return { 
        created: newStudentIds.length, 
        duplicates: existingStudentIds.length 
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['active_students_for_reenrollment'] });
      setSelectedStudents([]);
      setSelectedPeriod('');
      setSelectedClass('');
      
      toast({
        title: 'Rematrícula realizada com sucesso!',
        description: `${result.created} alunos rematriculados. ${result.duplicates > 0 ? `${result.duplicates} já estavam matriculados.` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao realizar rematrícula',
        description: error.message,
      });
    },
  });

  const handleStudentToggle = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(activeStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSubmitReenrollment = () => {
    if (selectedStudents.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione pelo menos um aluno.',
      });
      return;
    }

    if (!selectedPeriod || !selectedClass) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione o período e a turma de destino.',
      });
      return;
    }

    createReenrollments.mutate({
      studentIds: selectedStudents,
      periodId: selectedPeriod,
      classId: selectedClass
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <RotateCcw className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Rematrícula</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações da Rematrícula</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Período de Destino</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.name} - {period.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Turma de Destino</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>
                      {classe.name} - {classe.grade} ({classe.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                <Users className="h-4 w-4 mr-1" />
                {selectedStudents.length} selecionados
              </Badge>
            </div>
            <Button
              onClick={handleSubmitReenrollment}
              disabled={selectedStudents.length === 0 || !selectedPeriod || !selectedClass || createReenrollments.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Confirmar Rematrícula
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Alunos Elegíveis para Rematrícula ({activeStudents.length})</span>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="selectAll"
                checked={selectedStudents.length === activeStudents.length && activeStudents.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="selectAll" className="text-sm font-medium">
                Selecionar Todos
              </label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStudents ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sel.</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Turma Atual</TableHead>
                  <TableHead>Série Atual</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedStudents.includes(student.id)}
                        onCheckedChange={(checked) => 
                          handleStudentToggle(student.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.currentClass?.name || '-'}</TableCell>
                    <TableCell>{student.currentClass?.year || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="default">Ativo</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}