import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, GraduationCap, CreditCard, Users, ArrowRight } from 'lucide-react';
import { useBIAccess } from '@/hooks/useBIAccess';
import { useNavigate } from 'react-router-dom';
import { AlertsCounter } from '@/components/bi/AlertsCounter';
import EmptyState from '@/components/EmptyState';

export default function BIHub() {
  const { canView } = useBIAccess();
  const navigate = useNavigate();

  if (!canView) {
    return (
      <EmptyState
        title="Acesso negado"
        description="Você não tem permissão para acessar o Business Intelligence."
      />
    );
  }

  const biModules = [
    {
      title: 'BI Acadêmico',
      description: 'Análise de desempenho acadêmico, frequência e risco de evasão',
      icon: GraduationCap,
      href: '/app/bi/academico',
      color: 'text-blue-600',
    },
    {
      title: 'BI Financeiro',
      description: 'Análise de receitas, inadimplência e eficiência de cobrança',
      icon: CreditCard,
      href: '/app/bi/financeiro',
      color: 'text-green-600',
    },
    {
      title: 'BI CRM',
      description: 'Análise de leads, conversões e relacionamento com clientes',
      icon: Users,
      href: '/app/bi/crm',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Business Intelligence</h1>
          <p className="text-muted-foreground">
            Análises e relatórios para tomada de decisão
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulos do BI */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Módulos Disponíveis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {biModules.map((module) => {
              const Icon = module.icon;
              return (
                <Card key={module.href} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className={`h-5 w-5 ${module.color}`} />
                      {module.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                    <Button
                      onClick={() => navigate(module.href)}
                      className="w-full"
                      variant="outline"
                    >
                      Acessar
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Alertas Operacionais */}
        <div className="space-y-4">
          <AlertsCounter />
          
          {/* Card de ajuda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sobre o BI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                O Business Intelligence oferece análises detalhadas para apoiar 
                a gestão educacional com dados acadêmicos, financeiros e de relacionamento.
              </p>
              <p>
                Todos os relatórios podem ser exportados em CSV e PDF, e você pode 
                configurar envios automáticos por e-mail.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}