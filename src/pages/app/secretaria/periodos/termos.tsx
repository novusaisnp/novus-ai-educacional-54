import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAcademicTerms } from '@/hooks/useAppQueries';
import { useAcademicTermMutations } from '@/hooks/useAcademicTermMutations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Plus, Pencil, Trash2, CalendarClock } from 'lucide-react';
import { IconBadge } from '@/components/IconBadge';
import EmptyState from '@/components/EmptyState';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const termSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  term_number: z.number().min(1, 'Número mínimo é 1'),
  date_start: z.string().min(1, 'Data de início é obrigatória'),
  date_end: z.string().min(1, 'Data de fim é obrigatória'),
}).refine((data) => data.date_end >= data.date_start, {
  message: 'Data de fim deve ser igual ou posterior à data de início',
  path: ['date_end'],
});

type TermFormData = z.infer<typeof termSchema>;

export default function PeriodoTermos() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: period } = useQuery({
    queryKey: ['period', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      const { data, error } = await supabase.from('periods').select('*').eq('id', periodId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const { data: terms = [], isLoading } = useAcademicTerms(periodId);
  const mutations = useAcademicTermMutations();

  const form = useForm<TermFormData>({
    resolver: zodResolver(termSchema),
    defaultValues: { name: '', term_number: (terms?.length || 0) + 1, date_start: '', date_end: '' },
  });

  useEffect(() => {
    if (!editingId) {
      form.reset({ name: '', term_number: (terms?.length || 0) + 1, date_start: '', date_end: '' });
    }
  }, [terms?.length, editingId, form]);

  const handleOpenCreate = () => {
    setEditingId(null);
    form.reset({ name: '', term_number: (terms?.length || 0) + 1, date_start: '', date_end: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (term: typeof terms[number]) => {
    setEditingId(term.id);
    form.reset({
      name: term.name,
      term_number: term.term_number,
      date_start: term.date_start,
      date_end: term.date_end,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (data: TermFormData) => {
    if (!periodId) return;

    if (editingId) {
      mutations.update.mutate(
        { id: editingId, data },
        { onSuccess: () => { setIsModalOpen(false); setEditingId(null); } }
      );
    } else {
      mutations.create.mutate(
        {
          period_id: periodId,
          name: data.name,
          term_number: data.term_number,
          date_start: data.date_start,
          date_end: data.date_end,
        },
        { onSuccess: () => setIsModalOpen(false) }
      );
    }
  };

  const formatDate = (date: string) => format(new Date(`${date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/app/secretaria/periodos')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconBadge icon={CalendarClock} tone="info" />
          <div>
            <h1 className="text-2xl font-bold">Bimestres/Trimestres</h1>
            <p className="text-muted-foreground">{period?.name ?? 'Período letivo'}</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Período de Avaliação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Períodos de Avaliação ({terms.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : terms.length === 0 ? (
            <EmptyState
              title="Nenhum período de avaliação cadastrado"
              description="Cadastre bimestres ou trimestres para poder vincular avaliações e calcular resultados."
              action={
                <Button onClick={handleOpenCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Período de Avaliação
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead className="w-[110px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {terms.map((term) => (
                  <TableRow key={term.id}>
                    <TableCell>{term.term_number}</TableCell>
                    <TableCell className="font-medium">{term.name}</TableCell>
                    <TableCell>{formatDate(term.date_start)}</TableCell>
                    <TableCell>{formatDate(term.date_end)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(term)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Excluir "{term.name}"? Avaliações vinculadas a este período perdem a referência.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => mutations.remove.mutate(term.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Período de Avaliação' : 'Novo Período de Avaliação'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 1º Bimestre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="term_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número (ordem no ano) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date_start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Início *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date_end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Fim *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={mutations.create.isPending || mutations.update.isPending}>
                  {editingId ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
