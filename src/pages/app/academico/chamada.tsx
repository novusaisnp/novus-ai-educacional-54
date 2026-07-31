import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserCheck, Calendar, Users, BookOpen, Save, Copy, RotateCcw } from 'lucide-react';

import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

const attendanceSchema = z.object({
  classId: z.string().min(1, 'Selecione uma turma'),
  subjectId: z.string().min(1, 'Selecione uma disciplina'),
  date: z.date({ required_error: 'Selecione uma data' }),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

type AttendanceStatus = 'presente' | 'ausente' | 'atraso' | 'justificado';

interface AttendanceRecord {
  student_id: string;
  status: AttendanceStatus;
  note?: string;
}

interface StudentWithAttendance {
  id: string;
  first_name: string;
  last_name: string;
  status?: AttendanceStatus;
  note?: string;
}

export default function Chamada() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialDate = searchParams.get('date') === 'today' ? new Date() : undefined;

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useOrganization();
  
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: initialDate,
    },
  });

  const { watch } = form;
  const [classId, subjectId, date] = watch(['classId', 'subjectId', 'date']);

  // Query para listar turmas
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, grade, year')
        .eq('organization_id', orgData.organization_id)
        .order('name');
        
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  // Query para listar disciplinas
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('organization_id', orgData.organization_id)
        .order('name');
        
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  // Query para buscar alunos da turma
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-by-class', classId, orgData?.organization_id],
    queryFn: async () => {
      if (!classId || !orgData?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          students!inner(id, first_name, last_name)
        `)
        .eq('class_id', classId)
        .eq('status', 'ativa')
        .eq('organization_id', orgData.organization_id);
        
      if (error) throw error;
      return data.map(enrollment => enrollment.students).filter(Boolean);
    },
    enabled: !!classId && !!orgData?.organization_id,
  });

  // Query para buscar registros de presença existentes
  const { data: existingAttendance = [] } = useQuery({
    queryKey: ['attendance', classId, subjectId, date?.toISOString()?.split('T')[0], orgData?.organization_id],
    queryFn: async () => {
      if (!classId || !subjectId || !date || !orgData?.organization_id) return [];
      
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('date', dateStr)
        .eq('organization_id', orgData.organization_id);
        
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId && !!date && !!orgData?.organization_id,
  });

  // Query para buscar registros do dia anterior
  const { data: previousDayAttendance = [] } = useQuery({
    queryKey: ['previous-attendance', classId, subjectId, date?.toISOString()?.split('T')[0], orgData?.organization_id],
    queryFn: async () => {
      if (!classId || !subjectId || !date || !orgData?.organization_id) return [];
      
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);
      const dateStr = format(previousDate, 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('date', dateStr)
        .eq('organization_id', orgData.organization_id);
        
      if (error) throw error;
      return data;
    },
    enabled: !!classId && !!subjectId && !!date && !!orgData?.organization_id,
  });

  // Mutation para salvar registros de presença
  const saveAttendanceMutation = useMutation({
    mutationFn: async (records: AttendanceRecord[]) => {
      if (!classId || !subjectId || !date || !orgData?.organization_id) {
        throw new Error('Dados incompletos');
      }

      const dateStr = format(date, 'yyyy-MM-dd');
      
      const attendanceRecords = records.map(record => ({
        organization_id: orgData.organization_id,
        class_id: classId,
        subject_id: subjectId,
        student_id: record.student_id,
        date: dateStr,
        status: record.status,
        note: record.note || null,
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceRecords, {
          onConflict: 'organization_id,class_id,subject_id,student_id,date',
        });

      if (error) throw error;

      // Auditoria: registrar operação em massa
      const statusCounts = records.reduce((acc, record) => {
        acc[record.status] = (acc[record.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      await supabase
        .from('audit_logs')
        .insert({
          organization_id: orgData.organization_id,
          table_name: 'attendance',
          action: 'attendance_upsert_many',
          actor: (await supabase.auth.getUser()).data.user?.id,
          diff: {
            class_id: classId,
            subject_id: subjectId,
            date: dateStr,
            total_records: records.length,
            status_counts: statusCounts,
          },
        });
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Presença registrada com sucesso!',
      });
      queryClient.invalidateQueries({
        queryKey: ['attendance', classId, subjectId, date?.toISOString()?.split('T')[0], orgData?.organization_id],
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar presença:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar presença. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  // Sincronizar dados existentes com o estado local
  useEffect(() => {
    const attendanceMap: Record<string, AttendanceRecord> = {};
    existingAttendance.forEach(record => {
      attendanceMap[record.student_id] = {
        student_id: record.student_id,
        status: record.status as AttendanceStatus,
        note: record.note || undefined,
      };
    });
    setAttendanceData(attendanceMap);
  }, [existingAttendance]);

  // Funções auxiliares
  const toggleStatus = (studentId: string) => {
    const currentStatus = attendanceData[studentId]?.status || 'presente';
    const statuses: AttendanceStatus[] = ['presente', 'ausente', 'atraso', 'justificado'];
    const currentIndex = statuses.indexOf(currentStatus);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        status: nextStatus,
        note: prev[studentId]?.note,
      },
    }));
  };

  const setNote = (studentId: string, note: string) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        student_id: studentId,
        status: prev[studentId]?.status || 'presente',
        note: note || undefined,
      },
    }));
  };

  const markAllAs = (status: AttendanceStatus) => {
    const newData: Record<string, AttendanceRecord> = {};
    students.forEach(student => {
      newData[student.id] = {
        student_id: student.id,
        status,
        note: attendanceData[student.id]?.note,
      };
    });
    setAttendanceData(newData);
  };

  const clearAll = () => {
    setAttendanceData({});
  };

  const copyFromPreviousDay = () => {
    const newData: Record<string, AttendanceRecord> = {};
    previousDayAttendance.forEach(record => {
      newData[record.student_id] = {
        student_id: record.student_id,
        status: record.status as AttendanceStatus,
        note: record.note || undefined,
      };
    });
    setAttendanceData(newData);
    toast({
      title: 'Copiado',
      description: 'Dados do dia anterior foram copiados!',
    });
  };

  const handleSave = () => {
    const records = Object.values(attendanceData);
    saveAttendanceMutation.mutate(records);
  };

  // Calculadora de resumo
  const getStatusCounts = () => {
    const counts = { presente: 0, ausente: 0, atraso: 0, justificado: 0 };
    Object.values(attendanceData).forEach(record => {
      counts[record.status] = (counts[record.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();
  const selectedClass = classes.find(c => c.id === classId);
  const selectedSubject = subjects.find(s => s.id === subjectId);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'ausente': return 'bg-red-100 text-red-800 border-red-200';
      case 'atraso': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'justificado': return 'bg-sky-100 text-sky-800 border-sky-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'Presente';
      case 'ausente': return 'Ausente';
      case 'atraso': return 'Atraso';
      case 'justificado': return 'Justificado';
      default: return 'Presente';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={UserCheck} tone="success" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chamada</h1>
          <p className="text-muted-foreground">Controle de presença e frequência dos alunos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turma</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma turma" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} - {cls.grade} ({cls.year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disciplina</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma disciplina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} {subject.code && `(${subject.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CardContent>
      </Card>

      {/* Resumo e ações */}
      {classId && subjectId && date && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resumo da Chamada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Turma:</strong> {selectedClass?.name}
                </p>
                <p className="text-sm">
                  <strong>Disciplina:</strong> {selectedSubject?.name}
                </p>
                <p className="text-sm">
                  <strong>Data:</strong> {format(date, "PPP", { locale: ptBR })}
                </p>
                <div className="flex gap-2 mt-4">
                  <Badge className={getStatusColor('presente')}>
                    Presentes: {statusCounts.presente}
                  </Badge>
                  <Badge className={getStatusColor('ausente')}>
                    Ausentes: {statusCounts.ausente}
                  </Badge>
                  <Badge className={getStatusColor('atraso')}>
                    Atrasos: {statusCounts.atraso}
                  </Badge>
                  <Badge className={getStatusColor('justificado')}>
                    Justificados: {statusCounts.justificado}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => markAllAs('presente')}
                  disabled={studentsLoading}
                >
                  Todos Presentes
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearAll}
                  disabled={studentsLoading}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>
              
              {previousDayAttendance.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={copyFromPreviousDay}
                  disabled={studentsLoading}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar do dia anterior
                </Button>
              )}

              <Button 
                onClick={handleSave}
                disabled={saveAttendanceMutation.isPending || Object.keys(attendanceData).length === 0}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveAttendanceMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>

              <Button asChild variant="outline" className="w-full">
                <Link 
                  to={`/app/academico/chamada/relatorio?${new URLSearchParams({
                    ...(classId && { classId }),
                    ...(subjectId && { subjectId }),
                    ...(date && { date: format(date, 'yyyy-MM-dd') }),
                  }).toString()}`}
                >
                  Relatório
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lista de alunos */}
      {classId && subjectId && date && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lista de Presença
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando alunos...</p>
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum aluno encontrado para esta turma.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const attendance = attendanceData[student.id];
                    const status = attendance?.status || 'presente';
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleStatus(student.id)}
                            className={getStatusColor(status)}
                          >
                            {getStatusLabel(status)}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                {attendance?.note ? 'Ver/Editar' : 'Adicionar'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                              <div className="space-y-2">
                                <h4 className="font-medium">Observação</h4>
                                <Textarea
                                  placeholder="Digite uma observação..."
                                  value={attendance?.note || ''}
                                  onChange={(e) => setNote(student.id, e.target.value)}
                                  rows={3}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}