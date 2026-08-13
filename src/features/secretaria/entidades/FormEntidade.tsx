import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { erpEmit } from '@/integrations/erp/emit';
import { toLocalISODate } from '@/lib/utils';

const PAPEIS = ['RESPONSAVEL', 'VISITANTE'] as const;
type Papel = (typeof PAPEIS)[number];

const entidadeSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  papeis: z.array(z.enum(PAPEIS)).min(1, 'Selecione ao menos um papel'),
  cpf: z.string().optional(),
  relationship: z.string().optional(),
  linkedStudents: z.array(z.string()).optional(),
  document: z.string().optional(),
  relation: z.string().optional(),
  visitDate: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // CPF é a chave de identidade do responsável no sync com o ERP
  // (upsertClientByCPF) — obrigatório só quando o papel Responsável está
  // marcado, Visitante não precisa de CPF real.
  if (data.papeis.includes('RESPONSAVEL') && data.cpf?.replace(/\D/g, '').length !== 11) {
    ctx.addIssue({ code: 'custom', path: ['cpf'], message: 'Informe um CPF válido (11 dígitos)' });
  }
  if (data.papeis.includes('VISITANTE') && !data.visitDate) {
    ctx.addIssue({ code: 'custom', path: ['visitDate'], message: 'Data da visita é obrigatória' });
  }
});

type EntidadeFormData = z.infer<typeof entidadeSchema>;

interface FormEntidadeProps {
  orgId: string;
  entidadeId?: string | null;
  papelInicial?: Papel;
  onSaved: () => void;
  onCancel: () => void;
}

/**
 * Cadastro Unificado de Entidades (Educacional) — único lugar do app onde se
 * cria/edita um Responsável ou Visitante (PF, papéis não-exclusivos: a mesma
 * pessoa pode ser as duas coisas). Equipe fica de fora (fluxo de convite/auth
 * próprio em `useStaff`, não é um simples insert). `/app/secretaria/responsaveis`
 * e `/app/secretaria/visitantes` são telas satélite: só listam quem já tem
 * aquele papel, "Editar" traz o usuário pra cá.
 */
