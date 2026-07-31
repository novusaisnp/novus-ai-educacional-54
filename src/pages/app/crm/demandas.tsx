
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle, 
  Plus, 
  DollarSign, 
  FileX, 
  MessageSquare, 
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  Bot
} from 'lucide-react';
import { useDemandas, usePendenciasDoc, useInadimplencia, useCreateDemanda, useUpdateDemandaStatus } from '@/hooks/useCRM';
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
import EmptyState from '@/components/EmptyState';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import { useIAAccess } from '@/hooks/useIAAccess';

export default function CRMDemandas() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: orgData } = useOrganization();
  const { canAccess } = useIAAccess();
  const [statusFilter, setStatusFilter] = useState('todas');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"todas" | "financeiro" | "financeiro-ia" | "documentos" | "reclamacao" | "outros">("todas");
  const [newDemanda, setNewDemanda] = useState({
    tipo: '',
    assunto: '',
    descricao: '',
    origem: 'escola'
  });

  // Guard para Financeiro IA - verifica se pode acessar e se não está em mock
  const canUseFinanceiroIA = canAccess('financeiro');
  
  // Simula verificação do estado do ERP (você pode ajustar conforme sua lógica)
  const erpDisabledOrMock = true; // Será sempre true quando inadimplencia.is_mock_data === true

  // Guard effect para controlar acesso à aba Financeiro IA
  useEffect(() => {
    if (!canUseFinanceiroIA && activeTab === "financeiro-ia") {
      setActiveTab("todas");
      logger.info("financeiro_ia_access_denied_fallback_to_todas");
    }
  }, [canUseFinanceiroIA, activeTab]);

  const { data: demandas = [], isLoading } = useDemandas({ 
    status: statusFilter,
    tipo: tipoFilter 
  });
  const { data: pendenciasDoc = [] } = usePendenciasDoc();
  const { data: inadimplencia } = useInadimplencia();
  
  const createDemanda = useCreateDemanda();
  const updateStatus = useUpdateDemandaStatus();

  const filteredDemandas = demandas;
  
  // KPIs
  const demandasConcluidas = demandas.filter(d => d.status === 'concluida');
  const taxaConclusao = demandas.length > 0 ? Math.round((demandasConcluidas.length / demandas.length) * 100) : 0;
  const tempoMedioResolucao = 3.2; // Mock - seria calculado baseado em datas

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      aberta: 'destructive',
      em_andamento: 'default',
      concluida: 'secondary',
      cancelada: 'outline'
    } as const;
    
    const icons = {
      aberta: AlertTriangle,
      em_andamento: Clock,
      concluida: CheckCircle,
      cancelada: XCircle
    };
    
    const Icon = icons[status as keyof typeof icons] || AlertTriangle;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getOrigemBadge = (origem: string) => {
    return (
      <Badge variant={origem === 'escola' ? 'default' : 'secondary'}>
        {origem === 'escola' ? 'Escola' : 'Responsável'}
      </Badge>
    );
  };

  const handleCreateDemanda = async () => {
    if (!newDemanda.tipo || !newDemanda.assunto || !newDemanda.descricao) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios'
      });
      return;
    }

    try {
      await createDemanda.mutateAsync({
        request_type: newDemanda.tipo,
        requester_type: newDemanda.origem,
        payload: {
          subject: newDemanda.assunto,
          description: newDemanda.descricao
        }
      });

      toast({
        title: 'Sucesso',
        description: 'Demanda criada com sucesso'
      });

      setIsDialogOpen(false);
      setNewDemanda({ tipo: '', assunto: '', descricao: '', origem: 'escola' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao criar demanda'
      });
    }
  };

  const handleStatusChange = async (demandaId: string, newStatus: string) => {
    try {
      await updateStatus.mutateAsync({
        requestId: demandaId,
        newStatus
      });

      toast({
        title: 'Sucesso',
        description: 'Status alterado com sucesso'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao alterar status'
      });
    }
  };

  const handleOpenChatbot = () => {
    logger.info('open_chatbot_from_demandas');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_chatbot', 
        diff: { from: '/app/crm/demandas' }, 
        organization_id: orgData.organization_id 
      });
    }
    navigate('/app/crm/assistente');
  };

  const handleOpenFinanceiroIA = () => {
    setActiveTab('financeiro-ia');
    logger.info('open_financeiro_ia_tab');
    if (orgData?.organization_id) {
      logAudit({ 
        table_name: 'ai_features', 
        action: 'open_financeiro_ia', 
        diff: { tab: 'financeiro-ia' }, 
        organization_id: orgData.organization_id 
      });
    }
  };

  // Handler para mudança de aba com guards
  const handleTabChange = (value: string) => {
    const validTabs = ["todas", "financeiro", "financeiro-ia", "documentos", "reclamacao", "outros"] as const;
    
    // Verificar se é uma aba válida
    if (!validTabs.includes(value as any)) return;
    
    // Guard: só permite acesso ao Financeiro IA se tiver permissão
    if (value === "financeiro-ia" && !canUseFinanceiroIA) {
      logger.info("financeiro_ia_access_denied");
      return;
    }
    
    // Atualizar aba
    setActiveTab(value as typeof activeTab);
    
    // Log da mudança
    logger.info("crm_demandas_tab_change", { tab: value });
    
    // Auditoria
    if (orgData?.organization_id) {
      logAudit({ 
        organization_id: orgData.organization_id, 
        table_name: "ai_features", 
        action: "open_tab", 
        diff: { tab: value } 
      });
    }
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
                <BreadcrumbPage>Demandas</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold mt-2">Painel de Demandas</h1>
          <p className="text-muted-foreground">
            Gestão de pós-vendas e acompanhamento bilateral
          </p>
        </div>
        
        <div className="flex gap-2">
          {canAccess('chatbot') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleOpenChatbot}>
                    <Bot className="mr-2 h-4 w-4" />
                    Assistente IA
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir Assistente IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canAccess('financeiro') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={handleOpenFinanceiroIA}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Financeiro (IA)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir Financeiro (IA)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Demanda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Demanda</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Select value={newDemanda.tipo} onValueChange={(value) => setNewDemanda(prev => ({ ...prev, tipo: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="documentos">Documentos</SelectItem>
                    <SelectItem value="reclamacao">Reclamação</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="origem">Origem *</Label>
                <Select value={newDemanda.origem} onValueChange={(value) => setNewDemanda(prev => ({ ...prev, origem: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="escola">Escola</SelectItem>
                    <SelectItem value="guardian">Responsável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="assunto">Assunto *</Label>
                <Input
                  id="assunto"
                  value={newDemanda.assunto}
                  onChange={(e) => setNewDemanda(prev => ({ ...prev, assunto: e.target.value }))}
                  placeholder="Digite o assunto da demanda"
                />
              </div>
              
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Textarea
                  id="descricao"
                  value={newDemanda.descricao}
                  onChange={(e) => setNewDemanda(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva a demanda em detalhes"
                  rows={4}
                />
              </div>
              
              <Button onClick={handleCreateDemanda} className="w-full" disabled={createDemanda.isPending}>
                {createDemanda.isPending ? 'Criando...' : 'Criar Demanda'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taxaConclusao}%</div>
            <p className="text-xs text-muted-foreground">
              {demandasConcluidas.length} de {demandas.length} demandas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tempoMedioResolucao} dias</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio de resolução
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandas Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {demandas.filter(d => d.status === 'aberta').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção imediata
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          {canUseFinanceiroIA && <TabsTrigger value="financeiro-ia">Financeiro (IA)</TabsTrigger>}
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="reclamacao">Reclamações</TabsTrigger>
          <TabsTrigger value="outros">Outros</TabsTrigger>
        </TabsList>

        <TabsContent value="todas">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Todas as Demandas ({filteredDemandas.length})</CardTitle>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todos Status</SelectItem>
                      <SelectItem value="aberta">Aberta</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredDemandas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma demanda encontrada</h3>
                  <p className="text-muted-foreground">
                    Ainda não há demandas registradas.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDemandas.map((demanda) => (
                      <TableRow key={demanda.id}>
                        <TableCell>
                          {formatDate(demanda.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <div className="font-medium truncate" title={demanda.assunto}>
                              {demanda.assunto}
                            </div>
                            {demanda.descricao && (
                              <div className="text-sm text-muted-foreground truncate" title={demanda.descricao}>
                                {demanda.descricao}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {demanda.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getOrigemBadge(demanda.origem)}
                        </TableCell>
                        <TableCell>
                          {demanda.solicitante_nome || 'Sistema'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(demanda.status)}
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={demanda.status} 
                            onValueChange={(value) => handleStatusChange(demanda.id, value)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="aberta">Aberta</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="concluida">Concluída</SelectItem>
                              <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Inadimplência
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inadimplencia ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground">Total Inadimplentes</label>
                        <p className="text-2xl font-bold">{inadimplencia.total_inadimplentes || 0}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">Valor Total</label>
                        <p className="text-2xl font-bold">
                          R$ {inadimplencia.valor_total_devido?.toFixed(2) || '0,00'}
                        </p>
                      </div>
                    </div>
                    
                    {inadimplencia.is_mock_data && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Dados simulados - Integração ERP não configurada
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Carregando dados de inadimplência...</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Demandas Financeiras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {demandas.filter(d => d.tipo === 'financeiro').slice(0, 5).map((demanda) => (
                    <div key={demanda.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{demanda.assunto}</p>
                        <p className="text-xs text-muted-foreground">
                          {demanda.solicitante_nome}
                        </p>
                      </div>
                      {getStatusBadge(demanda.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro-ia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Inadimplência com IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inadimplencia ? (
                inadimplencia.is_mock_data ? (
                  <EmptyState
                    title="Integração desabilitada"
                    description="O módulo financeiro está em modo simulado ou desabilitado. Configure a integração ERP para dados reais."
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{inadimplencia.total_inadimplentes || 0}</div>
                        <div className="text-sm text-muted-foreground">Total de Inadimplentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          R$ {inadimplencia.valor_total_devido?.toFixed(2) || '0,00'}
                        </div>
                        <div className="text-sm text-muted-foreground">Valor em Aberto</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">R$ 0,00</div>
                        <div className="text-sm text-muted-foreground">Score Médio IA</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">0</div>
                        <div className="text-sm text-muted-foreground">Recuperados</div>
                      </div>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Score IA</TableHead>
                          <TableHead>Em Aberto</TableHead>
                          <TableHead>Último Venc.</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Dados de análise de inadimplência por IA em desenvolvimento
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )
              ) : (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileX className="h-5 w-5" />
                Pendências Documentais
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendenciasDoc.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma pendência documental encontrada
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Documentos</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendenciasDoc.map((pendencia) => (
                      <TableRow key={pendencia.id}>
                        <TableCell className="font-medium">
                          {pendencia.entity_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pendencia.entity_type === 'guardian' ? 'Responsável' : 'Aluno'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={pendencia.status === 'OK' ? 'secondary' : 'destructive'}>
                            {pendencia.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {pendencia.documentos_count}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Ver Documentos
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reclamacao">
          <Card>
            <CardHeader>
              <CardTitle>Reclamações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandas.filter(d => d.tipo === 'reclamacao').map((demanda) => (
                    <TableRow key={demanda.id}>
                      <TableCell>{formatDate(demanda.created_at)}</TableCell>
                      <TableCell>{demanda.assunto}</TableCell>
                      <TableCell>{demanda.solicitante_nome || 'Sistema'}</TableCell>
                      <TableCell>{getStatusBadge(demanda.status)}</TableCell>
                      <TableCell>
                        <Select 
                          value={demanda.status} 
                          onValueChange={(value) => handleStatusChange(demanda.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aberta">Aberta</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outros">
          <Card>
            <CardHeader>
              <CardTitle>Outras Demandas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {demandas.filter(d => d.tipo === 'outros').map((demanda) => (
                    <TableRow key={demanda.id}>
                      <TableCell>{formatDate(demanda.created_at)}</TableCell>
                      <TableCell>{demanda.assunto}</TableCell>
                      <TableCell>{demanda.solicitante_nome || 'Sistema'}</TableCell>
                      <TableCell>{getStatusBadge(demanda.status)}</TableCell>
                      <TableCell>
                        <Select 
                          value={demanda.status} 
                          onValueChange={(value) => handleStatusChange(demanda.id, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aberta">Aberta</SelectItem>
                            <SelectItem value="em_andamento">Em Andamento</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
