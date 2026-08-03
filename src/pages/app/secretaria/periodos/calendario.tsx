import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, CalendarRange } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import type { CalendarExceptionRow } from '@/integrations/supabase/db-types';
import { isSchoolDay, type CalendarExceptionDay, type CalendarExceptionType } from '@/lib/schoolCalendar';

const TYPE_LABELS: Record<CalendarExceptionType, string> = {
  feriado: 'Feriado',
  recesso: 'Recesso',
  reposicao: 'Reposição',
};

const TYPE_BADGE_VARIANT: Record<CalendarExceptionType, 'destructive' | 'secondary' | 'default'> = {
  feriado: 'destructive',
  recesso: 'secondary',
  reposicao: 'default',
};

const TYPE_MODIFIER_CLASS: Record<CalendarExceptionType, string> = {
  feriado: 'bg-red-100 text-red-700 hover:bg-red-200',
  recesso: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  reposicao: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
};

export default function PeriodoCalendario() {
  const { periodId } = useParams<{ periodId: string }>();
  const navigate = useNavigate();
  const { data: orgData } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<'letivo' | CalendarExceptionType>('letivo');
  const [description, setDescription] = useState('');

  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeType, setRangeType] = useState<'letivo' | CalendarExceptionType>('recesso');
  const [rangeDescription, setRangeDescription] = useState('');

  const { data: period } = useQuery({
    queryKey: ['period', periodId],
    queryFn: async () => {
      if (!periodId) return null;
      const { data, error } = await supabase
        .from('periods')
        .select('*')
        .eq('id', periodId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!periodId,
  });

  const { data: exceptions = [] } = useQuery({
    queryKey: ['calendar-exceptions', orgData?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_exceptions')
        .select('*')
        .order('date', { ascending: true });
      if (error) throw error;
      return data as CalendarExceptionRow[];
    },
    enabled: !!orgData?.organization_id,
  });

  const saveException = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !orgData?.organization_id) throw new Error('Dados incompletos');
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      if (selectedType === 'letivo') {
        const { error } = await supabase
          .from('calendar_exceptions')
          .delete()
          .eq('organization_id', orgData.organization_id)
          .eq('date', dateStr);
        if (error) throw error;
        return;
      }

      const { error } = await supabase
        .from('calendar_exceptions')
        .upsert(
          {
            organization_id: orgData.organization_id,
            date: dateStr,
            type: selectedType,
            description: description || null,
          },
          { onConflict: 'organization_id,date' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-exceptions'] });
      toast({ title: 'Calendário atualizado com sucesso!' });
      setSelectedDate(null);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar calendário',
        description: error.message,
      });
    },
  });

  const saveRangeException = useMutation({
    mutationFn: async () => {
      if (!rangeStart || !rangeEnd || !orgData?.organization_id) throw new Error('Dados incompletos');
      if (rangeStart > rangeEnd) throw new Error('Data de início deve ser anterior à data de fim');

      if (rangeType === 'letivo') {
        const { error } = await supabase
          .from('calendar_exceptions')
          .delete()
          .eq('organization_id', orgData.organization_id)
          .gte('date', rangeStart)
          .lte('date', rangeEnd);
        if (error) throw error;
        return;
      }

      const rows: { organization_id: string; date: string; type: string; description: string | null }[] = [];
      const cursor = new Date(`${rangeStart}T00:00:00`);
      const end = new Date(`${rangeEnd}T00:00:00`);
      while (cursor <= end) {
        rows.push({
          organization_id: orgData.organization_id,
          date: format(cursor, 'yyyy-MM-dd'),
          type: rangeType,
          description: rangeDescription || null,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      const { error } = await supabase
        .from('calendar_exceptions')
        .upsert(rows, { onConflict: 'organization_id,date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-exceptions'] });
      toast({ title: 'Calendário atualizado com sucesso!' });
      setRangeDialogOpen(false);
      setRangeStart('');
      setRangeEnd('');
      setRangeDescription('');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar calendário',
        description: error.message,
      });
    },
  });

  const deleteExceptionGroup = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('calendar_exceptions').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-exceptions'] });
      toast({ title: 'Exceção removida com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover exceção',
        description: error.message,
      });
    },
  });

  const groupedExceptions = useMemo(() => {
    const groups: {
      ids: string[];
      startDate: string;
      endDate: string;
      type: CalendarExceptionType;
      description: string | null;
    }[] = [];

    exceptions.forEach((exception) => {
      const type = exception.type as CalendarExceptionType;
      const last = groups[groups.length - 1];
      const isContiguous =
        last &&
        last.type === type &&
        last.description === exception.description &&
        differenceInCalendarDays(
          new Date(`${exception.date}T00:00:00`),
          new Date(`${last.endDate}T00:00:00`)
        ) === 1;

      if (isContiguous) {
        last.endDate = exception.date;
        last.ids.push(exception.id);
      } else {
        groups.push({
          ids: [exception.id],
          startDate: exception.date,
          endDate: exception.date,
          type,
          description: exception.description,
        });
      }
    });

    return groups;
  }, [exceptions]);

  const handleDayClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const existing = exceptions.find((e) => e.date === dateStr);
    setSelectedDate(date);
    setSelectedType(existing ? (existing.type as CalendarExceptionType) : 'letivo');
    setDescription(existing?.description || '');
  };

  const modifiers = useMemo(() => {
    const byType: Record<CalendarExceptionType, Date[]> = { feriado: [], recesso: [], reposicao: [] };
    exceptions.forEach((exception) => {
      const type = exception.type as CalendarExceptionType;
      byType[type].push(new Date(`${exception.date}T00:00:00`));
    });
    return byType;
  }, [exceptions]);

  const summary = useMemo(() => {
    if (!period) return null;
    const start = new Date(`${period.date_start}T00:00:00`);
    const end = new Date(`${period.date_end}T00:00:00`);
    const today = new Date();
    const periodRanges = [{ date_start: period.date_start, date_end: period.date_end, active: period.active }];

    let totalSchoolDays = 0;
    let elapsedSchoolDays = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      if (isSchoolDay(cursor, periodRanges, exceptions as CalendarExceptionDay[])) {
        totalSchoolDays += 1;
        if (cursor <= today) elapsedSchoolDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const nextRecess = exceptions
      .filter((e) => (e.type === 'feriado' || e.type === 'recesso') && new Date(`${e.date}T00:00:00`) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    const pendingReposicoes = exceptions.filter(
      (e) => e.type === 'reposicao' && new Date(`${e.date}T00:00:00`) >= today
    ).length;

    return { totalSchoolDays, elapsedSchoolDays, nextRecess, pendingReposicoes };
  }, [period, exceptions]);

  if (!period) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/app/secretaria/periodos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <EmptyState title="Período não encontrado" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/app/secretaria/periodos')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Calendário letivo — {period.name}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(`${period.date_start}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
              {format(new Date(`${period.date_end}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Calendário letivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dias letivos cumpridos</span>
              <span className="font-semibold">
                {summary.elapsedSchoolDays} / {summary.totalSchoolDays}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Próximo feriado/recesso</span>
              <span className="font-semibold">
                {summary.nextRecess
                  ? format(new Date(`${summary.nextRecess.date}T00:00:00`), 'dd/MM', { locale: ptBR })
                  : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reposições pendentes</span>
              <Badge variant={summary.pendingReposicoes > 0 ? 'default' : 'secondary'}>
                {summary.pendingReposicoes}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Marcar exceções</CardTitle>
            <CardDescription>
              Clique em um dia para marcar feriado, recesso ou reposição. Dias úteis dentro do período são
              letivos por padrão.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRangeDialogOpen(true)}>
            <CalendarRange className="mr-2 h-4 w-4" />
            Marcar período
          </Button>
        </CardHeader>
        <CardContent className="flex justify-center">
          <CalendarPicker
            fromDate={new Date(`${period.date_start}T00:00:00`)}
            toDate={new Date(`${period.date_end}T00:00:00`)}
            defaultMonth={new Date(`${period.date_start}T00:00:00`)}
            modifiers={modifiers}
            modifiersClassNames={{
              feriado: TYPE_MODIFIER_CLASS.feriado,
              recesso: TYPE_MODIFIER_CLASS.recesso,
              reposicao: TYPE_MODIFIER_CLASS.reposicao,
            }}
            onDayClick={handleDayClick}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exceções cadastradas ({exceptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {groupedExceptions.length === 0 ? (
            <EmptyState
              title="Nenhuma exceção cadastrada"
              description="Clique em um dia no calendário acima para marcar um feriado, recesso ou reposição."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedExceptions.map((group) => (
                  <TableRow key={group.ids[0]}>
                    <TableCell>
                      {group.startDate === group.endDate
                        ? format(new Date(`${group.startDate}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })
                        : `${format(new Date(`${group.startDate}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(`${group.endDate}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR })}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TYPE_BADGE_VARIANT[group.type]}>{TYPE_LABELS[group.type]}</Badge>
                    </TableCell>
                    <TableCell>{group.description || '-'}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteExceptionGroup.mutate(group.ids)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && setSelectedDate(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>

          <RadioGroup value={selectedType} onValueChange={(value) => setSelectedType(value as typeof selectedType)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="letivo" id="tipo-letivo" />
              <Label htmlFor="tipo-letivo">Letivo normal</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="feriado" id="tipo-feriado" />
              <Label htmlFor="tipo-feriado">Feriado</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recesso" id="tipo-recesso" />
              <Label htmlFor="tipo-recesso">Recesso</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reposicao" id="tipo-reposicao" />
              <Label htmlFor="tipo-reposicao">Reposição</Label>
            </div>
          </RadioGroup>

          {selectedType !== 'letivo' && (
            <Input
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDate(null)}>
              Cancelar
            </Button>
            <Button onClick={() => saveException.mutate()} disabled={saveException.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar período</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Útil para recessos e férias que cobrem várias semanas — marca todos os dias do intervalo de
            uma vez, em vez de um por um.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="range-start">Data de início</Label>
              <Input
                id="range-start"
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                min={period.date_start}
                max={period.date_end}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="range-end">Data de fim</Label>
              <Input
                id="range-end"
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                min={period.date_start}
                max={period.date_end}
              />
            </div>
          </div>

          <RadioGroup value={rangeType} onValueChange={(value) => setRangeType(value as typeof rangeType)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="feriado" id="range-tipo-feriado" />
              <Label htmlFor="range-tipo-feriado">Feriado</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="recesso" id="range-tipo-recesso" />
              <Label htmlFor="range-tipo-recesso">Recesso</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reposicao" id="range-tipo-reposicao" />
              <Label htmlFor="range-tipo-reposicao">Reposição</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="letivo" id="range-tipo-letivo" />
              <Label htmlFor="range-tipo-letivo">Letivo normal (limpar exceções do período)</Label>
            </div>
          </RadioGroup>

          {rangeType !== 'letivo' && (
            <Input
              placeholder="Descrição (opcional)"
              value={rangeDescription}
              onChange={(e) => setRangeDescription(e.target.value)}
            />
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRangeDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveRangeException.mutate()}
              disabled={saveRangeException.isPending || !rangeStart || !rangeEnd}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