export function FormEntidade({ orgId, entidadeId, papelInicial, onSaved, onCancel }: FormEntidadeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const form = useForm<EntidadeFormData>({
    resolver: zodResolver(entidadeSchema),
    defaultValues: {
      nome: '', email: '', phone: '', cpf: '',
      papeis: papelInicial ? [papelInicial] : [],
      relationship: '', linkedStudents: [],
      document: '', relation: '', visitDate: toLocalISODate(), purpose: '', notes: '',
    },
  });

  const papeisSelecionados = form.watch('papeis');

  const { data: editingEntidade } = useQuery({
    queryKey: ['entidade-form', entidadeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entidades')
        .select('id, nome, cpf, email, telefone, documento_outro, entidade_papeis(papel, dados_papel)')
        .eq('id', entidadeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!entidadeId,
  });

  const { data: existingLinks = [] } = useQuery({
    queryKey: ['entidade-guardian-links', entidadeId],
    queryFn: async () => {
      if (!entidadeId) return [];
      const { data, error } = await supabase
        .from('student_guardians')
        .select('student_id')
        .eq('guardian_id', entidadeId)
        .eq('organization_id', orgId);
      if (error) throw error;
      return data?.map((l) => l.student_id) || [];
    },
    enabled: !!entidadeId,
  });

  useEffect(() => {
    if (editingEntidade) {
      const papeis = editingEntidade.entidade_papeis.map((p) => p.papel as Papel);
      const responsavel = editingEntidade.entidade_papeis.find((p) => p.papel === 'RESPONSAVEL');
      const visitante = editingEntidade.entidade_papeis.find((p) => p.papel === 'VISITANTE');
      const dadosResponsavel = (responsavel?.dados_papel ?? null) as { relationship?: string } | null;
      const dadosVisitante = (visitante?.dados_papel ?? null) as { relation?: string; visit_date?: string; purpose?: string; notes?: string } | null;
      form.reset({
        nome: editingEntidade.nome,
        email: editingEntidade.email || '',
        phone: editingEntidade.telefone || '',
        cpf: editingEntidade.cpf || '',
        papeis,
        relationship: dadosResponsavel?.relationship || '',
        linkedStudents: existingLinks,
        document: editingEntidade.documento_outro || '',
        relation: dadosVisitante?.relation || '',
        visitDate: dadosVisitante?.visit_date?.split('T')[0] || toLocalISODate(),
        purpose: dadosVisitante?.purpose || '',
        notes: dadosVisitante?.notes || '',
      });
    }
  }, [editingEntidade, existingLinks, form]);

  const { data: students = [] } = useQuery({
    queryKey: ['students', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('organization_id', orgId)
        .eq('status', 'ativo')
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && papeisSelecionados.includes('RESPONSAVEL'),
  });

  const filteredStudents = students.filter((s) =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearch.trim().toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async (data: EntidadeFormData) => {
      const cpf = data.cpf ? data.cpf.replace(/\D/g, '') : null;

      const entidadePayload = {
        organization_id: orgId,
        tipo_pessoa: 'PF' as const,
        nome: data.nome,
        email: data.email || null,
        telefone: data.phone || null,
        cpf,
        documento_outro: data.papeis.includes('VISITANTE') ? (data.document || null) : null,
      };

      let id = entidadeId;
      if (id) {
        const { error } = await supabase.from('entidades').update(entidadePayload).eq('id', id).eq('organization_id', orgId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase.from('entidades').insert(entidadePayload).select().single();
        if (error) throw error;
        id = created.id;
      }

      // Papéis removidos na edição saem de entidade_papeis; os selecionados
      // são upsert com o dados_papel atual.
      const { error: deleteError } = await supabase
        .from('entidade_papeis')
        .delete()
        .eq('entidade_id', id)
        .not('papel', 'in', `(${data.papeis.join(',')})`);
      if (deleteError) throw deleteError;

      const papeisRows = data.papeis.map((papel) => ({
        entidade_id: id,
        organization_id: orgId,
        papel,
        dados_papel: papel === 'RESPONSAVEL'
          ? (data.relationship ? { relationship: data.relationship } : null)
          : {
              relation: data.relation || null,
              visit_date: data.visitDate ? new Date(data.visitDate + 'T00:00:00').toISOString() : null,
              purpose: data.purpose || null,
              notes: data.notes || null,
            },
      }));
      const { error: papelError } = await supabase
        .from('entidade_papeis')
        .upsert(papeisRows, { onConflict: 'entidade_id,papel' });
      if (papelError) throw papelError;

      // Vínculo com alunos só se o papel Responsável estiver marcado.
      if (data.papeis.includes('RESPONSAVEL')) {
        const { data: currentLinks } = await supabase
          .from('student_guardians')
          .select('student_id, is_primary')
          .eq('guardian_id', id)
          .eq('organization_id', orgId);
        const primaryStudentIds = new Set((currentLinks || []).filter((l) => l.is_primary).map((l) => l.student_id));

        await supabase.from('student_guardians').delete().eq('guardian_id', id).eq('organization_id', orgId);

        if (data.linkedStudents && data.linkedStudents.length > 0) {
          const links = data.linkedStudents.map((studentId) => ({
            guardian_id: id,
            student_id: studentId,
            organization_id: orgId,
            is_primary: primaryStudentIds.has(studentId),
            legal_consent: false,
          }));
          const { error: linkError } = await supabase.from('student_guardians').insert(links);
          if (linkError) throw linkError;
        }

        // Responsável sincroniza sempre como Cliente no ERP — regra de negócio
        // já travada (menor não é parte de contrato financeiro).
        if (cpf) {
          try {
            const erpResult = await erpEmit.upsertClient(orgId, {
              cpf, name: data.nome, email: data.email || undefined, phone: data.phone || undefined,
            });
            if (erpResult.error) console.warn('[ERP] Falha na sincronização do responsável:', erpResult.error);
          } catch (erpError) {
            console.error('[ERP] Erro na integração ao salvar responsável:', erpError);
          }
        } else {
          console.warn('[ERP] Responsável sem CPF — sincronização com o ERP pulada.');
        }
      }

      return id;
    },
    onSuccess: () => {
      toast({ title: entidadeId ? 'Cadastro atualizado com sucesso!' : 'Cadastro criado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['guardians'] });
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['crm.leads'] });
      onSaved();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar cadastro', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = async (data: EntidadeFormData) => {
    setIsSubmitting(true);
    try {
      await saveMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePapel = (papel: Papel, checked: boolean) => {
    const current = form.getValues('papeis');
    form.setValue('papeis', checked ? [...current, papel] : current.filter((p) => p !== papel));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{entidadeId ? 'Editar Cadastro' : 'Novo Cadastro'}</h3>
        <p className="text-sm text-muted-foreground">Marque os papéis que essa pessoa exerce — a mesma pessoa pode ser Responsável e Visitante ao mesmo tempo.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex gap-6">
            {PAPEIS.map((papel) => (
              <div key={papel} className="flex items-center space-x-2">
                <Checkbox
                  id={`papel-${papel}`}
                  checked={papeisSelecionados.includes(papel)}
                  onCheckedChange={(checked) => togglePapel(papel, checked === true)}
                />
                <Label htmlFor={`papel-${papel}`}>{papel === 'RESPONSAVEL' ? 'Responsável' : 'Visitante'}</Label>
              </div>
            ))}
          </div>
          <FormMessage>{form.formState.errors.papeis?.message}</FormMessage>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="nome" render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl><Input placeholder="Digite o nome completo" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cpf" render={({ field }) => (
              <FormItem>
                <FormLabel>CPF{papeisSelecionados.includes('RESPONSAVEL') ? ' *' : ''}</FormLabel>
                <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {papeisSelecionados.includes('RESPONSAVEL') && (
            <>
              <Separator />
              <Card>
                <CardHeader><CardTitle className="text-base">Dados de Responsável</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="relationship" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grau de Parentesco</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o parentesco" /></SelectTrigger></FormControl>
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
                  )} />
                  <div className="space-y-2">
                    <Label>Vínculos com Estudantes</Label>
                    <Input placeholder="Buscar aluno por nome..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                    <FormField control={form.control} name="linkedStudents" render={() => (
                      <FormItem>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {filteredStudents.map((student) => (
                            <FormField key={student.id} control={form.control} name="linkedStudents" render={({ field }) => (
                              <FormItem key={student.id} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      field.onChange(checked ? [...current, student.id] : current.filter((v) => v !== student.id));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">{student.first_name} {student.last_name}</FormLabel>
                              </FormItem>
                            )} />
                          ))}
                        </div>
                        {filteredStudents.length === 0 && (
                          <p className="text-sm text-muted-foreground py-4 text-center">
                            {studentSearch.trim() ? 'Nenhum aluno encontrado para essa busca' : 'Nenhum estudante encontrado'}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {papeisSelecionados.includes('VISITANTE') && (
            <>
              <Separator />
              <Card>
                <CardHeader><CardTitle className="text-base">Dados de Visitante</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="document" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documento</FormLabel>
                        <FormControl><Input placeholder="RG, CPF ou Passaporte" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="relation" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relação/Motivo</FormLabel>
                        <FormControl><Input placeholder="Ex: Pai de aluno" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="visitDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Visita *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="purpose" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Finalidade da Visita</FormLabel>
                      <FormControl><Input placeholder="Ex: Reunião pedagógica" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl><Textarea placeholder="Observações adicionais..." className="resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : entidadeId ? 'Atualizar' : 'Criar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
