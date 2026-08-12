import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, Printer, Calendar, Users, BookOpen, Filter } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';

import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';

const reportSchema = z.object({
  classId: z.string().optional(),
  subjectId: z.string().optional(),
  dateStart: z.date({ required_error: 'Selecione a data inicial' }),
  dateEnd: z.date({ required_error: 'Selecione a data final' }),
});

type ReportFormData = z.infer<typeof reportSchema>;

// Valores devem bater com o CHECK constraint de public.attendance.status no banco
// (attendance_status_check: presente/falta/atraso/justificada) — não são livres.
type AttendanceStatus = 'presente' | 'falta' | 'atraso' | 'justificada';

interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
  updated_at: string;
  student_id: string;
  class_id: string;
  subject_id: string;
  student_name: string;
  class_name: string;
  subject_name: string;
}

interface AttendanceSummary {
  presente: number;
  ausente: number;
  atraso: number;
  justificado: number;
  total: number;
  percentualPresenca: number;
}

export default function ChamadaRelatorio() {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useOrganization();
  
  // Inicializar com filtros da URL se disponíveis
  const initialClassId = searchParams.get('classId') || undefined;
  const initialSubjectId = searchParams.get('subjectId') || undefined;
  const initialDate = searchParams.get('date');
  
  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      classId: initialClassId,
      subjectId: initialSubjectId,
      dateStart: initialDate ? new Date(initialDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      dateEnd: initialDate ? new Date(initialDate) : new Date(),
    },
  });

  const { watch } = form;
  const [classId, subjectId, dateStart, dateEnd] = watch(['classId', 'subjectId', 'dateStart', 'dateEnd']);

  // Query para listar turmas
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, series:series_id(name)')
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

  // Query para buscar dados de presença
  const { data: attendanceData = [], isLoading } = useQuery({
    queryKey: ['attendance-report', orgData?.organization_id, classId, subjectId, dateStart?.toISOString(), dateEnd?.toISOString()],
    queryFn: async () => {
      if (!orgData?.organization_id || !dateStart || !dateEnd) return [];
      
      let query = supabase
        .from('attendance')
        .select(`
          id, date, status, note, updated_at, student_id, class_id, subject_id,
          students!inner(first_name, last_name),
          classes!inner(name),
          subjects!inner(name)
        `)
        .eq('organization_id', orgData.organization_id)
        .gte('date', format(dateStart, 'yyyy-MM-dd'))
        .lte('date', format(dateEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (classId) {
        query = query.eq('class_id', classId);
      }
      
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data.map(record => ({
        id: record.id,
        date: record.date,
        status: record.status as AttendanceStatus,
        note: record.note,
        updated_at: record.updated_at,
        student_id: record.student_id,
        class_id: record.class_id,
        subject_id: record.subject_id,
        student_name: `${record.students.first_name} ${record.students.last_name}`,
        class_name: record.classes.name,
        subject_name: record.subjects.name,
      })) as AttendanceRecord[];
    },
    enabled: !!orgData?.organization_id && !!dateStart && !!dateEnd,
  });

  // Calcular resumo
  const summary: AttendanceSummary = {
    presente: attendanceData.filter(r => r.status === 'presente').length,
    ausente: attendanceData.filter(r => r.status === 'falta').length,
    atraso: attendanceData.filter(r => r.status === 'atraso').length,
    justificado: attendanceData.filter(r => r.status === 'justificada').length,
    total: attendanceData.length,
    percentualPresenca: attendanceData.length > 0 
      ? Math.round((attendanceData.filter(r => r.status === 'presente').length / attendanceData.length) * 100)
      : 0,
  };

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

  const exportToCsv = () => {
    if (attendanceData.length === 0) return;

    const headers = ['Aluno', 'Data', 'Status', 'Observação', 'Última Atualização', 'Turma', 'Disciplina'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(record => [
        `"${record.student_name}"`,
        format(new Date(`${record.date}T00:00:00`), 'dd/MM/yyyy'),
        getStatusLabel(record.status),
        `"${record.note || ''}"`,
        format(new Date(record.updated_at), 'dd/MM/yyyy HH:mm'),
        `"${record.class_name}"`,
        `"${record.subject_name}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-chamada-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedClass = classes.find(c => c.id === classId);
  const selectedSubject = subjects.find(s => s.id === subjectId);

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { font-size: 12px; }
          .page-break { page-break-before: always; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex items-center gap-3 no-print">
          <IconBadge icon={FileText} tone="info" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatório de Chamada</h1>
            <p className="text-muted-foreground">Consulte e exporte dados de presença e frequência</p>
          </div>
        </div>

        {/* Cabeçalho para impressão */}
        <div className="print-only">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Relatório de Chamada</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedClass && `Turma: ${selectedClass.name}`}
              {selectedSubject && ` • Disciplina: ${selectedSubject.name}`}
              {dateStart && dateEnd && ` • Período: ${format(dateStart, 'dd/MM/yyyy')} a ${format(dateEnd, 'dd/MM/yyyy')}`}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turma</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as turmas" />
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas as disciplinas" />
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
                  name="dateStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Inicial</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dateEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Final</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || (dateStart && date < dateStart)}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline">
                  <Link to="/app/academico/chamada">← Voltar para Chamada</Link>
                </Button>
                <Button onClick={exportToCsv} disabled={attendanceData.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button onClick={handlePrint} disabled={attendanceData.length === 0} variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>

        {/* Resumo */}
        {dateStart && dateEnd && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Resumo do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{summary.presente}</p>
                  <p className="text-sm text-muted-foreground">Presentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{summary.ausente}</p>
                  <p className="text-sm text-muted-foreground">Ausentes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{summary.atraso}</p>
                  <p className="text-sm text-muted-foreground">Atrasos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-sky-600">{summary.justificado}</p>
                  <p className="text-sm text-muted-foreground">Justificados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{summary.percentualPresenca}%</p>
                  <p className="text-sm text-muted-foreground">Presença</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de dados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Registros de Presença ({attendanceData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando dados...</p>
              </div>
            ) : attendanceData.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum registro encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead className="no-print">Turma</TableHead>
                    <TableHead className="no-print">Disciplina</TableHead>
                    <TableHead>Última Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.student_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(`${record.date}T00:00:00`), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(record.status)}>
                          {getStatusLabel(record.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {record.note || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="no-print">
                        {record.class_name}
                      </TableCell>
                      <TableCell className="no-print">
                        {record.subject_name}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(record.updated_at), 'dd/MM/yyyy HH:mm')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}