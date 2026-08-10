import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Users, CreditCard, Clock, ExternalLink } from 'lucide-react';
import { useBIAlertas } from '@/hooks/useBIData';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export function AlertsCounter() {
  const { data: alertsData, isLoading } = useBIAlertas();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas Operacionais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-8" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlertas = alertsData?.totalAlertas || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alertas Operacionais
          {totalAlertas > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {totalAlertas}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {totalAlertas === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Nenhum alerta hoje 🎉
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  Inadimplência
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {alertsData?.alertasInadimplencia || 0}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Risco Evasão
                </div>
                <div className="text-2xl font-bold text-accent-warm">
                  {alertsData?.alertasRiscoEvasao || 0}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  SLA Demandas
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {alertsData?.alertasSLA || 0}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Outros
                </div>
                <div className="text-2xl font-bold">
                  {alertsData?.alertasOutros || 0}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t">
              {alertsData?.alertasInadimplencia > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-between"
                  onClick={() => navigate('/app/bi/financeiro')}
                >
                  Ver detalhes financeiros
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              
              {alertsData?.alertasRiscoEvasao > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-between"
                  onClick={() => navigate('/app/bi/academico')}
                >
                  Ver análise de risco
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              
              {alertsData?.alertasSLA > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-between"
                  onClick={() => navigate('/app/crm/demandas')}
                >
                  Ver demandas em atraso
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}