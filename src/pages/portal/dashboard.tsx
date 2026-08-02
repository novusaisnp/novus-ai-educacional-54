import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { usePortalData } from '@/hooks/usePortalData';
import { useOrganization } from '@/hooks/useOrganization';
import { logAudit } from '@/lib/audit/logAudit';
import { getERPConfig } from '@/lib/featureFlags';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CreditCard, 
  FileText, 
  MessageSquare, 
  HelpCircle,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

export default function PortalDashboard() {
  const navigate = useNavigate();
  const { orgId } = useOrganization();
  const { guardian, interactions, requests, documents, loading } = usePortalData();
  const [hasERP, setHasERP] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    getERPConfig(orgId).then((config) => setHasERP(config.enabled && !config.mock));
  }, [orgId]);

  useEffect(() => {
    if (orgId && guardian?.id) {
      logAudit({
        organization_id: orgId,
        action: 'open_dashboard',
        table_name: 'portal',
      });
    }
  }, [orgId, guardian?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Count pending documents
  const pendingDocs = documents?.filter(doc => 
    doc.tags?.includes('pending') || !doc.tags?.includes('approved')
  ).length || 0;

  // Count open requests
  const openRequests = requests?.filter(req => 
    req.status === 'aberta' || req.status === 'em_andamento'
  ).length || 0;

  // Recent interactions
  const recentInteractions = interactions?.slice(0, 3) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo, {guardian?.name}
        </h1>
        <p className="text-muted-foreground">
          Acompanhe as informações dos seus filhos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Financial */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/portal/financeiro')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financeiro</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasERP ? (
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Ver parcelas</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm">Indisponível</span>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasERP ? 'Mensalidades e boletos' : 'Entre em contato'}
            </p>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/portal/documentos')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center space-x-2">
              {pendingDocs > 0 ? (
                <>
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <span>{pendingDocs}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>0</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingDocs > 0 ? 'Pendências' : 'Tudo em ordem'}
            </p>
          </CardContent>
        </Card>

        {/* Requests */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/portal/demandas')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandas</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center space-x-2">
              {openRequests > 0 ? (
                <>
                  <Clock className="h-5 w-5 text-blue-500" />
                  <span>{openRequests}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>0</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {openRequests > 0 ? 'Em aberto' : 'Nenhuma aberta'}
            </p>
          </CardContent>
        </Card>

        {/* Interactions */}
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/portal/interacoes')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interactions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total de interações
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Mensagens Recentes</CardTitle>
            <CardDescription>
              Últimas interações com a escola
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentInteractions.length > 0 ? (
              <div className="space-y-4">
                {recentInteractions.map((interaction) => (
                  <div key={interaction.id} className="flex items-start space-x-3">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium">{interaction.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(interaction.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={() => navigate('/portal/interacoes')}>
                  Ver todas as mensagens
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma mensagem ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse rapidamente as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/portal/financeiro')}
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Ver situação financeira
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/portal/documentos')}
            >
              <FileText className="mr-2 h-4 w-4" />
              Enviar documentos
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/portal/demandas')}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Abrir nova demanda
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}