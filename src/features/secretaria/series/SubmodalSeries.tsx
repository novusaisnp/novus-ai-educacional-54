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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const serieSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  segment_id: z.string().min(1, 'Segmento é obrigatório'),
  order_index: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

type SerieFormData = z.infer<typeof serieSchema>;

interface SubmodalSeriesProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string;
}

export function SubmodalSeries({ isOpen, onClose, editingId }: SubmodalSeriesProps) {
  const { data: organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SerieFormData>({
    resolver: zodResolver(serieSchema),
    defaultValues: {
      name: '',
      code: '',
      segment_id: '',
      order_index: 0,
      active: true,
    },
  });

  // Buscar segmentos
  const { data: segments = [] } = useQuery({
    queryKey: ['segments', organization?.organization_id],
    queryFn: async () => {
      if (!organization?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('segments')
        .select('*')
        .eq('organization_id', organization.organization_id)
        .eq('active', true)
        .order('order_index');

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.organization_id,
  });

  // Buscar dados para edição
  const { data: editingSerie } = useQuery({
    queryKey: ['serie', editingId],
    queryFn: async () => {
      if (!editingId || !organization?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('series')
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
  if (editingSerie && editingId) {
    form.reset({
      name: editingSerie.name,
      code: editingSerie.code || '',
      segment_id: editingSerie.segment_id,
      order_index: editingSerie.order_index || 0,
      active: editingSerie.active,
    });
  }

  const createMutation = useMutation({
    mutationFn: async (data: SerieFormData) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');

      const { error } = await supabase
        .from('series')
        .insert({
          name: data.name,
          code: data.code || null,
          segment_id: data.segment_id,
          order_index: data.order_index,
          active: data.active,
          organization_id: organization.organization_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast({ title: 'Série criada com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar série',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SerieFormData) => {
      if (!editingId || !organization?.organization_id) throw new Error('ID não encontrado');

      const { error } = await supabase
        .from('series')
        .update({
          name: data.name,
          code: data.code || null,
          segment_id: data.segment_id,
          order_index: data.order_index,
          active: data.active,
        })
        .eq('id', editingId)
        .eq('organization_id', organization.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['series'] });
      toast({ title: 'Série atualizada com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar série',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: SerieFormData) => {
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
          <DialogTitle>{editingId ? 'Editar Série' : 'Nova Série'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="segment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segmento *</FormLabel>
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 5º Ano" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 5A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="order_index"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Série Ativa</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Determina se a série está ativa no sistema
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