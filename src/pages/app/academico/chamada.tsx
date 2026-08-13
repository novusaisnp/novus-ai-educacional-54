import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserCheck, Calendar, Users, BookOpen, Save, Copy, RotateCcw, AlertTriangle } from 'lucide-react';

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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useAttendanceSheet, type AttendanceStatus, type AttendanceRecord } from '@/hooks/useAttendanceSheet';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { isSchoolDay } from '@/lib/schoolCalendar';

const attendanceSchema = z.object({
  classId: z.string().min(1, 'Selecione uma turma'),
  subjectId: z.string().min(1, 'Selecione uma disciplina'),
  date: z.date({ required_error: 'Selecione uma data' }),
});

type AttendanceFormData = z.infer<typeof attendanceSchema>;

export default function Chamada() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialDate = searchParams.get('date') === 'today' ? new Date() : undefined;

  const { toast } = useToast();
  const { data: orgData } = useOrganization();

  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      date: initialDate,
    },
  });

  const { watch } = form;
  const [classId, subjectId, date] = watch(['classId', 'subjectId', 'date']);
  const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;

  // Turmas/disciplinas/alunos/upsert vivem no hook compartilhado com /m/staff/chamada.
  const {
    classes,
    subjects,
    availableSubjects,
    students,
    studentsLoading,
    attendanceData,
    setAttendanceData,
    toggleStatus,
    setNote,
    markAllAs,
    clearAll,
    statusCounts,
    save,
  } = useAttendanceSheet({ classId, subjectId, date: dateStr });

  // Query para calendário letivo (períodos + exceções), usada só pro aviso não-bloqueante abaixo
  const { data: periods = [] } = useQuery({
    queryKey: ['periods', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      const { data, error } = await supabase
        .from('periods')
        .select('date_start, date_end, active')
        .eq('organization_id', orgData.organization_id);
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const { data: calendarExceptions = [] } = useQuery({
    queryKey: ['calendar-exceptions', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      const { data, error } = await supabase
        .from('calendar_exceptions')
        .select('date, type')
        .eq('organization_id', orgData.organization_id);
      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });

  const dateIsSchoolDay = useMemo(() => {
    if (!date || periods.length === 0) return true;
    return isSchoolDay(date, periods, calendarExceptions as { date: string; type: 'feriado' | 'recesso' | 'reposicao' }[]);
  }, [date, periods, calendarExceptions]);

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

  const copyFromPreviousDay = () => {
    setAttendanceData(
      Object.fromEntries(
        previousDayAttendance.map((record) => [
          record.student_id,
          {
            student_id: record.student_id,
            status: record.status as AttendanceStatus,
            note: record.note || undefined,
          } as AttendanceRecord,
        ])
      )
    );
    toast({ title: 'Copiado', description: 'Dados do dia anterior foram copiados!' });
  };

  const handleSave = () => save.mutate(Object.values(attendanceData));

  const selectedClass = classes.find((c) => c.id === classId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'falta': return 'bg-red-100 text-red-800 border-red-200';
      case 'atraso': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'justificada': return 'bg-sky-100 text-sky-800 border-sky-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: AttendanceStatus) => {
    switch (status) {
      case 'presente': return 'Presente';
      case 'falta': return 'Ausente';
      case 'atraso': return 'Atraso';
      case 'justificada': return 'Justificado';
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
                            {cls.name} - {cls.series?.name} ({cls.year})
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
                        {availableSubjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} {subject.code && `(${subject.code})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {classId && availableSubjects.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma disciplina atribuída a você nesta turma.{' '}
                        <Link to="/app/academico/curriculo" className="underline">
                          Ver currículo
                        </Link>
                      </p>
                    )}
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

      {date && !dateIsSchoolDay && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Dia não-letivo</AlertTitle>
          <AlertDescription>
            Esta data não consta como letiva no calendário cadastrado (feriado, recesso ou fora do
            período letivo). Você ainda pode registrar a chamada normalmente.
          </AlertDescription>
        </Alert>
      )}

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
                  <Badge className={getStatusColor('falta')}>
                    Ausentes: {statusCounts.falta}
                  </Badge>
                  <Badge className={getStatusColor('atraso')}>
                    Atrasos: {statusCounts.atraso}
                  </Badge>
                  <Badge className={getStatusColor('justificada')}>
                    Justificados: {statusCounts.justificada}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                disabled={save.isPending || Object.keys(attendanceData).length === 0}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {save.isPending ? 'Salvando...' : 'Salvar Alterações'}
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