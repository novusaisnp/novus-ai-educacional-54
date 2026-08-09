
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';
import { usePortalConfig } from '@/hooks/usePortalConfig';
import { PortalSection } from '@/components/portal/PortalSection';
import { getERPConfig, setERPConfig, maskSecret, type ERPConfig, getIAConfig, setIAConfig, type IAConfig } from '@/lib/featureFlags';
import { erpEmit } from '@/integrations/erp/emit';
import { useNotificationsConfig } from '@/hooks/useNotificationsConfig';
import { Settings, Zap, Shield, Webhook, Bot, Bell } from 'lucide-react';

const configSchema = z.object({
  enabled: z.boolean(),
  mock: z.boolean(),
  baseUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  signingSecret: z.string().optional(),
  empresaRepresentadaId: z.string().optional(),
  events: z.object({
    clientUpsert: z.boolean().optional(),
    receivableCreated: z.boolean().optional(),
    paymentWebhook: z.boolean().optional(),
  }),
});

const iaConfigSchema = z.object({
  enabled: z.boolean(),
  chatbot: z.boolean(),
  risco: z.boolean(),
  feedback: z.boolean(),
  financeiro: z.boolean(),
});

type ConfigFormData = z.infer<typeof configSchema>;
type IAConfigFormData = z.infer<typeof iaConfigSchema>;

