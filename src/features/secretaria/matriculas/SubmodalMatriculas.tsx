import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnrollmentInsert, EnrollmentRow, EnrollmentUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const enrollmentSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno'),
  class_id: z.string().uuid('Selecione uma turma'),
  status: z.enum(['ativa', 'trancada', 'concluida', 'transferida']).default('ativa'),
  enrollment_date: z.string().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

interface SubmodalMatriculasProps {
  context: SecretariaModalContext;
  editingEnrollment?: EnrollmentRow | null;
  onEditingChange?: (enrollment: EnrollmentRow | null) => void;
}

export function SubmodalMatriculas({ context, editingEnrollment, onEditingChange }: SubmodalMatriculasProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      student_id: '',
      class_id: '',
      status: 'ativa',
      enrollment_date: new Date().toISOString().split('T')[0],
    },
  });

  // Query para carregar alunos para o select
  const { data: students } = useQuery({
    queryKey: ['students-for-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('status', 'ativo')
        .order('first_name');

      if (error) throw error;
      return data;
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes-for-enrollment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, shift, series:series_id(name)')
        .order('year', { ascending: false })
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Mutation para criar/editar matrícula
  const enrollmentMutation = useMutation({
    mutationFn: async (data: EnrollmentFormData) => {
      if (editingEnrollment) {
        const payload: EnrollmentUpdate = {
          student_id: data.student_id,
          class_id: data.class_id,
          status: data.status,
          enrollment_date: data.enrollment_date || undefined,
        };

        const { data: updated, error } = await supabase
          .from('enrollments')
          .update(payload)
          .eq('id', editingEnrollment.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        const payload: EnrollmentInsert = {
          organization_id: context.orgId,
          student_id: data.student_id,
          class_id: data.class_id,
          status: data.status,
          enrollment_date: data.enrollment_date || undefined,
        };

        const { data: created, error } = await supabase
          .from('enrollments')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      toast({
        title: editingEnrollment ? 'Matrícula atualizada' : 'Matrícula criada',
        description: editingEnrollment ? 'Matrícula atualizada com sucesso.' : 'Nova matrícula criada com sucesso.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar matrícula',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: EnrollmentFormData) => {
    enrollmentMutation.mutate(data);
  };

  // Reset form quando editingEnrollment muda
  React.useEffect(() => {
    if (editingEnrollment) {
      form.reset({
        student_id: editingEnrollment.student_id,
        class_id: editingEnrollment.class_id,
        status: editingEnrollment.status as EnrollmentFormData['status'],
        enrollment_date: editingEnrollment.enrollment_date || '',
      });
    } else {
      form.reset({
        student_id: '',
        class_id: '',
        status: 'ativa',
        enrollment_date: new Date().toISOString().split('T')[0],
      });
    }
  }, [editingEnrollment, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="student_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aluno</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {students?.map((student) => (
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
          name="class_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Turma</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {classes?.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} - {classItem.year} ({classItem.series?.name || 'Sem série'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="trancada">Trancada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="transferida">Transferida</SelectItem>
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
                <FormLabel>Data da Matrícula</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    {...field}
                    value={field.value || ''}
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
          <Button type="submit" disabled={enrollmentMutation.isPending}>
            {enrollmentMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}