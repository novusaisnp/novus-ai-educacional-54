import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalData } from '@/hooks/usePortalData';
import { useOrganization } from '@/hooks/useOrganization';
import { logAudit } from '@/lib/audit/logAudit';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalConfig } from '@/hooks/usePortalConfig';
import { 
  HelpCircle, 
  Plus, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  FileText,
  MessageSquare
} from 'lucide-react';

export default function PortalDemandas() {
  const { orgId } = useOrganization();
  const { guardian, requests, loading, createRequestMutation } = usePortalData();
  const { config } = usePortalConfig();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: '',
    subject: '',
    description: ''
  });

  useEffect(() => {
    if (orgId && guardian?.id) {
      logAudit({
        organization_id: orgId,
        action: 'view_requests',
        table_name: 'portal',
      });
    }
  }, [orgId, guardian?.id]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequest.type || !newRequest.subject || !newRequest.description) return;

    await createRequestMutation.mutateAsync({
      request_type: newRequest.type,
      payload: {
        subject: newRequest.subject,
        description: newRequest.description
      }
    });

    setNewRequest({ type: '', subject: '', description: '' });
    setShowNewRequest(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluida':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelada':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'em_andamento':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta';
      case 'em_andamento':
        return 'Em Andamento';
      case 'concluida':
        return 'Concluída';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'concluida':
        return 'default';
      case 'cancelada':
        return 'destructive';
      case 'em_andamento':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financeiro':
        return <CreditCard className="h-4 w-4" />;
      case 'documentos':
        return <FileText className="h-4 w-4" />;
      case 'reclamacao':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Demandas</h1>
          <p className="text-muted-foreground">
            Abra solicitações e acompanhe o andamento
          </p>
        </div>

        {config.allowOpenRequests && (
          <Button onClick={() => setShowNewRequest(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Demanda
          </Button>
        )}
      </div>

      {/* New Request Form */}
      {showNewRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Demanda</CardTitle>
            <CardDescription>
              Descreva sua solicitação detalhadamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select 
                  value={newRequest.type} 
                  onValueChange={(value) => setNewRequest({ ...newRequest, type: value })}
                >
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
              
              <div className="space-y-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  placeholder="Resumo da sua solicitação"
                  value={newRequest.subject}
                  onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva detalhadamente sua solicitação..."
                  value={newRequest.description}
                  onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                  rows={4}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  type="submit"
                  disabled={createRequestMutation.isPending}
                >
                  {createRequestMutation.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    setShowNewRequest(false);
                    setNewRequest({ type: '', subject: '', description: '' });
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Demandas</CardTitle>
          <CardDescription>
            Histórico de solicitações e seu status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="flex items-start justify-between p-4 border rounded-lg">
                  <div className="flex items-start space-x-4 flex-1">
                    {getTypeIcon(request.request_type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">
                          {(request.payload as any)?.subject || 'Sem assunto'}
                        </h3>
                        <Badge variant={getStatusVariant(request.status)}>
                          {getStatusIcon(request.status)}
                          <span className="ml-1">{getStatusLabel(request.status)}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {(request.payload as any)?.description || 'Sem descrição'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>
                          Tipo: {request.request_type}
                        </span>
                        <span>
                          Criada: {new Date(request.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {request.updated_at !== request.created_at && (
                          <span>
                            Atualizada: {new Date(request.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhuma demanda"
              description={
                config.allowOpenRequests 
                  ? "Você ainda não abriu nenhuma demanda."
                  : "Abertura de novas demandas está desabilitada."
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      {config.allowOpenRequests && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <HelpCircle className="mr-2 h-5 w-5" />
              Tipos de Demanda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• <strong>Financeiro:</strong> Questões sobre mensalidades, boletos e pagamentos</p>
              <p>• <strong>Documentos:</strong> Problemas com documentos, certidões e declarações</p>
              <p>• <strong>Reclamação:</strong> Feedback sobre serviços ou problemas</p>
              <p>• <strong>Outros:</strong> Outras solicitações gerais</p>
              <p className="mt-4 text-xs">
                Suas demandas serão analisadas e respondidas em até 3 dias úteis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}