import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTimeSlots, useCreateTimeSlot, useDeleteTimeSlot } from '@/hooks/useAppQueries';
import { DAY_NAMES } from '@/pages/app/academico/curriculo';
import EmptyState from '@/components/EmptyState';

const timeSlotSchema = z
  .object({
    day_of_week: z.string().min(1, 'Selecione o dia'),
    start_time: z.string().min(1, 'Informe o horário de início'),
    end_time: z.string().min(1, 'Informe o horário de término'),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: 'Horário de término deve ser depois do início',
    path: ['end_time'],
  });

type TimeSlotFormData = z.infer<typeof timeSlotSchema>;

export default function HorariosPage() {
  const { toast } = useToast();
  const { data: slots = [], isLoading } = useTimeSlots();
  const createSlot = useCreateTimeSlot();
  const deleteSlot = useDeleteTimeSlot();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<TimeSlotFormData>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: { day_of_week: '', start_time: '', end_time: '' },
  });

  const onSubmit = async (data: TimeSlotFormData) => {
    try {
      await createSlot.mutateAsync({
        day_of_week: Number(data.day_of_week),
        start_time: data.start_time,
        end_time: data.end_time,
      });
      toast({ title: 'Horário criado' });
      form.reset({ day_of_week: '', start_time: '', end_time: '' });
      setDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao criar horário',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSlot.mutateAsync(id);
      toast({ title: 'Horário removido' });
    } catch (error) {
      toast({
        title: 'Erro ao remover horário',
        description: error instanceof Error ? error.message : 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={Clock} tone="primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Horários</h1>
            <p className="text-muted-foreground">Grade de dia-da-semana × hora disponível para o currículo.</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Horário
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && slots.length === 0 && (
        <EmptyState title="Nenhum horário cadastrado" description="Cadastre o primeiro horário pra começar a montar o currículo." />
      )}

      {!isLoading && slots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Horários ({slots.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{DAY_NAMES[slot.day_of_week]}</TableCell>
                      <TableCell>{slot.start_time.slice(0, 5)}</TableCell>
                      <TableCell>{slot.end_time.slice(0, 5)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(slot.id)}
                          disabled={deleteSlot.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
            <DialogTitle>Novo horário</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="day_of_week"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia da semana *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DAY_NAMES.map((name, index) => (
                          <SelectItem key={index} value={String(index)}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Início *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Término *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createSlot.isPending}>
                  {createSlot.isPending ? 'Salvando...' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
