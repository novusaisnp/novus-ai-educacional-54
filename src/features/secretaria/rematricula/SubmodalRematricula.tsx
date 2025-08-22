import React from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnrollmentInsert, EnrollmentUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const reenrollmentSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno'),
  new_class_id: z.string().uuid('Selecione uma nova turma'),
  enrollment_date: z.string().min(1, 'Data de matrícula obrigatória'),
  previous_class: z.string().optional(),
  observations: z.string().optional(),
});

type ReenrollmentFormData = z.infer<typeof reenrollmentSchema>;

interface SubmodalRematriculaProps {
  context: SecretariaModalContext;
  editingReenrollment?: any;
  onEditingChange?: (reenrollment: any) => void;
}

export function SubmodalRematricula({ context, editingReenrollment, onEditingChange }: SubmodalRematriculaProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ReenrollmentFormData>({
    resolver: zodResolver(reenrollmentSchema),
    defaultValues: {
      student_id: '',
      new_class_id: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      previous_class: '',
      observations: '',
    },
  });

  // Query para buscar alunos
  const { data: students = [] } = useQuery({
    queryKey: ['students', context.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('status', 'ativo')
        .order('first_name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!context.orgId,
  });

  // Query para buscar turmas
  const { data: classes = [] } = useQuery({
    queryKey: ['classes', context.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, grade')
        .order('year', { ascending: false })
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!context.orgId,
  });

  // Mutation para processar rematrícula
  const reenrollmentMutation = useMutation({
    mutationFn: async (data: ReenrollmentFormData) => {
      // Criar nova matrícula
      const payload: EnrollmentInsert = {
        organization_id: context.orgId,
        student_id: data.student_id,
        class_id: data.new_class_id,
        enrollment_date: data.enrollment_date,
        status: 'ativa',
      };

      const { data: created, error } = await supabase
        .from('enrollments')
        .insert([payload])
        .select()
        .single();
      
      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: 'Rematrícula processada',
        description: 'Rematrícula processada com sucesso.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar rematrícula',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ReenrollmentFormData) => {
    reenrollmentMutation.mutate(data);
  };

  // Reset form quando editingReenrollment muda
  React.useEffect(() => {
    if (editingReenrollment) {
      form.reset({
        student_id: editingReenrollment.student_id || '',
        new_class_id: editingReenrollment.class_id || '',
        enrollment_date: editingReenrollment.enrollment_date || new Date().toISOString().split('T')[0],
        previous_class: editingReenrollment.previous_class || '',
        observations: editingReenrollment.observations || '',
      });
    } else {
      form.reset({
        student_id: '',
        new_class_id: '',
        enrollment_date: new Date().toISOString().split('T')[0],
        previous_class: '',
        observations: '',
      });
    }
  }, [editingReenrollment, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="student_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aluno</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
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
          name="new_class_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova Turma</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.year} {classItem.grade && `(${classItem.grade})`}
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
          name="enrollment_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data da Rematrícula</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="previous_class"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Turma Anterior</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: 2º Ano A - 2023" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Observações sobre a rematrícula" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={context.onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={reenrollmentMutation.isPending}>
            {reenrollmentMutation.isPending ? 'Processando...' : 'Processar Rematrícula'}
          </Button>
        </div>
      </form>
    </Form>
  );
}