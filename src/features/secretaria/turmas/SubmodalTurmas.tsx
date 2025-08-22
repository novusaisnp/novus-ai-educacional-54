import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassInsert, ClassUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const classSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  year: z.coerce.number().int().min(2000).max(2100),
  grade: z.string().optional(),
  shift: z.enum(['manha', 'tarde', 'noite']).optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface SubmodalTurmasProps {
  context: SecretariaModalContext;
  editingClass?: any;
  onEditingChange?: (classItem: any) => void;
}

export function SubmodalTurmas({ context, editingClass, onEditingChange }: SubmodalTurmasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      grade: '',
      shift: 'manha',
    },
  });

  // Mutation para criar/editar turma
  const classMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      if (editingClass) {
        const payload: ClassUpdate = {
          name: data.name,
          year: Number(data.year),
          grade: data.grade || undefined,
          shift: data.shift || undefined,
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
          grade: data.grade || undefined,
          shift: data.shift || undefined,
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
    onError: (error: any) => {
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

  // Reset form quando editingClass muda
  React.useEffect(() => {
    if (editingClass) {
      form.reset({
        name: editingClass.name,
        year: editingClass.year,
        shift: editingClass.shift,
        grade: editingClass.grade || '',
      });
    } else {
      form.reset({
        name: '',
        year: new Date().getFullYear(),
        grade: '',
        shift: 'manha',
      });
    }
  }, [editingClass, form]);

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

        <div className="grid grid-cols-2 gap-4">
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manha">Manhã</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                    <SelectItem value="noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="grade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Série</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: 1º Ano" />
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