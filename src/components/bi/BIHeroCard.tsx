import { Skeleton } from '@/components/ui/skeleton';

interface BIHeroCardProps {
  eyebrow: string;
  value: string | number;
  label: string;
  isLoading?: boolean;
  className?: string;
}

// Card-âncora de um layout bento — maior, com blobs decorativos via
// gradiente radial, número em display (Sora). Ver
// novus-satellite-visual-identity: só faz sentido pra 1 métrica por tela,
// a mais acionável — não é um variant genérico do BICard.
export function BIHeroCard({ eyebrow, value, label, isLoading = false, className = '' }: BIHeroCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[22px] p-6 flex flex-col justify-between text-primary-foreground shadow-card-hero ${className}`}
      style={{
        background: 'linear-gradient(155deg, hsl(174 55% 24%), hsl(178 60% 12%) 68%)',
      }}
    >
      <div
        aria-hidden
        className="absolute w-56 h-56 rounded-full -right-16 -bottom-20"
        style={{ background: 'radial-gradient(circle, hsl(var(--accent-warm) / 0.55), transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute w-40 h-40 rounded-full right-10 -top-16"
        style={{ background: 'radial-gradient(circle, hsl(var(--accent-gold) / 0.35), transparent 70%)' }}
      />

      <p className="relative text-sm font-semibold opacity-90">{eyebrow}</p>

      {isLoading ? (
        <div className="relative mt-5 space-y-2">
          <Skeleton className="h-10 w-24 bg-white/20" />
          <Skeleton className="h-4 w-32 bg-white/20" />
        </div>
      ) : (
        <div className="relative mt-5">
          <div className="font-display text-5xl font-extrabold leading-none tracking-tight tabular-nums">
            {value}
          </div>
          <p className="text-sm opacity-85 mt-2 font-semibold">{label}</p>
        </div>
      )}
    </div>
  );
}
