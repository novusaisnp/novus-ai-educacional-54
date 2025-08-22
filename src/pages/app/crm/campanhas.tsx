
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar, Users, Mail, MessageCircle, BarChart3 } from 'lucide-react';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function CRMCampanhas() {
  return (
    <div className="space-y-6">
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
              <BreadcrumbPage>Campanhas</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold mt-2">Campanhas de Marketing</h1>
        <p className="text-muted-foreground">
          Automação e campanhas para leads e responsáveis
        </p>
      </div>

      {/* Placeholder para funcionalidade futura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Módulo em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Campanhas em Breve</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Este módulo permitirá criar e gerenciar campanhas automatizadas para nutrição de leads, 
                retenção de alunos e comunicação com responsáveis.
              </p>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto mt-8">
              <Card>
                <CardContent className="p-4 text-center">
                  <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium mb-1">Email Marketing</h4>
                  <p className="text-sm text-muted-foreground">
                    Campanhas segmentadas por email
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium mb-1">WhatsApp</h4>
                  <p className="text-sm text-muted-foreground">
                    Automação via WhatsApp Business
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <h4 className="font-medium mb-1">Analytics</h4>
                  <p className="text-sm text-muted-foreground">
                    Métricas de conversão e ROI
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-8">
              <Badge variant="outline" className="text-xs">
                Previsão de lançamento: Q2 2024
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap básico */}
      <Card>
        <CardHeader>
          <CardTitle>Roadmap de Funcionalidades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <h4 className="font-medium">Gestão de Leads ✓</h4>
                <p className="text-sm text-muted-foreground">
                  Sistema completo de tracking e conversão de visitantes
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div>
                <h4 className="font-medium">Painel de Demandas ✓</h4>
                <p className="text-sm text-muted-foreground">
                  Gestão de pós-vendas e relacionamento bilateral
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <h4 className="font-medium">Campanhas Automatizadas</h4>
                <p className="text-sm text-muted-foreground">
                  Sequências de email e WhatsApp baseadas em triggers
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2"></div>
              <div>
                <h4 className="font-medium">Segmentação Avançada</h4>
                <p className="text-sm text-muted-foreground">
                  Segmentação de leads por critérios personalizados
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-300 mt-2"></div>
              <div>
                <h4 className="font-medium">Integração com Mídias Sociais</h4>
                <p className="text-sm text-muted-foreground">
                  Captura de leads do Facebook e Instagram
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
