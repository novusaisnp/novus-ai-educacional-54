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
import { StudentInsert, StudentRow, StudentUpdate } from '@/integrations/supabase/db-types';
import { SecretariaModalContext } from '../types';

const exStudentSchema = z.object({
  first_name: z.string().min(1, 'Nome obrigatório'),
  last_name: z.string().min(1, 'Sobrenome obrigatório'),
  birth_date: z.string().optional(),
  gender: z.enum(['masculino', 'feminino', 'outro']).optional(),
  status: z.enum(['inativo', 'transferido']).default('inativo'),
  document_id: z.string().optional(),
  exit_reason: z.string().optional(),
  exit_date: z.string().optional(),
});

type ExStudentFormData = z.infer<typeof exStudentSchema>;

interface SubmodalExAlunosProps {
  context: SecretariaModalContext;
  editingStudent?: StudentRow | null;
  onEditingChange?: (student: StudentRow | null) => void;
}

export function SubmodalExAlunos({ context, editingStudent, onEditingChange }: SubmodalExAlunosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ExStudentFormData>({
    resolver: zodResolver(exStudentSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      birth_date: '',
      gender: 'masculino',
      document_id: '',
      status: 'inativo',
      exit_reason: '',
      exit_date: '',
    },
  });

  // Mutation para criar/editar ex-aluno
  const studentMutation = useMutation({
    mutationFn: async (data: ExStudentFormData) => {
      if (editingStudent) {
        const payload: StudentUpdate = {
          first_name: data.first_name,
          last_name: data.last_name,
          birth_date: data.birth_date || undefined,
          gender: data.gender,
          status: data.status,
          document_id: data.document_id || undefined,
        };

        const { data: updated, error } = await supabase
          .from('students')
          .update(payload)
          .eq('id', editingStudent.id)
          .select()
          .single();
        
        if (error) throw error;
        return updated;
      } else {
        const payload: StudentInsert = {
          organization_id: context.orgId,
          first_name: data.first_name,
          last_name: data.last_name,
          birth_date: data.birth_date || undefined,
          gender: data.gender,
          status: data.status,
          document_id: data.document_id || undefined,
        };

        const { data: created, error } = await supabase
          .from('students')
          .insert([payload])
          .select()
          .single();
        
        if (error) throw error;
        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast({
        title: editingStudent ? 'Ex-aluno atualizado' : 'Ex-aluno registrado',
        description: editingStudent ? 'Ex-aluno atualizado com sucesso.' : 'Novo ex-aluno registrado com sucesso.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar ex-aluno',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ExStudentFormData) => {
    studentMutation.mutate(data);
  };

  // Reset form quando editingStudent muda
  React.useEffect(() => {
    if (editingStudent) {
      form.reset({
        first_name: editingStudent.first_name,
        last_name: editingStudent.last_name,
        birth_date: editingStudent.birth_date || '',
        gender: editingStudent.gender as ExStudentFormData['gender'],
        document_id: editingStudent.document_id || '',
        status: editingStudent.status as ExStudentFormData['status'],
        exit_reason: '',
        exit_date: '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        birth_date: '',
        gender: 'masculino',
        document_id: '',
        status: 'inativo',
        exit_reason: '',
        exit_date: '',
      });
    }
  }, [editingStudent, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Nome do ex-aluno" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Sobrenome do ex-aluno" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="birth_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gênero</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
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
            name="document_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Documento (CPF/RG)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Número do documento" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="transferido">Transferido</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="exit_reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo da Saída</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Transferência, Conclusão, etc." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="exit_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data da Saída</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={context.onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={studentMutation.isPending}>
            {studentMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}