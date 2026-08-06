import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { IconBadge, IconBadgeTone } from '@/components/IconBadge';
import { LucideIcon } from 'lucide-react';

interface BICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
  className?: string;
}

// warning usava accent-warm (coral, cor de marca) — coral fica só pra
// energia/CTA, warning tem token semântico próprio agora (ver index.css).
const variantClasses: Record<NonNullable<BICardProps['variant']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

const variantToTone: Record<NonNullable<BICardProps['variant']>, IconBadgeTone> = {
  default: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
};

export function BICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  isLoading = false,
  className = '',
}: BICardProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <IconBadge icon={Icon} tone={variantToTone[variant]} size="sm" />
      </CardHeader>
      <CardContent>
        <div className={`text-[26px] font-black tabular-nums tracking-tight ${variantClasses[variant]}`}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
