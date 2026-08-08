import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PortalPageHeader from '@/components/portal/PortalPageHeader';
import { GraduationCap } from 'lucide-react';
import { useLinkedStudents, useStudentGrades, useStudentAttendance, StudentAttendanceRow } from '@/hooks/usePortalAcademic';

function getStatusLabel(status: StudentAttendanceRow['status']) {
  switch (status) {
    case 'presente': return 'Presente';
    case 'falta': return 'Ausente';
    case 'atraso': return 'Atraso';
    case 'justificada': return 'Justificado';
  }
}

function getStatusColor(status: StudentAttendanceRow['status']) {
  switch (status) {
    case 'presente': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'falta': return 'bg-red-100 text-red-800 border-red-200';
    case 'atraso': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'justificada': return 'bg-sky-100 text-sky-800 border-sky-200';
  }
}

export default function PortalAcademico() {
  const { data: students, isLoading: loadingStudents } = useLinkedStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    if (!selectedStudentId && students && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  const { data: grades, isLoading: loadingGrades } = useStudentGrades(selectedStudentId || undefined);
  const { data: attendance, isLoading: loadingAttendance } = useStudentAttendance(selectedStudentId || undefined);

  const attendanceCounts = (attendance || []).reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1;
      return acc;
    },
    { presente: 0, falta: 0, atraso: 0, justificada: 0 } as Record<StudentAttendanceRow['status'], number>
  );
  const totalAttendance = attendance?.length || 0;
  const attendanceRate = totalAttendance > 0
    ? Math.round(((attendanceCounts.presente + attendanceCounts.atraso) / totalAttendance) * 100)
    : null;

  if (loadingStudents) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!students || students.length === 0) {
    return (
      <div className="space-y-6">
        <PortalPageHeader
          title="Notas e Frequência"
          description="Acompanhamento acadêmico"
          icon={<GraduationCap className="h-8 w-8 text-primary" />}
        />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum aluno vinculado ao seu cadastro.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Notas e Frequência"
        description="Acompanhamento acadêmico em tempo real"
        icon={<GraduationCap className="h-8 w-8 text-primary" />}
        action={
          students.length > 1 ? (
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate !== null ? `${attendanceRate}%` : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Presenças</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{attendanceCounts.presente}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{attendanceCounts.falta}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atrasos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{attendanceCounts.atraso}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGrades ? (
            <Skeleton className="h-24 w-full" />
          ) : !grades || grades.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma nota lançada ainda.</p>
          ) : (
            <div className="space-y-2">
              {grades.map((row) => (
                <div key={row.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div>
                    <p className="font-medium">{row.assessment?.title || 'Avaliação'}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.assessment?.subject?.name} · {row.assessment?.date ? new Date(row.assessment.date).toLocaleDateString('pt-BR') : ''}
                      {row.comments ? ` · ${row.comments}` : ''}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-base">
                    {row.grade !== null ? row.grade.toFixed(1) : '—'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequência recente</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAttendance ? (
            <Skeleton className="h-24 w-full" />
          ) : !attendance || attendance.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum registro de frequência ainda.</p>
          ) : (
            <div className="space-y-2">
              {attendance.slice(0, 20).map((row) => (
                <div key={row.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                  <div>
                    <p className="font-medium">{row.subject?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.date).toLocaleDateString('pt-BR')}
                      {row.note ? ` · ${row.note}` : ''}
                    </p>
                  </div>
                  <Badge className={getStatusColor(row.status)}>{getStatusLabel(row.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
