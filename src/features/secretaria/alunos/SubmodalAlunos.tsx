import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GuardianRow, StudentInsert, StudentRow, StudentUpdate } from '@/integrations/supabase/db-types';
import { StudentAvatar } from '@/components/StudentAvatar';
import { StudentAttachments } from '@/components/StudentAttachments';
import { useDocuments } from '@/hooks/useDocuments';
import { SecretariaModalContext } from '../types';
import { createGuardianForStudent } from '../lib/createGuardianForStudent';

const studentSchema = z.object({
  first_name: z.string().min(1, 'Nome obrigatório'),
  last_name: z.string().min(1, 'Sobrenome obrigatório'),
  birth_date: z.string().optional(),
  gender: z.enum(['masculino', 'feminino', 'outro']).optional(),
  status: z.enum(['ativo', 'inativo', 'transferido']).default('ativo'),
  document_id: z.string().optional(),
  person_id: z.string().optional(),
  // Campo de controle client-side (nunca enviado ao Supabase): em modo edição o
  // responsável é gerenciado pela tela de Responsáveis, não por este form.
  _mode: z.enum(['create', 'edit']).default('create'),
  // Campos do responsável legal (só usados em modo criação)
  responsible_full_name: z.string().optional(),
  responsible_relationship: z.string().optional(),
  responsible_document_id: z.string().optional(),
  responsible_email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  responsible_phone: z.string().optional(),
}).refine((data) => {
  // Em edição, o responsável não é preenchido por este form — não validar aqui.
  if (data._mode === 'edit') return true;
  // Se tem data de nascimento e é menor de 18 anos, responsável é obrigatório
  if (data.birth_date) {
    const birthDate = new Date(data.birth_date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const isMinor = age < 18 || (age === 18 && monthDiff < 0) || 
                   (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate());
    
    if (isMinor) {
      return data.responsible_full_name && 
             data.responsible_relationship && 
             data.responsible_document_id;
    }
  }
  return true;
}, {
  message: "Para alunos menores de 18 anos, os campos Nome, Parentesco e CPF do responsável são obrigatórios",
  path: ["responsible_full_name"],
});

type StudentFormData = z.infer<typeof studentSchema>;

const toDateString = (d?: Date | string | null) => {
  if (!d) return undefined;
  if (typeof d === 'string') return d.slice(0, 10);
  try { return d.toISOString().slice(0, 10); } catch { return undefined; }
};

const calculateAge = (birthDate: string | undefined) => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1;
  }
  return age;
};

const isMinor = (birthDate: string | undefined) => {
  const age = calculateAge(birthDate);
  return age !== null && age < 18;
};

export type LinkedGuardian = Pick<GuardianRow, 'id' | 'name' | 'cpf' | 'relationship' | 'email' | 'phone'> & {
  is_primary: boolean;
};

interface SubmodalAlunosProps {
  context: SecretariaModalContext;
  editingStudent?: StudentRow | null;
  onEditingChange?: (student: StudentRow | null) => void;
  onEditGuardian?: (guardian: LinkedGuardian) => void;
}

