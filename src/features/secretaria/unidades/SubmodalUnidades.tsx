import React, { useState } from 'react';
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

const addressSchema = z.object({
  street: z.string().optional(),
  number: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

const unidadeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  address: addressSchema.optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  active: z.boolean().default(true),
});

type UnidadeFormData = z.infer<typeof unidadeSchema>;
type UnidadeAddress = z.infer<typeof addressSchema>;

interface SubmodalUnidadesProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string;
}

export function SubmodalUnidades({ isOpen, onClose, editingId }: SubmodalUnidadesProps) {
  const { data: organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UnidadeFormData>({
    resolver: zodResolver(unidadeSchema),
    defaultValues: {
      name: '',
      code: '',
      address: {
        street: '',
        number: '',
        district: '',
        city: '',
        state: '',
        zip: '',
      },
      phone: '',
      email: '',
      active: true,
    },
  });

  // Buscar dados para edição
  const { data: editingUnit } = useQuery({
    queryKey: ['unit', editingId],
    queryFn: async () => {
      if (!editingId || !organization?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('units')
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
  React.useEffect(() => {
    if (editingUnit && editingId) {
      const address = editingUnit.address as UnidadeAddress | null;
      form.reset({
        name: editingUnit.name,
        code: editingUnit.code || '',
        address: address || {},
        phone: editingUnit.phone || '',
        email: editingUnit.email || '',
        active: editingUnit.active,
      });
    }
  }, [editingUnit, editingId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: UnidadeFormData) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');

      const { error } = await supabase
        .from('units')
        .insert({
          name: data.name,
          code: data.code || null,
          phone: data.phone || null,
          email: data.email || null,
          active: data.active,
          address: data.address || null,
          organization_id: organization.organization_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unidade criada com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar unidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UnidadeFormData) => {
      if (!editingId || !organization?.organization_id) throw new Error('ID não encontrado');

      const { error } = await supabase
        .from('units')
        .update({
          name: data.name,
          code: data.code || null,
          phone: data.phone || null,
          email: data.email || null,
          active: data.active,
          address: data.address || null,
        })
        .eq('id', editingId)
        .eq('organization_id', organization.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      toast({ title: 'Unidade atualizada com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar unidade',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: UnidadeFormData) => {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingId ? 'Editar Unidade' : 'Nova Unidade'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da unidade" {...field} />
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
                      <Input placeholder="Código da unidade" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Endereço</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="UF" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address.zip"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="unidade@escola.com" {...field} />
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
                    <FormLabel>Unidade Ativa</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Determina se a unidade está ativa no sistema
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