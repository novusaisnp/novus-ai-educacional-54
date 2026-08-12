
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Plus } from 'lucide-react';
import { useInteractions, useCreateInteraction, useLeads } from '@/hooks/useCRM';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const CHANNELS = [
  { value: 'phone', label: 'Telefone' },
  { value: 'email', label: 'E-mail' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'sistema', label: 'Sistema' },
];

export default function CRMInteracoes() {
  const { toast } = useToast();
  const [entityTypeFilter, setEntityTypeFilter] = useState('todas');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [channel, setChannel] = useState('');
  const [direction, setDirection] = useState<'inbound' | 'outbound'>('outbound');
  const [summary, setSummary] = useState('');

  const { data: interactions = [], isLoading } = useInteractions();
  const { data: leads = [] } = useLeads();
  const createInteraction = useCreateInteraction();

  const filteredInteractions = interactions.filter(interaction =>
    entityTypeFilter === 'todas' || interaction.entity_type === entityTypeFilter
  );

  const resetForm = () => {
    setLeadId('');
    setChannel('');
    setDirection('outbound');
    setSummary('');
  };

  const handleCreate = async () => {
    if (!leadId || !channel || !summary.trim()) {
      toast({ variant: 'destructive', title: 'Preencha lead, canal e resumo' });
      return;
    }
    try {
      await createInteraction.mutateAsync({
        entity_type: 'visitor',
        entity_id: leadId,
        direction,
        channel,
        summary: summary.trim(),
      });
      toast({ title: 'Interação registrada' });
      resetForm();
      setIsDialogOpen(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao registrar interação' });
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getChannelBadge = (channel: string) => {
    const variants = {
      phone: 'default',
      email: 'secondary',
      whatsapp: 'outline',
      presencial: 'destructive',
      sistema: 'outline'
    } as const;
    
    return <Badge variant={variants[channel as keyof typeof variants] || 'outline'}>{channel}</Badge>;
  };

  const getDirectionBadge = (direction: string) => {
    return (
      <Badge variant={direction === 'inbound' ? 'default' : 'secondary'}>
        {direction === 'inbound' ? 'Entrada' : 'Saída'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/app">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/app/crm">CRM</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Interações</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold mt-2">Interações</h1>
          <p className="text-muted-foreground">
            Histórico de todas as interações registradas
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Interação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Interação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Lead *</Label>
                <Select value={leadId} onValueChange={setLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>{lead.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Canal *</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANNELS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direção</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as typeof direction)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Saída (nós contatamos)</SelectItem>
                    <SelectItem value="inbound">Entrada (lead contatou)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resumo *</Label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="O que foi conversado..." rows={3} />
              </div>
              <Button onClick={handleCreate} disabled={createInteraction.isPending} className="w-full">
                {createInteraction.isPending ? 'Salvando...' : 'Registrar Interação'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="visitor">Visitantes</SelectItem>
                <SelectItem value="guardian">Responsáveis</SelectItem>
                <SelectItem value="student">Alunos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Interações */}
      <Card>
        <CardHeader>
          <CardTitle>Interações ({filteredInteractions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredInteractions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma interação encontrada</h3>
              <p className="text-muted-foreground">
                Ainda não há interações registradas.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Direção</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead>Executado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInteractions.map((interaction) => (
                  <TableRow key={interaction.id}>
                    <TableCell>
                      {formatDate(interaction.created_at)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {interaction.entity_type === 'visitor'
                            ? leads.find((l) => l.id === interaction.entity_id)?.full_name ?? '—'
                            : interaction.entity_name || '—'}
                        </div>
                        <div className="text-sm text-muted-foreground capitalize">
                          {interaction.entity_type === 'visitor' ? 'Visitante' :
                           interaction.entity_type === 'guardian' ? 'Responsável' :
                           interaction.entity_type === 'student' ? 'Aluno' : interaction.entity_type}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getChannelBadge(interaction.channel)}
                    </TableCell>
                    <TableCell>
                      {getDirectionBadge(interaction.direction)}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate" title={interaction.summary}>
                        {interaction.summary}
                      </div>
                    </TableCell>
                    <TableCell>
                      {interaction.performed_by_name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
