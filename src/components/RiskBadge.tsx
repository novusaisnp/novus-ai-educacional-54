import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface RiskBadgeProps {
  score: number;
  className?: string;
}

export function RiskBadge({ score, className }: RiskBadgeProps) {
  const getRiskLevel = (score: number) => {
    if (score < 0.4) return { level: 'baixo', variant: 'secondary' as const, color: 'text-green-600', icon: CheckCircle };
    if (score <= 0.7) return { level: 'médio', variant: 'default' as const, color: 'text-yellow-600', icon: Clock };
    return { level: 'alto', variant: 'destructive' as const, color: 'text-red-600', icon: AlertTriangle };
  };

  const risk = getRiskLevel(score);
  const Icon = risk.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={risk.variant} className={className}>
            <Icon className="w-3 h-3 mr-1" />
            {(score * 100).toFixed(0)}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Risco de evasão: {risk.level}</p>
          <p className="text-xs text-muted-foreground">
            Baseado em frequência e notas recentes
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}