export function SubmodalAlunos({ context, editingStudent, onEditingChange, onEditGuardian }: SubmodalAlunosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Documents hook para o aluno sendo editado
  const {
    avatar,
    attachments,
    uploadAvatarMutation,
    uploadDocMutation,
    deleteDocMutation,
    validateDocMutation,
  } = useDocuments(editingStudent?.id);

  // Responsável(is) vinculados ao aluno (só relevante em modo edição — a criação
  // usa o form manual abaixo, que ainda não tem vínculo pra buscar).
  const { data: linkedGuardians = [], isLoading: isLoadingGuardians } = useQuery({
    queryKey: ['student-guardians', editingStudent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_guardians')
        .select('is_primary, entidades!student_guardians_guardian_id_fkey(id, name:nome, cpf, email, phone:telefone, entidade_papeis(papel, dados_papel))')
        .eq('student_id', editingStudent.id)
        .eq('organization_id', context.orgId);
      if (error) throw error;
      return (data || [])
        .map((link): LinkedGuardian | null => {
          if (!link.entidades) return null;
          const papeis = Array.isArray(link.entidades.entidade_papeis) ? link.entidades.entidade_papeis : [];
          const responsavel = papeis.find((p) => p.papel === 'RESPONSAVEL');
          const dadosPapel = (responsavel?.dados_papel ?? null) as { relationship?: string } | null;
          const { entidade_papeis, ...guardian } = link.entidades;
          return { ...guardian, relationship: dadosPapel?.relationship ?? null, is_primary: link.is_primary };
        })
        .filter((g): g is LinkedGuardian => g !== null);
    },
    enabled: !!editingStudent?.id && !!context.orgId,
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      birth_date: '',
      gender: 'masculino',
      document_id: '',
      status: 'ativo',
      person_id: '',
      _mode: 'create',
      responsible_full_name: '',
      responsible_relationship: '',
      responsible_document_id: '',
      responsible_email: '',
      responsible_phone: '',
    },
  });

  // Watch para reagir às mudanças na data de nascimento
  const watchedBirthDate = form.watch('birth_date');
  const watchedFirstName = form.watch('first_name');
  const watchedLastName = form.watch('last_name');
  const watchedDocumentId = form.watch('document_id');

  // Efeito para sincronizar dados do responsável quando aluno for maior de idade
  useEffect(() => {
    if (watchedBirthDate && !isMinor(watchedBirthDate)) {
      // Se é maior de idade, usar dados do próprio aluno como responsável
      form.setValue('responsible_full_name', `${watchedFirstName} ${watchedLastName}`.trim());
      form.setValue('responsible_relationship', 'Próprio aluno');
      form.setValue('responsible_document_id', watchedDocumentId || '');
      form.setValue('responsible_email', '');
      form.setValue('responsible_phone', '');
    } else if (watchedBirthDate && isMinor(watchedBirthDate)) {
      // Se é menor de idade, limpar campos para preenchimento manual
      if (!editingStudent) {
        form.setValue('responsible_full_name', '');
        form.setValue('responsible_relationship', '');
        form.setValue('responsible_document_id', '');
        form.setValue('responsible_email', '');
        form.setValue('responsible_phone', '');
      }
    }
  }, [watchedBirthDate, watchedFirstName, watchedLastName, watchedDocumentId, editingStudent, form]);

  // Mutation para criar/editar aluno
  const studentMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      if (editingStudent) {
        const payload: StudentUpdate = {
          first_name: data.first_name,
          last_name: data.last_name,
          birth_date: toDateString(data.birth_date),
          gender: data.gender,
          status: data.status,
          document_id: data.document_id || undefined,
          person_id: data.person_id || undefined,
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
          birth_date: toDateString(data.birth_date),
          gender: data.gender,
          status: data.status ?? 'ativo',
          document_id: data.document_id || undefined,
          person_id: data.person_id || undefined,
        };

        const { data: created, error } = await supabase
          .from('students')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        if (isMinor(data.birth_date) && data.responsible_full_name) {
          await createGuardianForStudent({
            orgId: context.orgId,
            studentId: created.id,
            name: data.responsible_full_name,
            relationship: data.responsible_relationship,
            documentId: data.responsible_document_id,
            email: data.responsible_email,
            phone: data.responsible_phone,
          });
        }

        return created;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students.list', context.orgId] });
      toast({
        title: editingStudent ? 'Aluno atualizado' : 'Aluno criado',
        description: editingStudent ? 'Aluno atualizado com sucesso.' : 'Novo aluno criado com sucesso.',
      });
      context.onSaved();
      form.reset();
      onEditingChange?.(null);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar aluno',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: StudentFormData) => {
    console.log('Dados do formulário (incluindo responsável):', data);
    studentMutation.mutate(data);
  };

  // Reset form quando editingStudent muda
  React.useEffect(() => {
    if (editingStudent) {
      form.reset({
        first_name: editingStudent.first_name,
        last_name: editingStudent.last_name,
        birth_date: editingStudent.birth_date || '',
        gender: editingStudent.gender as StudentFormData['gender'],
        document_id: editingStudent.document_id || '',
        status: editingStudent.status as StudentFormData['status'],
        _mode: 'edit',
        // Em edição o responsável não é gerenciado por este form — é exibido em
        // modo leitura (ver linkedGuardians) e editado via SubmodalResponsaveis,
        // reaproveitando aquele CRUD (já faz update real + resync com o ERP).
        responsible_full_name: '',
        responsible_relationship: '',
        responsible_document_id: '',
        responsible_email: '',
        responsible_phone: '',
      });
    } else {
      form.reset({
        first_name: '',
        last_name: '',
        birth_date: '',
        gender: 'masculino',
        document_id: '',
        status: 'ativo',
        person_id: '',
        _mode: 'create',
        responsible_full_name: '',
        responsible_relationship: '',
        responsible_document_id: '',
        responsible_email: '',
        responsible_phone: '',
      });
    }
  }, [editingStudent, form]);

  const showResponsibleSection = watchedBirthDate && isMinor(watchedBirthDate);

  return (
    <div className="space-y-6">
      {/* Avatar - mostrar sempre, mas com lógica diferente para novos alunos */}
      <div className="flex justify-center py-4">
        <StudentAvatar
          studentName={editingStudent ? 
            `${editingStudent.first_name} ${editingStudent.last_name}` : 
            `${form.watch('first_name') || 'Novo'} ${form.watch('last_name') || 'Aluno'}`
          }
          avatar={editingStudent ? avatar : undefined}
          onUpload={(file) => {
            if (editingStudent) {
              uploadAvatarMutation.mutate(file);
            } else {
              toast({
                title: 'Salve o aluno primeiro',
                description: 'É necessário salvar o aluno antes de adicionar um avatar.',
              });
            }
          }}
          isUploading={uploadAvatarMutation.isPending}
          size="lg"
        />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Seção: Dados do Aluno */}
          <fieldset className="border border-border rounded-lg p-4 space-y-4">
            <legend className="text-lg font-semibold px-2">Dados do Aluno</legend>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    {watchedBirthDate && (
                      <p className="text-sm text-muted-foreground">
                        Idade: {calculateAge(watchedBirthDate)} anos
                        {isMinor(watchedBirthDate) && ' (menor de idade)'}
                      </p>
                    )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="document_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento (CPF/RG)</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                        <SelectItem value="transferido">Transferido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </fieldset>

          {/* Seção: Responsável Legal */}
          {showResponsibleSection && (
            <fieldset className="border border-border rounded-lg p-4 space-y-4">
              <legend className="text-lg font-semibold px-2">Responsável Legal</legend>

              {editingStudent ? (
                isLoadingGuardians ? (
                  <p className="text-sm text-muted-foreground">Carregando responsável...</p>
                ) : linkedGuardians.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum responsável vinculado a este aluno. Cadastre um na tela de Responsáveis.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {linkedGuardians.map((g: LinkedGuardian) => (
                      <div key={g.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                        <div className="text-sm space-y-0.5">
                          <p className="font-medium">{g.name}{g.is_primary ? ' (principal)' : ''}</p>
                          <p className="text-muted-foreground">{g.relationship || 'Parentesco não informado'}</p>
                          <p className="text-muted-foreground">CPF: {g.cpf || 'não informado'}</p>
                          <p className="text-muted-foreground">{g.email || 'sem e-mail'} · {g.phone || 'sem telefone'}</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => onEditGuardian?.(g)}>
                          Editar responsável
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsible_full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsible_relationship"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Parentesco *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o parentesco" />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="responsible_document_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="000.000.000-00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="responsible_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-mail</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="email@exemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="responsible_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(11) 99999-9999" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </fieldset>
          )}

          {/* Informação para alunos maiores de idade */}
          {watchedBirthDate && !isMinor(watchedBirthDate) && (
            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>Aluno maior de idade:</strong> Os dados do próprio aluno serão utilizados como responsável legal.
              </p>
            </div>
          )}

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

      {/* Anexos - mostrar sempre, mas com lógica diferente para novos alunos */}
      <StudentAttachments
        attachments={editingStudent ? attachments : []}
        onUpload={(file) => {
          if (editingStudent) {
            uploadDocMutation.mutate(file);
          } else {
            toast({
              title: 'Salve o aluno primeiro',
              description: 'É necessário salvar o aluno antes de adicionar documentos.',
            });
          }
        }}
        onDelete={(doc) => {
          if (editingStudent) {
            deleteDocMutation.mutate(doc);
          }
        }}
        onValidate={(documentId) => validateDocMutation.mutate(documentId)}
        validatingDocId={validateDocMutation.isPending ? validateDocMutation.variables ?? null : null}
        isUploading={uploadDocMutation.isPending}
      />
    </div>
  );
}