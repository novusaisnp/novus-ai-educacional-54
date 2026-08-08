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
import { ClassInsert, ClassRow, ClassUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const classSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  year: z.coerce.number().int().min(2000).max(2100),
  grade: z.string().optional(),
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
      grade: '',
      shift: 'manha',
      capacity_limit: undefined,
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
          grade: data.grade || undefined,
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

  // Reset form quando editingClass muda
  React.useEffect(() => {
    if (editingClass) {
      form.reset({
        name: editingClass.name,
        year: editingClass.year,
        shift: editingClass.shift as ClassFormData['shift'],
        grade: editingClass.grade || '',
        capacity_limit: editingClass.capacity_limit ?? undefined,
      });
    } else {
      form.reset({
        name: '',
        year: new Date().getFullYear(),
        grade: '',
        shift: 'manha',
        capacity_limit: undefined,
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

        <div className="grid grid-cols-2 gap-4">
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
        </div>

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