import { useState } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useClasses, useSubjects, useTeachers } from '@/hooks/useAppQueries';
import { useClassSubjects, useUpsertClassSubject, useDeleteClassSubject } from '@/hooks/useClassSubjects';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrganization } from '@/hooks/useOrganization';
import EmptyState from '@/components/EmptyState';

const NO_TEACHER = '__none__';

export default function CurriculoPage() {
  const { data: orgData } = useOrganization();
  const { data: role } = useUserRole();
  const canManage = role === 'admin' || role === 'coordenacao';

  const [classId, setClassId] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newTeacherId, setNewTeacherId] = useState('');

  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: teachers = [] } = useTeachers();
  const { data: assignments = [], isLoading } = useClassSubjects(classId || undefined);

  const upsertAssignment = useUpsertClassSubject();
  const deleteAssignment = useDeleteClassSubject();

  const assignedSubjectIds = new Set(assignments.map((a) => a.subject_id));
  const availableSubjects = subjects.filter((s) => !assignedSubjectIds.has(s.id));

  const handleAdd = () => {
    if (!classId || !newSubjectId) return;
    upsertAssignment.mutate(
      {
        classId,
        subjectId: newSubjectId,
        teacherId: newTeacherId && newTeacherId !== NO_TEACHER ? newTeacherId : null,
      },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          setNewSubjectId('');
          setNewTeacherId('');
        },
      }
    );
  };

  const handleChangeTeacher = (subjectId: string, teacherId: string) => {
    if (!classId) return;
    upsertAssignment.mutate({
      classId,
      subjectId,
      teacherId: teacherId && teacherId !== NO_TEACHER ? teacherId : null,
    });
  };

  if (!orgData?.organization_id) {
    return (
      <EmptyState
        title="Organização não encontrada"
        description="Selecione ou crie uma organização para ver o currículo."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <IconBadge icon={BookOpen} tone="success" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Currículo</h1>
          <p className="text-muted-foreground">
            Defina quais disciplinas são lecionadas em cada turma e por qual professor.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Turma</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="md:w-80">
              <SelectValue placeholder="Selecione uma turma" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.grade ? `- ${cls.grade}` : ''} ({cls.year})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {!classId && (
        <Alert>
          <AlertDescription>Selecione uma turma para ver ou definir seu currículo.</AlertDescription>
        </Alert>
      )}

      {classId && isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {classId && !isLoading && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Disciplinas desta turma ({assignments.length})</CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setAddDialogOpen(true)} disabled={availableSubjects.length === 0}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar disciplina
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma disciplina atribuída ainda. Enquanto isso, chamada e notas continuam liberadas para
                todas as disciplinas cadastradas nesta turma (comportamento de transição).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Disciplina</TableHead>
                      <TableHead className="w-[280px]">Professor responsável</TableHead>
                      {canManage && <TableHead className="w-[60px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{assignment.subjects?.name || '—'}</TableCell>
                        <TableCell>
                          <Select
                            value={assignment.teacher_id ?? NO_TEACHER}
                            onValueChange={(value) => handleChangeTeacher(assignment.subject_id, value)}
                            disabled={!canManage}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sem professor definido" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_TEACHER}>Sem professor definido</SelectItem>
                              {teachers.map((teacher) => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                  {teacher.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAssignment.mutate({ id: assignment.id, classId })}
                              disabled={deleteAssignment.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar disciplina à turma</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Disciplina</label>
              <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Professor responsável (opcional)</label>
              <Select value={newTeacherId} onValueChange={setNewTeacherId}>
                <SelectTrigger>
                  <SelectValue placeholder="Definir depois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEACHER}>Definir depois</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={!newSubjectId || upsertAssignment.isPending}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
