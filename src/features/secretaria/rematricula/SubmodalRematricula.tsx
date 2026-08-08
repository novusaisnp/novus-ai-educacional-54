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
import { ReEnrollmentInsert } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const reenrollmentSchema = z.object({
  student_id: z.string().uuid('Selecione um aluno'),
  new_class_id: z.string().uuid('Selecione uma nova turma'),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
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
      guardian_name: '',
      guardian_phone: '',
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

  // Mutation: cria uma SOLICITAÇÃO de rematrícula (pendente de aprovação), não a matrícula direto
  const reenrollmentMutation = useMutation({
    mutationFn: async (data: ReenrollmentFormData) => {
      const { data: activeEnrollment } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', data.student_id)
        .eq('status', 'ativa')
        .maybeSingle();

      const payload: ReEnrollmentInsert = {
        organization_id: context.orgId,
        student_id: data.student_id,
        current_class_id: activeEnrollment?.class_id ?? null,
        target_class_id: data.new_class_id,
        guardian_name: data.guardian_name || null,
        guardian_phone: data.guardian_phone || null,
        notes: data.observations || null,
        status: 'pendente',
      };

      const { data: created, error } = await supabase
        .from('re_enrollments')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['re_enrollments'] });
      toast({
        title: 'Solicitação de rematrícula criada',
        description: 'A solicitação foi registrada como pendente de aprovação.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar solicitação de rematrícula',
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
        new_class_id: editingReenrollment.target_class_id || '',
        guardian_name: editingReenrollment.guardian_name || '',
        guardian_phone: editingReenrollment.guardian_phone || '',
        observations: editingReenrollment.notes || '',
      });
    } else {
      form.reset({
        student_id: '',
        new_class_id: '',
        guardian_name: '',
        guardian_phone: '',
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
              <Select onValueChange={field.onChange} value={field.value}>
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
              <FormLabel>Turma de Destino</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
          name="guardian_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Responsável</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Nome do responsável" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guardian_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone do Responsável</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(11) 99999-9999" />
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
            {reenrollmentMutation.isPending ? 'Enviando...' : 'Solicitar Rematrícula'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
