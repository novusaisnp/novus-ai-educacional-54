import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconBadgeTone = 'primary' | 'warm' | 'success' | 'warning' | 'info' | 'purple' | 'danger' | 'neutral';

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  size?: 'sm' | 'md';
  className?: string;
  /** 'totem' = gradiente radial saturado + ícone branco (ver
   * novus-satellite-visual-identity), em vez do tint pastel padrão. */
  variant?: 'flat' | 'totem';
}

// success/warning/info usam os tokens semânticos de index.css (antes eram
// classes Tailwind soltas — emerald-100/sky-100 etc. — escolhidas tela a
// tela). 'warm' continua ligado à cor de marca (coral); 'purple' é variedade
// categórica, não estado, por isso segue sem token dedicado.
const toneClasses: Record<IconBadgeTone, string> = {
  primary: 'bg-primary/10 text-primary',
  warm: 'bg-accent-warm/15 text-accent-warm',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  purple: 'bg-violet-100 text-violet-600',
  danger: 'bg-destructive/10 text-destructive',
  neutral: 'bg-muted text-muted-foreground',
};

// 'purple'/'neutral' não têm totem dedicado (categórico, não cor de marca
// nem estado) — caem de volta pro tom 'primary'.
const toneToTotemClass: Record<IconBadgeTone, string> = {
  primary: 'totem-teal',
  warm: 'totem-coral',
  success: 'totem-success',
  warning: 'totem-gold',
  info: 'totem-info',
  purple: 'totem-teal',
  danger: 'totem-danger',
  neutral: 'totem-ink',
};

const sizeClasses: Record<NonNullable<IconBadgeProps['size']>, string> = {
  sm: 'p-1.5',
  md: 'p-2',
};

const iconSizeClasses: Record<NonNullable<IconBadgeProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
};

export function IconBadge({ icon: Icon, tone = 'primary', size = 'md', variant = 'flat', className }: IconBadgeProps) {
  if (variant === 'totem') {
    return (
      <div className={cn('rounded-full text-white', toneToTotemClass[tone], sizeClasses[size], className)}>
        <Icon className={iconSizeClasses[size]} />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl', toneClasses[tone], sizeClasses[size], className)}>
      <Icon className={iconSizeClasses[size]} />
    </div>
  );
}
