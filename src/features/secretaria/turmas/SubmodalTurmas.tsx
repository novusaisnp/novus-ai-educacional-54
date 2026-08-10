import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassInsert, ClassRow, ClassUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';
import { useClassrooms } from '@/hooks/useAppQueries';

const NO_PERIOD = '__none__';
const NO_ROOM = '__none__';

const classSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  year: z.coerce.number().int().min(2000).max(2100),
  period_id: z.string().optional(),
  room_id: z.string().optional(),
  segment_id: z.string().optional(),
  series_id: z.string().optional(),
  shift: z.enum(['manha', 'tarde', 'noite', 'integral']).optional(),
  capacity_limit: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().int().positive().optional()
  ),
});

type ClassFormData = z.infer<typeof classSchema>;

interface SubmodalTurmasProps {
  context: SecretariaModalContext;
  editingClass?: ClassRow | null;
  onEditingChange?: (classItem: ClassRow | null) => void;
}

export function SubmodalTurmas({ context, editingClass, onEditingChange }: SubmodalTurmasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      period_id: NO_PERIOD,
      room_id: NO_ROOM,
      segment_id: '',
      series_id: '',
      shift: 'manha',
      capacity_limit: undefined,
    },
  });

  // Segmentos e séries (mesmo padrão em cascata já usado em SubmodalReservas.tsx)
  const { data: segments = [] } = useQuery({
    queryKey: ['segments', context.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('organization_id', context.orgId)
        .eq('active', true)
        .order('order_index');

      if (error) throw error;
      return data || [];
    },
    enabled: !!context.orgId,
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ['series', context.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', context.orgId)
        .eq('active', true)
        .order('order_index');

      if (error) throw error;
      return data || [];
    },
    enabled: !!context.orgId,
  });

  const { data: periods = [] } = useQuery({
    queryKey: ['periods', context.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('periods')
        .select('id, name, year')
        .eq('organization_id', context.orgId)
        .eq('active', true)
        .order('year', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!context.orgId,
  });

  const { data: classrooms = [] } = useClassrooms();

  const watchedSegment = form.watch('segment_id');
  const availableSeries = allSeries.filter((s) => s.segment_id === watchedSegment);

  // Mutation para criar/editar turma
  const classMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      if (editingClass) {
        const payload: ClassUpdate = {
          name: data.name,
          year: Number(data.year),
          period_id: data.period_id && data.period_id !== NO_PERIOD ? data.period_id : null,
          room_id: data.room_id && data.room_id !== NO_ROOM ? data.room_id : null,
          series_id: data.series_id || null,
          shift: data.shift || undefined,
          capacity_limit: data.capacity_limit ?? null,
        };

        const { data: updated, error } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', editingClass.id)
          .select()
          .single();

        if (error) throw error;
        return updated;
      } else {
        const payload: ClassInsert = {
          organization_id: context.orgId,
          name: data.name,
          year: Number(data.year),
          period_id: data.period_id && data.period_id !== NO_PERIOD ? data.period_id : null,
          room_id: data.room_id && data.room_id !== NO_ROOM ? data.room_id : null,
          series_id: data.series_id || null,
          shift: data.shift || undefined,
          capacity_limit: data.capacity_limit ?? null,
        };

        const { data: created, error } = await supabase
          .from('classes')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: editingClass ? 'Turma atualizada' : 'Turma criada',
        description: editingClass ? 'Turma atualizada com sucesso.' : 'Nova turma criada com sucesso.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar turma',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ClassFormData) => {
    classMutation.mutate(data);
  };

  // Reset form quando editingClass muda. segment_id é derivado da série já
  // vinculada (classes só guarda series_id, não segment_id) — só dá pra
  // resolver depois que allSeries carregou.
  React.useEffect(() => {
    if (editingClass) {
      const currentSeries = allSeries.find((s) => s.id === editingClass.series_id);
      form.reset({
        name: editingClass.name,
        year: editingClass.year,
        period_id: (editingClass as ClassRow & { period_id?: string | null }).period_id || NO_PERIOD,
        room_id: (editingClass as ClassRow & { room_id?: string | null }).room_id || NO_ROOM,
        segment_id: currentSeries?.segment_id || '',
        series_id: editingClass.series_id || '',
        shift: editingClass.shift as ClassFormData['shift'],
        capacity_limit: editingClass.capacity_limit ?? undefined,
      });
    } else {
      form.reset({
        name: '',
        year: new Date().getFullYear(),
        period_id: NO_PERIOD,
        room_id: NO_ROOM,
        segment_id: '',
        series_id: '',
        shift: 'manha',
        capacity_limit: undefined,
      });
    }
  }, [editingClass, allSeries, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Turma</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: 1º Ano A" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="period_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período Letivo (opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhum período" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PERIOD}>Nenhum período</SelectItem>
                    {periods.map((period) => (
                      <SelectItem key={period.id} value={period.id}>
                        {period.name} ({period.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="room_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sala (opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma sala" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_ROOM}>Nenhuma sala</SelectItem>
                    {classrooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} {room.building ? `(${room.building})` : ''} {room.capacity ? `[${room.capacity}]` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shift"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Turno</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                    <SelectItem value="integral">Integral</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="segment_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Segmento</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.setValue('series_id', '');
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {segments.map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="series_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Série</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!watchedSegment}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={watchedSegment ? 'Selecione a série' : 'Selecione o segmento antes'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableSeries.map((series) => (
                      <SelectItem key={series.id} value={series.id}>
                        {series.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="capacity_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacidade (vagas)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="Sem limite"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={context.onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={classMutation.isPending}>
            {classMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
