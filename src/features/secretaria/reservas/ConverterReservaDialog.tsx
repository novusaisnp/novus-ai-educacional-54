import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { useActiveContractTemplate } from '@/hooks/useContractTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { IconBadge } from '@/components/IconBadge';
import { UserCheck, FileSignature } from 'lucide-react';
import { StudentInsert, EnrollmentInsert } from '@/integrations/supabase/db-types';
import { createGuardianForStudent } from '../lib/createGuardianForStudent';
import { signEnrollmentContract } from '../lib/signEnrollmentContract';
import { renderContractText, DEFAULT_TEMPLATE_BODY } from '../lib/enrollmentContractTemplate';

const converterSchema = z.object({
  first_name: z.string().min(1, 'Nome obrigatório'),
  last_name: z.string().min(1, 'Sobrenome obrigatório'),
  birth_date: z.string().optional(),
  class_id: z.string().uuid('Selecione a turma de destino'),
  guardian_name: z.string().optional(),
  guardian_relationship: z.string().optional(),
  guardian_document_id: z.string().optional(),
  guardian_phone: z.string().optional(),
  monthly_fee_amount: z.coerce.number().positive('Informe um valor de mensalidade válido'),
  due_day: z.coerce.number().int().min(1, 'Escolha um dia entre 1 e 28').max(28, 'Escolha um dia entre 1 e 28'),
  signer_name: z.string().min(3, 'Digite o nome completo de quem está assinando'),
  accepted_terms: z.boolean().refine((v) => v === true, 'É necessário aceitar os termos do contrato'),
});

type ConverterFormData = z.infer<typeof converterSchema>;

const STEP1_FIELDS = [
  'first_name',
  'last_name',
  'birth_date',
  'class_id',
  'guardian_name',
  'guardian_relationship',
  'guardian_document_id',
  'guardian_phone',
  'monthly_fee_amount',
  'due_day',
] as const;

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
  const { data: orgData } = useOrganization();
  const { data: activeTemplate } = useActiveContractTemplate();

  const [step, setStep] = useState<'dados' | 'contrato'>('dados');

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
      monthly_fee_amount: undefined,
      due_day: 10,
      signer_name: '',
      accepted_terms: false,
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

      let guardian: { id: string; cpf: string | null } | undefined;
      if (data.guardian_name) {
        guardian = await createGuardianForStudent({
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

      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .insert([enrollmentPayload])
        .select()
        .single();

      if (enrollmentError) throw enrollmentError;

      const selectedClass = classes.find((c) => c.id === data.class_id);

      await signEnrollmentContract({
        orgId,
        organizationName: orgData?.organizations?.name || 'Instituição',
        enrollmentId: enrollment.id,
        studentId: student.id,
        studentName: `${data.first_name} ${data.last_name}`,
        studentBirthDate: data.birth_date || undefined,
        guardianId: guardian?.id,
        guardianName: data.guardian_name,
        guardianCpf: guardian?.cpf,
        className: selectedClass ? `${selectedClass.name} - ${selectedClass.year}` : '',
        monthlyFeeAmount: data.monthly_fee_amount,
        dueDay: data.due_day,
        enrollmentDate: enrollmentPayload.enrollment_date as string,
        signerName: data.signer_name,
        activeTemplate: activeTemplate ? { id: activeTemplate.id, body: activeTemplate.body } : null,
        fallbackLogoUrl: orgData?.organizations?.logo_url,
      });

      const { error: updateError } = await supabase
        .from('waitlist_applications')
        .update({ status: 'convertida', converted_student_id: student.id })
        .eq('id', application.id)
        .eq('organization_id', orgId);

      if (updateError) throw updateError;

      return student;
    },
    onSuccess: () => {
      toast({
        title: 'Matrícula criada e contrato assinado!',
        description: 'A reserva foi convertida em aluno matriculado, com contrato de matrícula assinado eletronicamente.',
      });
      queryClient.invalidateQueries({ queryKey: ['waitlist_applications'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment_contracts'] });
      setStep('dados');
      form.reset();
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

  const handleAdvance = async () => {
    const valid = await form.trigger(STEP1_FIELDS as unknown as (keyof ConverterFormData)[]);
    if (valid) setStep('contrato');
  };

  const onSubmit = (data: ConverterFormData) => {
    convertMutation.mutate(data);
  };

  const formValues = form.watch();
  const selectedClassForPreview = classes.find((c) => c.id === formValues.class_id);
  const previewText = renderContractText(activeTemplate?.body || DEFAULT_TEMPLATE_BODY, {
    organizationName: orgData?.organizations?.name || 'Instituição',
    studentName: `${formValues.first_name || ''} ${formValues.last_name || ''}`.trim(),
    studentBirthDate: formValues.birth_date || undefined,
    guardianName: formValues.guardian_name || undefined,
    guardianCpf: formValues.guardian_document_id?.replace(/\D/g, '') || undefined,
    className: selectedClassForPreview ? `${selectedClassForPreview.name} - ${selectedClassForPreview.year}` : '',
    monthlyFeeAmount: formValues.monthly_fee_amount || 0,
    dueDay: formValues.due_day || 10,
    enrollmentDate: new Date().toISOString().split('T')[0],
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setStep('dados');
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <IconBadge icon={step === 'dados' ? UserCheck : FileSignature} tone="success" />
            <div>
              <DialogTitle>{step === 'dados' ? 'Converter em Matrícula' : 'Contrato e Assinatura'}</DialogTitle>
              <DialogDescription>
                {step === 'dados'
                  ? 'Confirme os dados e escolha a turma de destino para matricular o aluno.'
                  : 'Revise o contrato de matrícula e confirme a assinatura eletrônica.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 'dados' && (
              <>
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

                <fieldset className="border border-border rounded-lg p-4 space-y-4">
                  <legend className="text-sm font-semibold px-2">Mensalidade</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="monthly_fee_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor da Mensalidade (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="due_day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia do Vencimento</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" max="28" {...field} />
                          </FormControl>
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
                  <Button type="button" onClick={handleAdvance}>
                    Avançar para o Contrato
                  </Button>
                </div>
              </>
            )}

            {step === 'contrato' && (
              <>
                <ScrollArea className="h-64 border rounded-md p-4">
                  <pre className="whitespace-pre-wrap text-sm font-sans">{previewText}</pre>
                </ScrollArea>

                <FormField
                  control={form.control}
                  name="signer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo de quem está assinando</FormLabel>
                      <FormControl><Input {...field} placeholder="Digite o nome completo" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accepted_terms"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Li e concordo com os termos do contrato de matrícula acima.
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setStep('dados')}>
                    Voltar
                  </Button>
                  <Button type="submit" disabled={convertMutation.isPending}>
                    {convertMutation.isPending ? 'Assinando e Matriculando...' : 'Assinar e Matricular'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
