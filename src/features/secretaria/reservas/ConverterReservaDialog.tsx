import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IconBadge } from '@/components/IconBadge';
import { UserCheck } from 'lucide-react';
import { StudentInsert, EnrollmentInsert } from '@/integrations/supabase/db-types';
import { createGuardianForStudent } from '../lib/createGuardianForStudent';

const converterSchema = z.object({
  first_name: z.string().min(1, 'Nome obrigatório'),
  last_name: z.string().min(1, 'Sobrenome obrigatório'),
  birth_date: z.string().optional(),
  class_id: z.string().uuid('Selecione a turma de destino'),
  guardian_name: z.string().optional(),
  guardian_relationship: z.string().optional(),
  guardian_document_id: z.string().optional(),
  guardian_phone: z.string().optional(),
});

type ConverterFormData = z.infer<typeof converterSchema>;

const splitName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    first: parts[0] || '',
    last: parts.slice(1).join(' ') || '',
  };
};

interface ConverterReservaDialogProps {
  open: boolean;
  onClose: () => void;
  application: any;
  orgId: string;
}

export function ConverterReservaDialog({ open, onClose, application, orgId }: ConverterReservaDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { first, last } = splitName(application?.student_full_name || '');

  const form = useForm<ConverterFormData>({
    resolver: zodResolver(converterSchema),
    defaultValues: {
      first_name: first,
      last_name: last,
      birth_date: application?.birth_date || '',
      class_id: '',
      guardian_name: application?.guardian_name || '',
      guardian_relationship: '',
      guardian_document_id: '',
      guardian_phone: application?.guardian_phone || '',
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-for-conversion', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, grade, shift')
        .eq('organization_id', orgId)
        .order('year', { ascending: false })
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!orgId,
  });

  const convertMutation = useMutation({
    mutationFn: async (data: ConverterFormData) => {
      const studentPayload: StudentInsert = {
        organization_id: orgId,
        first_name: data.first_name,
        last_name: data.last_name,
        birth_date: data.birth_date || undefined,
        status: 'ativo',
      };

      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert([studentPayload])
        .select()
        .single();

      if (studentError) throw studentError;

      if (data.guardian_name) {
        await createGuardianForStudent({
          orgId,
          studentId: student.id,
          name: data.guardian_name,
          relationship: data.guardian_relationship,
          documentId: data.guardian_document_id,
          phone: data.guardian_phone,
        });
      }

      const enrollmentPayload: EnrollmentInsert = {
        organization_id: orgId,
        student_id: student.id,
        class_id: data.class_id,
        status: 'ativa',
        enrollment_date: new Date().toISOString().split('T')[0],
      };

      const { error: enrollmentError } = await supabase
        .from('enrollments')
        .insert([enrollmentPayload]);

      if (enrollmentError) throw enrollmentError;

      const { error: updateError } = await supabase
        .from('waitlist_applications')
        .update({ status: 'convertida', converted_student_id: student.id })
        .eq('id', application.id)
        .eq('organization_id', orgId);

      if (updateError) throw updateError;

      return student;
    },
    onSuccess: () => {
      toast({ title: 'Matrícula criada com sucesso!', description: 'A reserva foi convertida em aluno matriculado.' });
      queryClient.invalidateQueries({ queryKey: ['waitlist_applications'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao converter reserva',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: ConverterFormData) => {
    convertMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <IconBadge icon={UserCheck} tone="success" />
            <div>
              <DialogTitle>Converter em Matrícula</DialogTitle>
              <DialogDescription>
                Confirme os dados e escolha a turma de destino para matricular o aluno.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <fieldset className="border border-border rounded-lg p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Dados do Aluno</legend>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Input {...field} /></FormControl>
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
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turma de Destino *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a turma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name} - {classItem.year} ({classItem.grade || 'Sem série'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            <fieldset className="border border-border rounded-lg p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Responsável</legend>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="guardian_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardian_relationship"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Parentesco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mae">Mãe</SelectItem>
                          <SelectItem value="pai">Pai</SelectItem>
                          <SelectItem value="avo">Avô/Avó</SelectItem>
                          <SelectItem value="tio">Tio/Tia</SelectItem>
                          <SelectItem value="tutor">Tutor Legal</SelectItem>
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
                  name="guardian_document_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="guardian_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </fieldset>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={convertMutation.isPending}>
                {convertMutation.isPending ? 'Matriculando...' : 'Confirmar Matrícula'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