export default function ConfigIntegracoes() {
  const { toast } = useToast();
  const { data: orgData } = useOrganization();
  const { isEmailEnabled, setConfig: setNotificationsConfig } = useNotificationsConfig();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      enabled: false,
      mock: true,
      baseUrl: '',
      signingSecret: '',
      empresaRepresentadaId: '',
      events: {
        clientUpsert: true,
        receivableCreated: true,
        paymentWebhook: true,
      },
    },
  });

  const iaForm = useForm<IAConfigFormData>({
    resolver: zodResolver(iaConfigSchema),
    defaultValues: {
      enabled: false,
      chatbot: false,
      risco: false,
      feedback: false,
      financeiro: false,
    },
  });

  // Carregar configuração existente
  useEffect(() => {
    if (orgData?.organization_id) {
      const iaConfig = getIAConfig(orgData.organization_id);
      iaForm.reset(iaConfig);

      getERPConfig(orgData.organization_id).then((config) => {
        form.reset(config);
      });
    }
  }, [orgData?.organization_id, form, iaForm]);

  const onSubmit = async (data: ConfigFormData) => {
    if (!orgData?.organization_id) {
      toast({
        title: 'Erro',
        description: 'Organização não identificada',
        variant: 'destructive',
      });
      return;
    }

    try {
      await setERPConfig(orgData.organization_id, data);
      toast({
        title: 'Configuração salva',
        description: 'As configurações de integração ERP foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const onSubmitIA = async (data: IAConfigFormData) => {
    if (!orgData?.organization_id) {
      toast({
        title: 'Erro',
        description: 'Organização não identificada',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIAConfig(orgData.organization_id, data);
      toast({
        title: 'Configuração salva',
        description: 'As configurações de IA foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações de IA. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const testConnection = async () => {
    if (!orgData?.organization_id) {
      toast({
        title: 'Erro',
        description: 'Organização não identificada',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    try {
      // Salvar configuração atual primeiro
      const formData = form.getValues();
      await setERPConfig(orgData.organization_id, formData);

      const result = await erpEmit.testConnection(orgData.organization_id);

      if (result.ok) {
        toast({
          title: result.mock ? 'Teste em modo simulado' : 'Endpoint alcançável',
          description: result.mock
            ? 'Integração configurada em modo de teste.'
            : 'O endpoint do ERP respondeu. Isso confirma só que ele está no ar — não valida a assinatura/credenciais.',
        });
      } else {
        toast({
          title: 'Falha na conexão',
          description: result.error || 'Não foi possível conectar ao ERP.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro no teste',
        description: 'Ocorreu um erro ao testar a conexão.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Integrações</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notificações</span>
          </CardTitle>
          <CardDescription>
            Envio de e-mails automáticos para os responsáveis (ex.: revisão de justificativa de falta).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <p className="text-base font-medium">E-mail</p>
              <p className="text-sm text-muted-foreground">
                Ativa o envio real de e-mails de notificação para esta organização.
              </p>
            </div>
            <Switch
              checked={isEmailEnabled}
              onCheckedChange={(checked) =>
                setNotificationsConfig((prev) => ({ ...prev, enabled: { ...prev.enabled, email: checked } }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Configurações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Integração ERP</span>
              </CardTitle>
              <CardDescription>
                Configure a integração com seu sistema ERP para sincronização de clientes, contas a receber e estoque.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Habilitar Integração</FormLabel>
                      <FormDescription>
                        Ativa a sincronização automática com o ERP
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mock"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Modo Simulado</FormLabel>
                      <FormDescription>
                        Execute integrações em modo de teste (recomendado para desenvolvimento)
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="baseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL Base do ERP</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://api.erp.exemplo.com" 
                          {...field} 
                          disabled={form.watch('mock')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={testConnection}
                    disabled={isTestingConnection || !form.watch('enabled')}
                    className="whitespace-nowrap"
                  >
                    {isTestingConnection ? 'Testando...' : 'Testar Conectividade'}
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="empresaRepresentadaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID da Empresa no ERP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="UUID da empresa_representada no Novus ERP"
                        {...field}
                        disabled={form.watch('mock')}
                      />
                    </FormControl>
                    <FormDescription>
                      Identificador do tenant correspondente no ERP. Sem isso, o envio de dados (contas a receber, clientes) não tem como ser autenticado do lado do ERP.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Configurações de Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Autenticação e Segurança</span>
              </CardTitle>
              <CardDescription>
                Credenciais para autenticação com o ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? 'Ocultar' : 'Mostrar'} Credenciais
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="signingSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signing Secret (Webhooks)</FormLabel>
                      <FormControl>
                        <Input 
                          type={showSecrets ? 'text' : 'password'}
                          placeholder="whsec_..." 
                          value={showSecrets ? field.value : maskSecret(field.value || '')}
                          onChange={showSecrets ? field.onChange : undefined}
                          onFocus={() => setShowSecrets(true)}
                          disabled={form.watch('mock')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Eventos de Integração */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Webhook className="h-5 w-5" />
                <span>Eventos de Sincronização</span>
              </CardTitle>
              <CardDescription>
                Selecione quais eventos devem ser sincronizados com o ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="events.clientUpsert"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Clientes (Responsáveis)</FormLabel>
                      <FormDescription className="text-xs">
                        Sincronizar criação/atualização de responsáveis como clientes no ERP
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="events.receivableCreated"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Contas a Receber</FormLabel>
                      <FormDescription className="text-xs">
                        Sincronizar mensalidades como contas a receber no ERP
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="events.paymentWebhook"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Webhooks de Pagamento</FormLabel>
                      <FormDescription className="text-xs">
                        Receber notificações de pagamentos do ERP
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          {/* Configurações de Portal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="h-5 w-5" />
                <span>Portal dos Responsáveis</span>
              </CardTitle>
              <CardDescription>
                Configure o portal para acesso dos responsáveis pelos alunos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PortalSection />
            </CardContent>
          </Card>

          <Separator />

          <div className="flex justify-end">
            <Button type="submit">
              Salvar Configurações ERP
            </Button>
          </div>
        </form>
      </Form>

      {/* Configurações de IA — form independente, fora do <form> de ERP acima
          (um <form> não pode conter outro <form> descendente em HTML) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <span>Recursos de IA</span>
          </CardTitle>
          <CardDescription>
            Configure quais funcionalidades de Inteligência Artificial estão disponíveis para sua organização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...iaForm}>
            <form onSubmit={iaForm.handleSubmit(onSubmitIA)} className="space-y-4">
              <FormField
                control={iaForm.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Habilitar IA</FormLabel>
                      <FormDescription>
                        Ativa todos os recursos de Inteligência Artificial
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={iaForm.control}
                name="chatbot"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Assistente IA (Chatbot)</FormLabel>
                      <FormDescription className="text-xs">
                        Chatbot para suporte pedagógico e administrativo
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!iaForm.watch('enabled')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={iaForm.control}
                name="risco"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Análise de Risco de Evasão</FormLabel>
                      <FormDescription className="text-xs">
                        Identificação automática de alunos em risco de evasão
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!iaForm.watch('enabled')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={iaForm.control}
                name="feedback"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Correção Automática (Feedback IA)</FormLabel>
                      <FormDescription className="text-xs">
                        Correção e feedback automatizado para avaliações
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!iaForm.watch('enabled')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={iaForm.control}
                name="financeiro"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">Análise Financeira (IA)</FormLabel>
                      <FormDescription className="text-xs">
                        Análise de inadimplência e gestão financeira inteligente
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!iaForm.watch('enabled')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4">
                <Button type="submit">
                  Salvar Configurações de IA
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
