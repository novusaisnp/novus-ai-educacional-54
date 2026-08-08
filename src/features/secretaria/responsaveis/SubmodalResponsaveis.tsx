import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { SecretariaModalContext } from '../types';
import { erpEmit } from '@/integrations/erp/emit';
import { GuardianRow } from '@/integrations/supabase/db-types';

const guardianSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship: z.string().optional(),
  // CPF é a chave de identidade do responsável no sync com o ERP (upsertClientByCPF)
  // — obrigatório para não fabricar um valor fake na hora de sincronizar.
  cpf: z.string().refine((v) => v.replace(/\D/g, '').length === 11, 'Informe um CPF válido (11 dígitos)'),
  linkedStudents: z.array(z.string()).optional(),
});

type GuardianFormData = z.infer<typeof guardianSchema>;

interface SubmodalResponsaveisProps {
  context: SecretariaModalContext;
  editingGuardian?: GuardianRow | null;
  onEditingChange?: (guardian: GuardianRow | null) => void;
}

export function SubmodalResponsaveis({ 
  context, 
  editingGuardian, 
  onEditingChange 
}: SubmodalResponsaveisProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const form = useForm<GuardianFormData>({
    resolver: zodResolver(guardianSchema),
    defaultValues: {
      name: editingGuardian?.name || '',
      email: editingGuardian?.email || '',
      phone: editingGuardian?.phone || '',
      relationship: editingGuardian?.relationship || '',
      cpf: editingGuardian?.cpf || '',
      linkedStudents: [],
    },
  });

  // Repopular form quando o responsável em edição muda (mount do modal já pode ter
  // acontecido antes de editingGuardian chegar via seed do ModalMestre)
  React.useEffect(() => {
    if (editingGuardian) {
      form.reset({
        name: editingGuardian.name || '',
        email: editingGuardian.email || '',
        phone: editingGuardian.phone || '',
        relationship: editingGuardian.relationship || '',
        cpf: editingGuardian.cpf || '',
        linkedStudents: [],
      });
    }
  }, [editingGuardian, form]);

  // Buscar estudantes para linkagem
  const { data: students = [] } = useQuery({
    queryKey: ['students', context.orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('organization_id', context.orgId)
        .eq('status', 'ativo')
        .order('first_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!context.orgId,
  });

  const filteredStudents = students.filter((student) =>
    `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(studentSearch.trim().toLowerCase())
  );

  // Buscar vínculos existentes se editando
  const { data: existingLinks = [] } = useQuery({
    queryKey: ['guardian-links', editingGuardian?.id],
    queryFn: async () => {
      if (!editingGuardian?.id) return [];
      
      const { data, error } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', editingGuardian.id)
        .eq('organization_id', context.orgId);
      
      if (error) throw error;
      return data?.map(link => link.student_id) || [];
    },
    enabled: !!editingGuardian?.id && !!context.orgId,
  });

  // Atualizar form quando vínculos existentes são carregados
  React.useEffect(() => {
    if (existingLinks.length > 0) {
      form.setValue('linkedStudents', existingLinks);
    }
  }, [existingLinks, form]);

  const createGuardianMutation = useMutation({
    mutationFn: async (data: GuardianFormData) => {
      const cpf = data.cpf.replace(/\D/g, '');
      const { data: guardian, error } = await supabase
        .from('guardians')
        .insert({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          relationship: data.relationship || null,
          cpf,
          organization_id: context.orgId,
        })
        .select()
        .single();

      if (error) throw error;

      // Criar vínculos com estudantes se especificados
      if (data.linkedStudents && data.linkedStudents.length > 0) {
        const links = data.linkedStudents.map(studentId => ({
          guardian_id: guardian.id,
          student_id: studentId,
          organization_id: context.orgId,
          is_primary: false,
          legal_consent: false,
        }));

        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert(links);

        if (linkError) throw linkError;
      }

      // **INTEGRAÇÃO ERP: Sincronizar responsável como cliente (CPF é a chave de identidade)**
      try {
        const erpResult = await erpEmit.upsertClient(context.orgId, {
          cpf,
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
        });

        if (erpResult.ok && !erpResult.skipped) {
          if (erpResult.mock) {
            console.log('[ERP] Cliente sincronizado em modo simulado');
          } else {
            console.log('[ERP] Cliente sincronizado com sucesso');
          }
        } else if (erpResult.error) {
          console.warn('[ERP] Falha na sincronização:', erpResult.error);
          // Não falhar o fluxo principal por causa da integração ERP
        }
      } catch (erpError) {
        console.error('[ERP] Erro na integração:', erpError);
        // Continua sem falhar o fluxo principal
      }

      return guardian;
    },
    onSuccess: () => {
      toast({ title: 'Responsável criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-links'] });
      form.reset();
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao criar responsável:', error);
      toast({
        title: 'Erro ao criar responsável',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });

  const updateGuardianMutation = useMutation({
    mutationFn: async (data: GuardianFormData) => {
      if (!editingGuardian?.id) throw new Error('ID do responsável não encontrado');

      const cpf = data.cpf.replace(/\D/g, '');
      const { error } = await supabase
        .from('guardians')
        .update({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          relationship: data.relationship || null,
          cpf,
        })
        .eq('id', editingGuardian.id)
        .eq('organization_id', context.orgId);

      if (error) throw error;

      // Capturar quais vínculos eram principais antes de recriar (o delete+insert
      // abaixo não pode rebaixar silenciosamente um vínculo já marcado como principal)
      const { data: existingLinks } = await supabase
        .from('student_guardians')
        .select('student_id, is_primary')
        .eq('guardian_id', editingGuardian.id)
        .eq('organization_id', context.orgId);
      const primaryStudentIds = new Set(
        (existingLinks || []).filter((l) => l.is_primary).map((l) => l.student_id)
      );

      // Remover vínculos existentes
      await supabase
        .from('student_guardians')
        .delete()
        .eq('guardian_id', editingGuardian.id)
        .eq('organization_id', context.orgId);

      // Criar novos vínculos
      if (data.linkedStudents && data.linkedStudents.length > 0) {
        const links = data.linkedStudents.map(studentId => ({
          guardian_id: editingGuardian.id,
          student_id: studentId,
          organization_id: context.orgId,
          is_primary: primaryStudentIds.has(studentId),
          legal_consent: false,
        }));

        const { error: linkError } = await supabase
          .from('student_guardians')
          .insert(links);

        if (linkError) throw linkError;
      }

      // **INTEGRAÇÃO ERP: Sincronizar atualização do responsável (CPF é a chave de identidade)**
      try {
        const erpResult = await erpEmit.upsertClient(context.orgId, {
          cpf,
          name: data.name,
          email: data.email || undefined,
          phone: data.phone || undefined,
        });

        if (erpResult.ok && !erpResult.skipped) {
          if (erpResult.mock) {
            console.log('[ERP] Cliente atualizado em modo simulado');
          } else {
            console.log('[ERP] Cliente atualizado com sucesso');
          }
        }
      } catch (erpError) {
        console.error('[ERP] Erro na atualização ERP:', erpError);
      }
    },
    onSuccess: () => {
      toast({ title: 'Responsável atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-links'] });
      onEditingChange?.(null);
      context.onSaved();
    },
    onError: (error) => {
      console.error('Erro ao atualizar responsável:', error);
      toast({
        title: 'Erro ao atualizar responsável',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: GuardianFormData) => {
    setIsSubmitting(true);
    try {
      if (editingGuardian) {
        await updateGuardianMutation.mutateAsync(data);
      } else {
        await createGuardianMutation.mutateAsync(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">
          {editingGuardian ? 'Editar Responsável' : 'Novo Responsável'}
        </h3>
        <p className="text-sm text-muted-foreground">
          Cadastre os dados do responsável e vincule aos estudantes.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@exemplo.com" 
                      {...field} 
                    />
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

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF *</FormLabel>
                  <FormControl>
                    <Input placeholder="000.000.000-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relationship"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grau de Parentesco</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o parentesco" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pai">Pai</SelectItem>
                      <SelectItem value="mae">Mãe</SelectItem>
                      <SelectItem value="avo">Avô/Avó</SelectItem>
                      <SelectItem value="tio">Tio/Tia</SelectItem>
                      <SelectItem value="responsavel_legal">Responsável Legal</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vínculos com Estudantes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione os estudantes vinculados a este responsável
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Buscar aluno por nome..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              <FormField
                control={form.control}
                name="linkedStudents"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {filteredStudents
                        .map((student) => (
                        <FormField
                          key={student.id}
                          control={form.control}
                          name="linkedStudents"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={student.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      if (checked) {
                                        field.onChange([...current, student.id]);
                                      } else {
                                        field.onChange(
                                          current.filter((value) => value !== student.id)
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {student.first_name} {student.last_name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    {filteredStudents.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        {studentSearch.trim()
                          ? 'Nenhum aluno encontrado para essa busca'
                          : 'Nenhum estudante encontrado'}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onEditingChange?.(null)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : editingGuardian ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
