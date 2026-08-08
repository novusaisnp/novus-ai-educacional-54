import { useState, useEffect } from 'react';
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

const segmentoSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  order_index: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

type SegmentoFormData = z.infer<typeof segmentoSchema>;

interface SubmodalSegmentosProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string;
}

export function SubmodalSegmentos({ isOpen, onClose, editingId }: SubmodalSegmentosProps) {
  const { data: organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SegmentoFormData>({
    resolver: zodResolver(segmentoSchema),
    defaultValues: {
      name: '',
      code: '',
      order_index: 0,
      active: true,
    },
  });

  // Buscar dados para edição
  const { data: editingSegment } = useQuery({
    queryKey: ['segment', editingId],
    queryFn: async () => {
      if (!editingId || !organization?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('segments')
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
  useEffect(() => {
    if (editingSegment && editingId) {
      form.reset({
        name: editingSegment.name,
        code: editingSegment.code || '',
        order_index: editingSegment.order_index || 0,
        active: editingSegment.active,
      });
    }
  }, [editingSegment, editingId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SegmentoFormData) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');

      const { error } = await supabase
        .from('segments')
        .insert({
          name: data.name,
          code: data.code || null,
          order_index: data.order_index,
          active: data.active,
          organization_id: organization.organization_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      toast({ title: 'Segmento criado com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar segmento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SegmentoFormData) => {
      if (!editingId || !organization?.organization_id) throw new Error('ID não encontrado');

      const { error } = await supabase
        .from('segments')
        .update({
          name: data.name,
          code: data.code || null,
          order_index: data.order_index,
          active: data.active,
        })
        .eq('id', editingId)
        .eq('organization_id', organization.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      toast({ title: 'Segmento atualizado com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar segmento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: SegmentoFormData) => {
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
          <DialogTitle>{editingId ? 'Editar Segmento' : 'Novo Segmento'}</DialogTitle>
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
                    <Input placeholder="Ex: Educação Infantil" {...field} />
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
                    <Input placeholder="Ex: EI" {...field} />
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
                    <FormLabel>Segmento Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Determina se o segmento está ativo no sistema
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