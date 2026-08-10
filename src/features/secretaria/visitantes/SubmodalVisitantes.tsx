import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

const visitanteSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório'),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  relation: z.string().optional(),
  visit_date: z.string().min(1, 'Data da visita é obrigatória'),
  purpose: z.string().optional(),
  notes: z.string().optional(),
});

type VisitanteFormData = z.infer<typeof visitanteSchema>;

interface SubmodalVisitantesProps {
  isOpen: boolean;
  onClose: () => void;
  editingId?: string;
  /** false quando renderizado dentro do Dialog de outro componente (ex. ModalMestre) — evita dois Dialog Radix sobrepostos */
  asDialog?: boolean;
}

export function SubmodalVisitantes({ isOpen, onClose, editingId, asDialog = true }: SubmodalVisitantesProps) {
  const { data: organization } = useOrganization();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VisitanteFormData>({
    resolver: zodResolver(visitanteSchema),
    defaultValues: {
      full_name: '',
      document: '',
      phone: '',
      email: '',
      relation: '',
      visit_date: new Date().toISOString().split('T')[0],
      purpose: '',
      notes: '',
    },
  });

  // Buscar dados para edição
  const { data: editingVisitor } = useQuery({
    queryKey: ['visitor', editingId],
    queryFn: async () => {
      if (!editingId || !organization?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('visitors')
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
    if (editingVisitor && editingId) {
      form.reset({
        full_name: editingVisitor.full_name,
        document: editingVisitor.document || '',
        phone: editingVisitor.phone || '',
        email: editingVisitor.email || '',
        relation: editingVisitor.relation || '',
        visit_date: editingVisitor.visit_date?.split('T')[0] || '',
        purpose: editingVisitor.purpose || '',
        notes: editingVisitor.notes || '',
      });
    }
  }, [editingVisitor, editingId, form]);

  const createMutation = useMutation({
    mutationFn: async (data: VisitanteFormData) => {
      if (!organization?.organization_id) throw new Error('Organização não encontrada');

      const { error } = await supabase
        .from('visitors')
        .insert({
          full_name: data.full_name,
          document: data.document || null,
          phone: data.phone || null,
          email: data.email || null,
          relation: data.relation || null,
          visit_date: new Date(data.visit_date + 'T00:00:00').toISOString(),
          purpose: data.purpose || null,
          notes: data.notes || null,
          organization_id: organization.organization_id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visitante registrado com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao registrar visitante',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: VisitanteFormData) => {
      if (!editingId || !organization?.organization_id) throw new Error('ID não encontrado');

      const { error } = await supabase
        .from('visitors')
        .update({
          full_name: data.full_name,
          document: data.document || null,
          phone: data.phone || null,
          email: data.email || null,
          relation: data.relation || null,
          visit_date: new Date(data.visit_date + 'T00:00:00').toISOString(),
          purpose: data.purpose || null,
          notes: data.notes || null,
        })
        .eq('id', editingId)
        .eq('organization_id', organization.organization_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visitante atualizado com sucesso!' });
      onClose();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar visitante',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: VisitanteFormData) => {
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

  const content = (
    <>
      <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">
        {editingId ? 'Editar Visitante' : 'Novo Visitante'}
      </h3>

      <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo do visitante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento</FormLabel>
                    <FormControl>
                      <Input placeholder="RG, CPF ou Passaporte" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="visitante@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relação/Motivo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Pai de aluno" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="visit_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data da Visita *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Finalidade da Visita</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Reunião pedagógica" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações adicionais..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Atualizar' : 'Registrar'}
              </Button>
            </div>
          </form>
      </Form>
    </>
  );

  if (!asDialog) {
    return content;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {content}
      </DialogContent>
    </Dialog>
  );
}