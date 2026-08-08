import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SubjectInsert, SubjectUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const subjectSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  code: z.string().optional(),
  bncc_axis: z.string().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface SubmodalDisciplinasProps {
  context: SecretariaModalContext;
  editingSubject?: any;
  onEditingChange?: (subject: any) => void;
}

export function SubmodalDisciplinas({ context, editingSubject, onEditingChange }: SubmodalDisciplinasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      code: '',
      bncc_axis: '',
    },
  });

  // Mutation para criar/editar disciplina
  const subjectMutation = useMutation({
    mutationFn: async (data: SubjectFormData) => {
      if (editingSubject) {
        const payload: SubjectUpdate = {
          name: data.name,
          code: data.code || undefined,
          bncc_axis: data.bncc_axis || undefined,
        };

        const { data: updated, error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', editingSubject.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        const payload: SubjectInsert = {
          organization_id: context.orgId,
          name: data.name,
          code: data.code || undefined,
          bncc_axis: data.bncc_axis || undefined,
        };

        const { data: created, error } = await supabase
          .from('subjects')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      toast({
        title: editingSubject ? 'Disciplina atualizada' : 'Disciplina criada',
        description: editingSubject ? 'Disciplina atualizada com sucesso.' : 'Nova disciplina criada com sucesso.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar disciplina',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: SubjectFormData) => {
    subjectMutation.mutate(data);
  };

  // Reset form quando editingSubject muda
  React.useEffect(() => {
    if (editingSubject) {
      form.reset({
        name: editingSubject.name,
        code: editingSubject.code,
        bncc_axis: editingSubject.bncc_axis || '',
      });
    } else {
      form.reset({
        name: '',
        code: '',
        bncc_axis: '',
      });
    }
  }, [editingSubject, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Disciplina</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Matemática" />
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
                <Input {...field} placeholder="Ex: MAT001" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bncc_axis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Eixo BNCC</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Linguagens" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={context.onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={subjectMutation.isPending}>
            {subjectMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}