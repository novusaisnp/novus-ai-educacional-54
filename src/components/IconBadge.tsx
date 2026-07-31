import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type IconBadgeTone = 'primary' | 'warm' | 'success' | 'info' | 'purple' | 'danger' | 'neutral';

interface IconBadgeProps {
  icon: LucideIcon;
  tone?: IconBadgeTone;
  size?: 'sm' | 'md';
  className?: string;
}

const toneClasses: Record<IconBadgeTone, string> = {
  primary: 'bg-primary/10 text-primary',
  warm: 'bg-accent-warm/15 text-accent-warm',
  success: 'bg-emerald-100 text-emerald-600',
  info: 'bg-sky-100 text-sky-600',
  purple: 'bg-violet-100 text-violet-600',
  danger: 'bg-red-100 text-red-600',
  neutral: 'bg-muted text-muted-foreground',
};

const sizeClasses: Record<NonNullable<IconBadgeProps['size']>, string> = {
  sm: 'p-1.5',
  md: 'p-2',
};

const iconSizeClasses: Record<NonNullable<IconBadgeProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
};

export function IconBadge({ icon: Icon, tone = 'primary', size = 'md', className }: IconBadgeProps) {
  return (
    <div className={cn('rounded-xl', toneClasses[tone], sizeClasses[size], className)}>
      <Icon className={iconSizeClasses[size]} />
    </div>
  );
}
