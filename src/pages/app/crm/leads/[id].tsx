
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { IconBadge } from '@/components/IconBadge';
import EmptyState from '@/components/EmptyState';
import { ArrowLeft, Phone, Mail, MessageCircle, Calendar, User } from 'lucide-react';
import { useLead, useInteractions, type Lead } from '@/hooks/useCRM';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const STATUS_META: Record<Lead['status'], { label: string; totem: string }> = {
  ativo: { label: 'Novo / Ativo', totem: 'totem-teal' },
  morno: { label: 'Morno', totem: 'totem-gold' },
  frio: { label: 'Frio', totem: 'totem-info' },
  convertido: { label: 'Convertido', totem: 'totem-success' },
};

const CHANNEL_META: Record<string, { label: string; totem: string }> = {
  phone: { label: 'Telefone', totem: 'totem-teal' },
  email: { label: 'E-mail', totem: 'totem-info' },
  whatsapp: { label: 'WhatsApp', totem: 'totem-success' },
  presencial: { label: 'Presencial', totem: 'totem-coral' },
  sistema: { label: 'Sistema', totem: 'totem-ink' },
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export default function CRMLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: lead, isLoading } = useLead(id!);
  const { data: interactions = [] } = useInteractions({
    entity_id: id,
    entity_type: 'visitor'
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-8">
        <p>Lead não encontrado</p>
        <Button onClick={() => navigate('/app/crm/leads')} className="mt-4">
          Voltar para Leads
        </Button>
      </div>
    );
  }

  const statusMeta = STATUS_META[lead.status];

  // visit_date é DATE puro (sem hora) — precisa do T00:00:00 pra não sofrer o
  // shift de fuso (parse como UTC meia-noite, exibe um dia pra trás em UTC-3).
  // created_at/updated_at/interaction.created_at já são timestamptz completo.
  const formatDate = (date: string) => {
    return format(new Date(`${date}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app/crm/leads')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="totem-teal h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-sm font-bold text-white">
            {initials(lead.full_name)}
          </div>
          <div className="min-w-0">
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
                  <BreadcrumbLink href="/app/crm/leads">Leads</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{lead.full_name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-2xl font-bold mt-1 truncate">{lead.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn('px-3 py-1 rounded-full text-xs font-semibold text-white', statusMeta.totem)}>
                {statusMeta.label}
              </span>
              {lead.convertido && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white totem-success">
                  Convertido
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Lead */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <IconBadge icon={User} tone="primary" variant="totem" size="sm" />
            <CardTitle className="text-lg">Informações do Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                <p className="font-medium">{lead.full_name}</p>
              </div>

              {lead.document && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Documento</label>
                  <p>{lead.document}</p>
                </div>
              )}

              {lead.phone && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p>{lead.phone}</p>
                    <a href={`tel:${lead.phone}`} title={lead.phone} className="p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground">
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                    <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" title="WhatsApp" className="p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground">
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {lead.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2 mt-1">
                    <p>{lead.email}</p>
                    <a href={`mailto:${lead.email}`} title={lead.email} className="p-1.5 rounded-full bg-secondary hover:bg-secondary/70 text-secondary-foreground">
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {lead.relation && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Relação</label>
                  <p>{lead.relation}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações da Visita */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3 space-y-0">
            <IconBadge icon={Calendar} tone="info" variant="totem" size="sm" />
            <CardTitle className="text-lg">Informações da Visita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Data da Visita</label>
              <p className="font-medium">{formatDate(lead.visit_date)}</p>
            </div>

            {lead.purpose && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Motivo da Visita</label>
                <p>{lead.purpose}</p>
              </div>
            )}

            {lead.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações</label>
                <div className="bg-muted/60 p-3 rounded-xl">
                  <p className="text-sm">{lead.notes}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>Cadastrado em: {formatDateTime(lead.created_at)}</p>
              <p>Última atualização: {formatDateTime(lead.updated_at)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Interações */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <IconBadge icon={MessageCircle} tone="warm" variant="totem" size="sm" />
          <CardTitle className="text-lg">Timeline de Interações ({interactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <EmptyState
              title="Nenhuma interação registrada"
              description="Ainda não há contatos registrados para este lead."
            />
          ) : (
            <div className="space-y-3">
              {interactions.map((interaction) => {
                const channelMeta = CHANNEL_META[interaction.channel] ?? { label: interaction.channel, totem: 'totem-ink' };
                return (
                  <div key={interaction.id} className="flex gap-3 bg-muted/40 rounded-xl p-3">
                    <span className={cn('mt-1 h-2.5 w-2.5 rounded-full shrink-0', channelMeta.totem)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{channelMeta.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {interaction.direction === 'inbound' ? 'Entrada' : 'Saída'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(interaction.created_at)}
                        </span>
                      </div>
                      <p className="font-medium text-sm mt-1">{interaction.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por: {interaction.performed_by_name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
