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
      // ponytail: `mix-blend-multiply` dissolve fundo branco/claro de PNG e JPEG
      // sem processar pixel — cobre a esmagadora maioria das logos que as escolas
      // enviam. Teto conhecido: logo de fundo ESCURO (ou arte branca sobre cor)
      // fica escurecida em vez de recortada. Se isso aparecer na base real, a
      // correção é no upload do ERP (recorte + preview antes de salvar), não aqui.
      // Desligado no tema escuro, onde multiply apagaria a logo contra a barra.
      className={cn('max-w-[160px] object-contain mix-blend-multiply dark:mix-blend-normal', className)}
    />
  );
}
