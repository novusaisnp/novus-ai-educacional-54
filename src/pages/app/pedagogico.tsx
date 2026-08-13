import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmptyState from '@/components/EmptyState';
import { IconBadge } from '@/components/IconBadge';
import { BookOpen, Users, FolderKanban, Target, Plus, Edit, Trash2, GraduationCap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClasses, useSubjects, useAcademicTerms } from '@/hooks/useAppQueries';
import {
  useStudentsLite, useLessonPlans, useTrackingNotes, usePedagogicalProjects, usePedagogicalGoals,
  type LessonPlanRow, type TrackingNoteRow, type ProjectRow, type GoalRow,
} from '@/hooks/usePedagogico';

const fmtDate = (date: string) => format(new Date(`${date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });

const NOTE_CATEGORIES = [
  { value: 'academico', label: 'Acadêmico' },
  { value: 'comportamental', label: 'Comportamental' },
  { value: 'socioemocional', label: 'Socioemocional' },
  { value: 'outro', label: 'Outro' },
];

const PROJECT_STATUS = [
  { value: 'planejamento', label: 'Planejamento', variant: 'outline' as const },
  { value: 'em_andamento', label: 'Em Andamento', variant: 'default' as const },
  { value: 'concluido', label: 'Concluído', variant: 'secondary' as const },
  { value: 'cancelado', label: 'Cancelado', variant: 'destructive' as const },
];

const GOAL_STATUS = [
  { value: 'nao_iniciado', label: 'Não Iniciado', variant: 'outline' as const },
  { value: 'em_andamento', label: 'Em Andamento', variant: 'default' as const },
  { value: 'concluido', label: 'Concluído', variant: 'secondary' as const },
];

function statusBadge(options: typeof PROJECT_STATUS | typeof GOAL_STATUS, value: string) {
  const opt = options.find((o) => o.value === value);
  return <Badge variant={opt?.variant ?? 'outline'}>{opt?.label ?? value}</Badge>;
}

// ---------- Planos de Aula ----------

function PlanosDeAula() {
  const { list, create, update, remove } = useLessonPlans();
  const { data: classes = [] } = useClasses();
  const { data: subjects = [] } = useSubjects();
  const { data: terms = [] } = useAcademicTerms();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<LessonPlanRow | null>(null);
  const [form, setForm] = useState({ title: '', class_id: '', subject_id: '', term_id: '', lesson_date: '', objectives: '', content: '' });

  const reset = () => { setEditing(null); setForm({ title: '', class_id: '', subject_id: '', term_id: '', lesson_date: '', objectives: '', content: '' }); };
  const openCreate = () => { reset(); setIsOpen(true); };
  const openEdit = (row: LessonPlanRow) => {
    setEditing(row);
    setForm({
      title: row.title, class_id: row.class_id, subject_id: row.subject_id, term_id: row.term_id ?? '',
      lesson_date: row.lesson_date, objectives: row.objectives ?? '', content: row.content ?? '',
    });
    setIsOpen(true);
  };

  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));

  const save = () => {
    const payload = {
      title: form.title, class_id: form.class_id, subject_id: form.subject_id,
      term_id: form.term_id || null, lesson_date: form.lesson_date,
      objectives: form.objectives || null, content: form.content || null,
    };
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => { setIsOpen(false); reset(); } });
    else create.mutate(payload, { onSuccess: () => { setIsOpen(false); reset(); } });
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Plano de Aula</Button>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !list.data?.length ? (
        <EmptyState title="Nenhum plano de aula cadastrado" description="Cadastre o primeiro plano de aula da turma." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <IconBadge icon={BookOpen} tone="info" variant="totem" size="sm" />
                  <div>
                    <CardTitle className="text-lg">{row.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {classNames.get(row.class_id) ?? '—'} · {subjectNames.get(row.subject_id) ?? '—'} · {fmtDate(row.lesson_date)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm('Remover este plano de aula?')) remove.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              {(row.objectives || row.content) && (
                <CardContent className="space-y-2 text-sm">
                  {row.objectives && <p><span className="font-medium">Objetivos: </span>{row.objectives}</p>}
                  {row.content && <p className="whitespace-pre-wrap"><span className="font-medium">Conteúdo: </span>{row.content}</p>}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Plano de Aula' : 'Novo Plano de Aula'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Turma *</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Disciplina *</Label>
                <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Data da Aula *</Label><Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} /></div>
              <div>
                <Label>Período (opcional)</Label>
                <Select value={form.term_id} onValueChange={(v) => setForm({ ...form, term_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{terms.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Objetivos</Label><Textarea value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} rows={2} /></div>
            <div><Label>Conteúdo / Desenvolvimento</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button disabled={!form.title.trim() || !form.class_id || !form.subject_id || !form.lesson_date || saving} onClick={save}>
              {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Acompanhamento ----------

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function Acompanhamento() {
  const { list, create, update, remove } = useTrackingNotes();
  const { data: students = [] } = useStudentsLite();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<TrackingNoteRow | null>(null);
  const [form, setForm] = useState({ student_id: '', category: 'academico', note_date: '', note: '' });

  const reset = () => { setEditing(null); setForm({ student_id: '', category: 'academico', note_date: '', note: '' }); };
  const openCreate = () => { reset(); setIsOpen(true); };
  const openEdit = (row: TrackingNoteRow) => {
    setEditing(row);
    setForm({ student_id: row.student_id, category: row.category, note_date: row.note_date, note: row.note });
    setIsOpen(true);
  };

  const studentNames = new Map(students.map((s) => [s.id, `${s.first_name} ${s.last_name}`]));

  const save = () => {
    const payload = { student_id: form.student_id, category: form.category, note_date: form.note_date, note: form.note };
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => { setIsOpen(false); reset(); } });
    else create.mutate(payload, { onSuccess: () => { setIsOpen(false); reset(); } });
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Registro</Button>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !list.data?.length ? (
        <EmptyState title="Nenhum registro de acompanhamento" description="Registre a primeira observação individual de um aluno." />
      ) : (
        <div className="space-y-3">
          {list.data.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <div className="totem-teal h-9 w-9 shrink-0 flex items-center justify-center rounded-full text-xs font-bold">
                    {initials(studentNames.get(row.student_id) ?? '?')}
                  </div>
                  <div>
                    <CardTitle className="text-base">{studentNames.get(row.student_id) ?? 'Aluno'}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{NOTE_CATEGORIES.find((c) => c.value === row.category)?.label ?? row.category}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(row.note_date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm('Remover este registro?')) remove.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent><p className="text-sm whitespace-pre-wrap">{row.note}</p></CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Registro' : 'Novo Registro de Acompanhamento'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Aluno *</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{NOTE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data *</Label><Input type="date" value={form.note_date} onChange={(e) => setForm({ ...form, note_date: e.target.value })} /></div>
            </div>
            <div><Label>Observação *</Label><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button disabled={!form.student_id || !form.note_date || !form.note.trim() || saving} onClick={save}>
              {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Projetos ----------

function Projetos() {
  const { list, create, update, remove } = usePedagogicalProjects();
  const { data: classes = [] } = useClasses();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [form, setForm] = useState({ title: '', description: '', class_id: '', status: 'planejamento', start_date: '', end_date: '' });

  const reset = () => { setEditing(null); setForm({ title: '', description: '', class_id: '', status: 'planejamento', start_date: '', end_date: '' }); };
  const openCreate = () => { reset(); setIsOpen(true); };
  const openEdit = (row: ProjectRow) => {
    setEditing(row);
    setForm({
      title: row.title, description: row.description ?? '', class_id: row.class_id ?? '',
      status: row.status, start_date: row.start_date ?? '', end_date: row.end_date ?? '',
    });
    setIsOpen(true);
  };

  const classNames = new Map(classes.map((c) => [c.id, c.name]));

  const save = () => {
    const payload = {
      title: form.title, description: form.description || null, class_id: form.class_id || null,
      status: form.status, start_date: form.start_date || null, end_date: form.end_date || null,
    };
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => { setIsOpen(false); reset(); } });
    else create.mutate(payload, { onSuccess: () => { setIsOpen(false); reset(); } });
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Projeto</Button>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !list.data?.length ? (
        <EmptyState title="Nenhum projeto pedagógico cadastrado" description="Cadastre o primeiro projeto pedagógico." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <IconBadge icon={FolderKanban} tone="warm" variant="totem" size="sm" />
                  <div>
                    <CardTitle className="text-lg">{row.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {statusBadge(PROJECT_STATUS, row.status)}
                      {row.class_id && <span className="text-xs text-muted-foreground">{classNames.get(row.class_id)}</span>}
                    </div>
                    {(row.start_date || row.end_date) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {row.start_date ? fmtDate(row.start_date) : '?'} — {row.end_date ? fmtDate(row.end_date) : 'em aberto'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm('Remover este projeto?')) remove.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              {row.description && <CardContent><p className="text-sm whitespace-pre-wrap">{row.description}</p></CardContent>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Projeto' : 'Novo Projeto Pedagógico'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Turma (opcional)</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Todas / não específico" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROJECT_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Início</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>Fim</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button disabled={!form.title.trim() || saving} onClick={save}>
              {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Objetivos ----------

function Objetivos() {
  const { list, create, update, remove } = usePedagogicalGoals();
  const { data: classes = [] } = useClasses();
  const { list: projectsList } = usePedagogicalProjects();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<GoalRow | null>(null);
  const [form, setForm] = useState({ title: '', description: '', project_id: '', class_id: '', target_date: '', status: 'nao_iniciado' });

  const reset = () => { setEditing(null); setForm({ title: '', description: '', project_id: '', class_id: '', target_date: '', status: 'nao_iniciado' }); };
  const openCreate = () => { reset(); setIsOpen(true); };
  const openEdit = (row: GoalRow) => {
    setEditing(row);
    setForm({
      title: row.title, description: row.description ?? '', project_id: row.project_id ?? '',
      class_id: row.class_id ?? '', target_date: row.target_date ?? '', status: row.status,
    });
    setIsOpen(true);
  };

  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const projectNames = new Map((projectsList.data ?? []).map((p) => [p.id, p.title]));

  const save = () => {
    const payload = {
      title: form.title, description: form.description || null, project_id: form.project_id || null,
      class_id: form.class_id || null, target_date: form.target_date || null, status: form.status,
    };
    if (editing) update.mutate({ id: editing.id, payload }, { onSuccess: () => { setIsOpen(false); reset(); } });
    else create.mutate(payload, { onSuccess: () => { setIsOpen(false); reset(); } });
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Novo Objetivo</Button>
      </div>

      {list.isLoading ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : !list.data?.length ? (
        <EmptyState title="Nenhum objetivo cadastrado" description="Defina o primeiro objetivo pedagógico." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.data.map((row) => (
            <Card key={row.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-start gap-3">
                  <IconBadge icon={Target} tone="success" variant="totem" size="sm" />
                  <div>
                    <CardTitle className="text-lg">{row.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {statusBadge(GOAL_STATUS, row.status)}
                      {row.project_id && <span className="text-xs text-muted-foreground">Projeto: {projectNames.get(row.project_id) ?? '—'}</span>}
                      {row.class_id && <span className="text-xs text-muted-foreground">{classNames.get(row.class_id)}</span>}
                    </div>
                    {row.target_date && <p className="text-xs text-muted-foreground mt-1">Prazo: {fmtDate(row.target_date)}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm('Remover este objetivo?')) remove.mutate(row.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              {row.description && <CardContent><p className="text-sm whitespace-pre-wrap">{row.description}</p></CardContent>}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) reset(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Objetivo' : 'Novo Objetivo Pedagógico'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Projeto (opcional)</Label>
                <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>{(projectsList.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turma (opcional)</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Prazo</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GOAL_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button disabled={!form.title.trim() || saving} onClick={save}>
              {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Página ----------

export default function Pedagogico() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <IconBadge icon={GraduationCap} tone="primary" variant="totem" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedagógico</h1>
          <p className="text-muted-foreground mt-1">Planejamento e acompanhamento pedagógico</p>
        </div>
      </div>

      <Tabs defaultValue="planos">
        <TabsList className="h-auto flex-wrap gap-1 bg-transparent p-0">
          <TabsTrigger
            value="planos"
            className="gap-2 rounded-full border border-border px-4 py-2 data-[state=active]:bg-accent-warm data-[state=active]:text-accent-warm-foreground data-[state=active]:border-transparent data-[state=active]:shadow-[0_6px_16px_-6px_hsl(14_88%_45%/0.6)]"
          >
            <BookOpen className="h-4 w-4" />Planos de Aula
          </TabsTrigger>
          <TabsTrigger
            value="acompanhamento"
            className="gap-2 rounded-full border border-border px-4 py-2 data-[state=active]:bg-accent-warm data-[state=active]:text-accent-warm-foreground data-[state=active]:border-transparent data-[state=active]:shadow-[0_6px_16px_-6px_hsl(14_88%_45%/0.6)]"
          >
            <Users className="h-4 w-4" />Acompanhamento
          </TabsTrigger>
          <TabsTrigger
            value="projetos"
            className="gap-2 rounded-full border border-border px-4 py-2 data-[state=active]:bg-accent-warm data-[state=active]:text-accent-warm-foreground data-[state=active]:border-transparent data-[state=active]:shadow-[0_6px_16px_-6px_hsl(14_88%_45%/0.6)]"
          >
            <FolderKanban className="h-4 w-4" />Projetos
          </TabsTrigger>
          <TabsTrigger
            value="objetivos"
            className="gap-2 rounded-full border border-border px-4 py-2 data-[state=active]:bg-accent-warm data-[state=active]:text-accent-warm-foreground data-[state=active]:border-transparent data-[state=active]:shadow-[0_6px_16px_-6px_hsl(14_88%_45%/0.6)]"
          >
            <Target className="h-4 w-4" />Objetivos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="planos" className="mt-6"><PlanosDeAula /></TabsContent>
        <TabsContent value="acompanhamento" className="mt-6"><Acompanhamento /></TabsContent>
        <TabsContent value="projetos" className="mt-6"><Projetos /></TabsContent>
        <TabsContent value="objetivos" className="mt-6"><Objetivos /></TabsContent>
      </Tabs>
    </div>
  );
}
