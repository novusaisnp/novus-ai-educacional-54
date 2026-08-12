
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Phone, Mail, MessageCircle, Calendar, FileText, User } from 'lucide-react';
import { useLead, useInteractions } from '@/hooks/useCRM';
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

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: 'default',
      convertido: 'secondary',
      morno: 'outline',
      frio: 'destructive'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

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
                <BreadcrumbLink href="/app/crm/leads">Leads</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{lead.full_name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold mt-2">{lead.full_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(lead.status)}
            {lead.convertido && (
              <Badge variant="secondary">Convertido</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações do Lead */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Lead
            </CardTitle>
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
                  <div className="flex items-center gap-2">
                    <p>{lead.phone}</p>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`tel:${lead.phone}`}>
                        <Phone className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                        <MessageCircle className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              
              {lead.email && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <div className="flex items-center gap-2">
                    <p>{lead.email}</p>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="h-3 w-3" />
                      </a>
                    </Button>
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informações da Visita
            </CardTitle>
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
                <div className="bg-muted p-3 rounded-md">
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Timeline de Interações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma interação registrada para este lead
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="border-l-2 border-muted pl-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={interaction.direction === 'inbound' ? 'default' : 'secondary'}>
                          {interaction.channel}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {interaction.direction === 'inbound' ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <p className="font-medium">{interaction.summary}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Por: {interaction.performed_by_name}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDateTime(interaction.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
