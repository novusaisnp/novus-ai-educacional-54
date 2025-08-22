import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalData } from '@/hooks/usePortalData';
import { useOrganization } from '@/hooks/useOrganization';
import { logAudit } from '@/lib/audit/logAudit';
import EmptyState from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '@/components/portal/PortalPageHeader';
import { 
  MessageSquare, 
  Send, 
  AlertCircle, 
  Info,
  DollarSign,
  FileText,
  Phone
} from 'lucide-react';

export default function PortalInteracoes() {
  const { orgId } = useOrganization();
  const { guardian, interactions, loading, createInteractionMutation } = usePortalData();
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState('mensagem');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (orgId && guardian?.id) {
      logAudit({
        organization_id: orgId,
        action: 'view_interactions',
        table_name: 'portal',
      });
    }
  }, [orgId, guardian?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await createInteractionMutation.mutateAsync({
      channel: messageType,
      summary: newMessage,
      payload: {
        message: newMessage,
        type: messageType
      }
    });

    setNewMessage('');
  };

  const getTypeIcon = (channel: string) => {
    switch (channel) {
      case 'alert':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'financeiro':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'documentos':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'telefone':
        return <Phone className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (channel: string) => {
    switch (channel) {
      case 'alert':
        return 'Alerta';
      case 'financeiro':
        return 'Financeiro';
      case 'documentos':
        return 'Documentos';
      case 'telefone':
        return 'Telefone';
      case 'mensagem':
        return 'Mensagem';
      default:
        return channel;
    }
  };

  const filteredInteractions = interactions?.filter(interaction => {
    if (filter === 'all') return true;
    return interaction.channel === filter;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title="Interações"
        description="Converse com a escola e veja o histórico"
        icon={<MessageSquare className="h-5 w-5 text-primary" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Message */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Mensagem</CardTitle>
            <CardDescription>
              Envie uma mensagem para a escola
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensagem">Mensagem Geral</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="documentos">Documentos</SelectItem>
                    <SelectItem value="telefone">Solicitar Ligação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem</Label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={createInteractionMutation.isPending || !newMessage.trim()}
              >
                <Send className="mr-2 h-4 w-4" />
                {createInteractionMutation.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Interaction History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Histórico</CardTitle>
                <CardDescription>
                  Suas conversas com a escola
                </CardDescription>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="mensagem">Mensagens</SelectItem>
                  <SelectItem value="alert">Alertas</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="documentos">Documentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredInteractions.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredInteractions.map((interaction) => (
                  <div key={interaction.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    {getTypeIcon(interaction.channel)}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {getTypeLabel(interaction.channel)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(interaction.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {interaction.summary}
                      </p>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          interaction.direction === 'inbound' 
                            ? 'bg-blue-500' 
                            : 'bg-green-500'
                        }`}></div>
                        <span className="text-xs text-muted-foreground">
                          {interaction.direction === 'inbound' ? 'Recebida' : 'Enviada'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhuma interação"
                description={
                  filter === 'all' 
                    ? "Você ainda não tem interações com a escola."
                    : `Nenhuma interação do tipo "${getTypeLabel(filter)}" encontrada.`
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="mr-2 h-5 w-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>• <strong>Mensagem Geral:</strong> Para comunicação geral com a escola</p>
            <p>• <strong>Financeiro:</strong> Dúvidas sobre mensalidades e pagamentos</p>
            <p>• <strong>Documentos:</strong> Sobre documentos solicitados ou pendentes</p>
            <p>• <strong>Solicitar Ligação:</strong> Quando precisar falar por telefone</p>
            <p className="mt-4 text-xs">
              A escola responderá suas mensagens em até 24 horas úteis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}