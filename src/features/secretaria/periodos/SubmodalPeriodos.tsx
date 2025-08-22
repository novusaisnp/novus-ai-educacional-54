import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const periodoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  year: z.number().int().min(2020).max(2050),
  date_start: z.string().min(1, 'Data de início é obrigatória'),
  date_end: z.string().min(1, 'Data de fim é obrigatória'),
  active: z.boolean().default(true),
}).refine((data) => new Date(data.date_start) <= new Date(data.date_end), {
  message: 'Data de início deve ser anterior à data de fim',
  path: ['date_start'],
});

type PeriodoFormData = z.infer<typeof periodoSchema>;

interface SubmodalPeriodosProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string;
}

export function SubmodalPeriodos({ isOpen, onClose, editingId }: SubmodalPeriodosProps) {
  const { data: organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentYear = new Date().getFullYear();

  const form = useForm<PeriodoFormData>({
    resolver: zodResolver(periodoSchema),
    defaultValues: {
      name: '',
      year: currentYear,
      date_start: '',
      date_end: '',
      active: true,
    },
  });

  // Buscar dados para edição
  const { data: editingPeriod } = useQuery({
    queryKey: ['period', editingId],
    queryFn: async () => {
      if (!editingId || !organization?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('id', editingId)
        .eq('organization_id', organization.organization_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!editingId && !!organization?.organization_id,
  });

  // Preencher form quando houver dados para edição
  if (editingPeriod && editingId) {
    form.reset({
      name: editingPeriod.name,
      year: editingPeriod.year,
      date_start: editingPeriod.date_start,
      date_end: editingPeriod.date_end,
      active: editingPeriod.active,
    });
  }

  const createMutation = useMutation({
    mutationFn: async (data: PeriodoFormData) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');

      const { error } = await supabase
        .from('periods')
        .insert({
          name: data.name,
          year: data.year,
          date_start: data.date_start,
          date_end: data.date_end,
          active: data.active,
          organization_id: organization.organization_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast({ title: 'Período criado com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar período',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PeriodoFormData) => {
      if (!editingId || !organization?.organization_id) throw new Error('ID não encontrado');

      const { error } = await supabase
        .from('periods')
        .update({
          name: data.name,
          year: data.year,
          date_start: data.date_start,
          date_end: data.date_end,
          active: data.active,
        })
        .eq('id', editingId)
        .eq('organization_id', organization.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast({ title: 'Período atualizado com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar período',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: PeriodoFormData) => {
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Período' : 'Novo Período'}</DialogTitle>
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
                    <Input placeholder="Ex: 1º Semestre 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="2025"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || currentYear)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Fim *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Período Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Determina se o período está ativo no sistema
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}