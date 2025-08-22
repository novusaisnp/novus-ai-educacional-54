
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  MessageSquare, 
  AlertTriangle, 
  FileX, 
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Bot
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLeads, useDemandas, usePendenciasDoc, useInadimplencia } from '@/hooks/useCRM';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function CRMHub() {
  const navigate = useNavigate();
  const { data: orgData } = useOrganization();
  const { data: leads = [] } = useLeads();
  const { data: demandas = [] } = useDemandas();
  const { data: pendenciasDoc = [] } = usePendenciasDoc();
  const { data: inadimplencia } = useInadimplencia();

  const leadsAtivos = leads.filter(lead => lead.status === 'ativo');
  const demandasAbertas = demandas.filter(d => d.status === 'aberta');
  const demandasConcluidas = demandas.filter(d => d.status === 'concluida');
  const taxaConclusao = demandas.length > 0 ? Math.round((demandasConcluidas.length / demandas.length) * 100) : 0;

  const handleOpenChatbot = () => {
    logger.info('open_chatbot_from_crm');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_chatbot', 
        diff: { from: '/app/crm' }, 
        organization_id: orgData.organization_id 
      });
    }
    navigate('/app/crm/assistente');
  };

  const handleOpenFinanceiroIA = () => {
    logger.info('open_financeiro_ia_from_crm');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_financeiro_ia', 
        diff: { from: '/app/crm' }, 
        organization_id: orgData.organization_id 
      });
    }
    navigate('/app/crm/demandas');
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
                <BreadcrumbPage>CRM</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold mt-2">CRM Educacional</h1>
          <p className="text-muted-foreground">
            Gestão de relacionamento e pós-vendas
          </p>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsAtivos.length}</div>
            <p className="text-xs text-muted-foreground">
              {leads.length} leads totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandas Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demandasAbertas.length}</div>
            <p className="text-xs text-muted-foreground">
              {demandas.length} demandas totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaConclusao}%</div>
            <p className="text-xs text-muted-foreground">
              {demandasConcluidas.length} concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendências Doc.</CardTitle>
            <FileX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendenciasDoc.length}</div>
            <p className="text-xs text-muted-foreground">
              Documentos em falta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Acesso Rápido */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestão de Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Leads por Status:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Ativos:</span>
                <Badge variant="default">{leads.filter(l => l.status === 'ativo').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Convertidos:</span>
                <Badge variant="secondary">{leads.filter(l => l.status === 'convertido').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Mornos:</span>
                <Badge variant="outline">{leads.filter(l => l.status === 'morno').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Frios:</span>
                <Badge variant="destructive">{leads.filter(l => l.status === 'frio').length}</Badge>
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={() => navigate('/app/crm/leads')}
            >
              Ver Todos os Leads
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Pós-Vendas & Demandas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Abertas:</span>
                <Badge variant="destructive">{demandas.filter(d => d.status === 'aberta').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Em Andamento:</span>
                <Badge variant="default">{demandas.filter(d => d.status === 'em_andamento').length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Concluídas:</span>
                <Badge variant="secondary">{demandas.filter(d => d.status === 'concluida').length}</Badge>
              </div>
            </div>
            {inadimplencia && inadimplencia.total_inadimplentes > 0 && (
              <div className="border-t pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Inadimplentes:</span>
                  <Badge variant="destructive">{inadimplencia.total_inadimplentes}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  R$ {inadimplencia.valor_total_devido?.toFixed(2) || '0,00'} em atraso
                </p>
              </div>
            )}
            <Button 
              className="w-full" 
              onClick={() => navigate('/app/crm/demandas')}
            >
              Painel de Demandas
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acesso Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-6">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => navigate('/app/crm/leads')}
            >
              <Users className="h-4 w-4" />
              Leads
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => navigate('/app/crm/interacoes')}
            >
              <MessageSquare className="h-4 w-4" />
              Interações
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => navigate('/app/crm/demandas')}
            >
              <AlertTriangle className="h-4 w-4" />
              Demandas
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => navigate('/app/crm/campanhas')}
            >
              <TrendingUp className="h-4 w-4" />
              Campanhas
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleOpenChatbot}
                  >
                    <Bot className="h-4 w-4" />
                    Assistente IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir Assistente IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={handleOpenFinanceiroIA}
                  >
                    <DollarSign className="h-4 w-4" />
                    Financeiro (IA)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir Financeiro (IA)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
