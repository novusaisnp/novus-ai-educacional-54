import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChatbotInterface from '@/components/ai/ChatbotInterface';
import { Bot } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/logAudit';
import { useEffect } from 'react';
import { useIAAccess } from '@/hooks/useIAAccess';

export default function AssistenteIA() {
  const { data: orgData } = useOrganization();
  const { canAccess } = useIAAccess();

  // ponytail: KPIs de conversas/tempo médio/usuários removidos — chatbot não grava histórico
  // em nenhuma tabela hoje, então os números eram fixos, não calculados. Reintroduzir quando
  // existir log de conversa persistido (ver ai-chatbot function).

  useEffect(() => {
    if (!canAccess('chatbot')) {
      return;
    }
    
    logger.info('open_chatbot_page');
    if (orgData?.organization_id) {
      logAudit({ 
        organization_id: orgData.organization_id,
        table_name: 'ai_features', 
        action: 'open_chatbot', 
        diff: { path: '/app/crm/assistente' }
      });
    }
  }, [orgData?.organization_id, canAccess]);

  if (!canAccess('chatbot')) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar o Assistente IA ou este recurso está desabilitado para sua organização.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Assistente IA Educacional
          </h1>
          <p className="text-muted-foreground mt-2">
            Chatbot inteligente para suporte pedagógico e administrativo
          </p>
        </div>
        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
          <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
          Sistema Online
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interface do Chatbot */}
        <div className="lg:col-span-2">
          <ChatbotInterface className="h-[600px]" />
        </div>

        {/* Painel de informações */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como usar o Assistente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm space-y-2">
                <p><strong>📚 Consultas Acadêmicas:</strong></p>
                <p className="text-muted-foreground pl-4">
                  "Como está o desempenho do João?", "Calendário de provas"
                </p>
                
                <p><strong>📋 Informações Administrativas:</strong></p>
                <p className="text-muted-foreground pl-4">
                  "Horário de funcionamento", "Documentos para matrícula"
                </p>
                
                <p><strong>📞 Suporte Geral:</strong></p>
                <p className="text-muted-foreground pl-4">
                  "Como entrar em contato", "Localização da escola"
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recursos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Consulta de notas e frequência</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Calendário escolar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Informações administrativas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span>Suporte pedagógico básico</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-sky-500 rounded-full" />
                  <span>Fallback para atendimento manual</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Privacidade & Segurança</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2 text-muted-foreground">
                <p>✅ Todas as conversas são registradas para auditoria</p>
                <p>✅ Dados protegidos por LGPD</p>
                <p>✅ Acesso controlado por organização</p>
                <p>✅ Fallback seguro em caso de falhas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}