import { useOrgBranding } from '@/hooks/useEmpresaLogo';
import { cn } from '@/lib/utils';

/**
 * Logo da instituição (empresa representada, com fallback pra logo local).
 * Um componente só, usado no desktop, no portal e no app — a marca da escola
 * tem que estar presente em todo ambiente do sistema.
 *
 * Sem logo cadastrada, cai no nome da instituição em texto: o espaço nunca
 * fica vazio, mas também não inventa placeholder.
 */
export default function OrgLogo({ className }: { className?: string }) {
  const { data } = useOrgBranding();

  if (!data?.logoUrl) {
    return data?.name ? (
      <span className={cn('truncate font-display text-sm font-semibold', className)}>{data.name}</span>
    ) : null;
  }

  return (
    <img
      src={data.logoUrl}
      alt={data.name ?? 'Logo da instituição'}
      className={cn('max-w-[160px] object-contain', className)}
    />
  );
}
