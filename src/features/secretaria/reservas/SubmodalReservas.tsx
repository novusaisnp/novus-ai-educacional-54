import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { SecretariaModalContext } from '../types';
import { WaitlistApplicationRow } from '@/integrations/supabase/db-types';

const reservaSchema = z.object({
  student_full_name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  birth_date: z.date().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  desired_segment_id: z.string().min(1, 'Segmento é obrigatório'),
  desired_series_id: z.string().optional(),
  desired_year: z.number().min(2024, 'Ano deve ser válido'),
  notes: z.string().optional(),
});

type ReservaFormData = z.infer<typeof reservaSchema>;

interface SubmodalReservasProps {
  context: SecretariaModalContext;
  editingReserva?: WaitlistApplicationRow | null;
  onEditingChange?: (reserva: WaitlistApplicationRow | null) => void;
}

export function SubmodalReservas({ 
  context, 
  editingReserva, 
  onEditingChange 
}: SubmodalReservasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMatriculaModal, setShowMatriculaModal] = useState(false);

  const form = useForm<ReservaFormData>({
    resolver: zodResolver(reservaSchema),
    defaultValues: {
      student_full_name: editingReserva?.student_full_name || '',
      birth_date: editingReserva?.birth_date ? new Date(`${editingReserva.birth_date}T00:00:00`) : undefined,
      guardian_name: editingReserva?.guardian_name || '',
      guardian_phone: editingReserva?.guardian_phone || '',
      desired_segment_id: editingReserva?.desired_segment_id || '',
      desired_series_id: editingReserva?.desired_series_id || '',
      desired_year: editingReserva?.desired_year || new Date().getFullYear(),
      notes: editingReserva?.notes || '',
    },
  });

  // Resetar form quando editingReserva muda (ex.: ModalMestre semeando via prop
  // editingItem depois do mount, não só na inicialização do useForm)
  React.useEffect(() => {
    form.reset({
      student_full_name: editingReserva?.student_full_name || '',
      birth_date: editingReserva?.birth_date ? new Date(`${editingReserva.birth_date}T00:00:00`) : undefined,
      guardian_name: editingReserva?.guardian_name || '',
      guardian_phone: editingReserva?.guardian_phone || '',
      desired_segment_id: editingReserva?.desired_segment_id || '',
      desired_series_id: editingReserva?.desired_series_id || '',
      desired_year: editingReserva?.desired_year || new Date().getFullYear(),
      notes: editingReserva?.notes || '',
    });
  }, [editingReserva, form]);

  const watchedSegment = form.watch('desired_segment_id');

  // Buscar segmentos
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

  // Buscar séries do segmento selecionado
  const { data: series = [] } = useQuery({
    queryKey: ['series', context.orgId, watchedSegment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('series')
        .select('*')
        .eq('organization_id', context.orgId)
        .eq('segment_id', watchedSegment)
        .eq('active', true)
        .order('order_index');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!context.orgId && !!watchedSegment,
  });

  const createReservaMutation = useMutation({
    mutationFn: async (data: ReservaFormData) => {
      const { data: reserva, error } = await supabase
        .from('waitlist_applications')
        .insert({
          student_full_name: data.student_full_name,
          birth_date: data.birth_date?.toISOString().split('T')[0] || null,
          guardian_name: data.guardian_name || null,
          guardian_phone: data.guardian_phone || null,
          desired_segment_id: data.desired_segment_id,
          desired_series_id: data.desired_series_id || null,
          desired_year: data.desired_year,
          notes: data.notes || null,
          status: 'pendente',
          organization_id: context.orgId,
        })
        .select()
        .single();

      if (error) throw error;
      return reserva;
    },
    onSuccess: () => {
      toast({ title: 'Reserva de vaga criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['waitlist-applications'] });
      form.reset();
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao criar reserva:', error);
      toast({
        title: 'Erro ao criar reserva',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });

  const updateReservaMutation = useMutation({
    mutationFn: async (data: ReservaFormData) => {
      if (!editingReserva?.id) throw new Error('ID da reserva não encontrado');

      const { error } = await supabase
        .from('waitlist_applications')
        .update({
          student_full_name: data.student_full_name,
          birth_date: data.birth_date?.toISOString().split('T')[0] || null,
          guardian_name: data.guardian_name || null,
          guardian_phone: data.guardian_phone || null,
          desired_segment_id: data.desired_segment_id,
          desired_series_id: data.desired_series_id || null,
          desired_year: data.desired_year,
          notes: data.notes || null,
        })
        .eq('id', editingReserva.id)
        .eq('organization_id', context.orgId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Reserva atualizada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['waitlist-applications'] });
      onEditingChange?.(null);
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao atualizar reserva:', error);
      toast({
        title: 'Erro ao atualizar reserva',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: ReservaFormData) => {
    setIsSubmitting(true);
    try {
      if (editingReserva) {
        await updateReservaMutation.mutateAsync(data);
      } else {
        await createReservaMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {editingReserva ? 'Editar Reserva de Vaga' : 'Nova Reserva de Vaga'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Gerencie reservas de vagas para futuros estudantes.
        </p>
      </div>

      {editingReserva && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Ações da Reserva
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={editingReserva.status === 'pendente' ? 'default' : 'secondary'}>
                {editingReserva.status}
              </Badge>
              {editingReserva.status === 'aprovada' && (
                <p className="text-sm text-muted-foreground">
                  Use o botão "Converter em Matrícula" na lista de reservas para matricular o aluno.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="student_full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo do Estudante *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardian_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guardian_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone do Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="desired_segment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segmento Desejado *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
              name="desired_series_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Série Desejada</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={!watchedSegment}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a série" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {series.map((serie) => (
                        <SelectItem key={serie.id} value={serie.id}>
                          {serie.name}
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
              name="desired_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano Letivo Desejado *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="2024" 
                      max="2030"
                      placeholder="2025"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Observações adicionais sobre a reserva..."
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onEditingChange?.(null)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : editingReserva ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}