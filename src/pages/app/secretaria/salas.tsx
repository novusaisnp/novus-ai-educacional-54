import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Plus } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useClassroomsAdmin, useUpsertClassroom, type ClassroomFormInput } from '@/hooks/useAppQueries';
import EmptyState from '@/components/EmptyState';

const roomSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  type: z.enum(['classroom', 'lab', 'auditorium', 'library', 'other']),
  capacity: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive('Capacidade deve ser maior que zero').optional()
  ),
  building: z.string().optional(),
  resources: z.string().optional(),
});

type RoomFormData = z.infer<typeof roomSchema>;

const TYPE_LABELS: Record<ClassroomFormInput['type'], string> = {
  classroom: 'Sala de aula',
  lab: 'Laboratório',
  auditorium: 'Auditório',
  library: 'Biblioteca',
  other: 'Outro',
};

export default function SalasPage() {
  const { toast } = useToast();
  const { data: rooms = [], isLoading } = useClassroomsAdmin();
  const upsertRoom = useUpsertClassroom();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof rooms)[number] | null>(null);

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: { name: '', code: '', type: 'classroom', capacity: undefined, building: '', resources: '' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', code: '', type: 'classroom', capacity: undefined, building: '', resources: '' });
    setDialogOpen(true);
  };

  const openEdit = (room: (typeof rooms)[number]) => {
    setEditing(room);
    form.reset({
      name: room.name,
      code: room.code ?? '',
      type: room.type as ClassroomFormInput['type'],
      capacity: room.capacity ?? undefined,
      building: room.building ?? '',
      resources: (room.resources ?? []).join(', '),
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: RoomFormData) => {
    try {
      await upsertRoom.mutateAsync({
        id: editing?.id,
        name: data.name,
        code: data.code || null,
        type: data.type,
        capacity: data.capacity ?? null,
        building: data.building || null,
        resources: data.resources ? data.resources.split(',').map((r) => r.trim()).filter(Boolean) : [],
        active: editing?.active ?? true,
      });
      toast({ title: editing ? 'Sala atualizada' : 'Sala criada' });
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar sala',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (room: (typeof rooms)[number]) => {
    try {
      await upsertRoom.mutateAsync({
        id: room.id,
        name: room.name,
        code: room.code,
        type: room.type as ClassroomFormInput['type'],
        capacity: room.capacity,
        building: room.building,
        resources: room.resources ?? [],
        active: !room.active,
      });
    } catch (error) {
      toast({
        title: 'Erro ao atualizar sala',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={Building2} tone="primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salas</h1>
            <p className="text-muted-foreground">Ambientes físicos disponíveis para atribuir a turmas.</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Sala
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && rooms.length === 0 && (
        <EmptyState title="Nenhuma sala cadastrada" description="Cadastre a primeira sala pra começar a atribuir turmas a ambientes." />
      )}

      {!isLoading && rooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Salas ({rooms.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Bloco</TableHead>
                    <TableHead>Ativa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">
                        {room.name} {room.code ? <span className="text-muted-foreground">({room.code})</span> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{TYPE_LABELS[room.type as ClassroomFormInput['type']] || room.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{room.capacity ?? '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{room.building || '—'}</TableCell>
                      <TableCell>
                        <Switch checked={room.active} onCheckedChange={() => toggleActive(room)} disabled={upsertRoom.isPending} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(room)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar sala' : 'Nova sala'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Sala 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="S101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade (opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} placeholder="30" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="building"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bloco (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Bloco A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="resources"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recursos (opcional, separados por vírgula)</FormLabel>
                    <FormControl>
                      <Input placeholder="Projetor, Ar-condicionado" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={upsertRoom.isPending}>
                  {upsertRoom.isPending ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
