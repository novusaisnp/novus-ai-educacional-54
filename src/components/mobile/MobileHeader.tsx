import { ReactNode } from 'react';
import OrgLogo from '@/components/OrgLogo';

/**
 * Cabeçalho fixo do app mobile: faixa da marca da instituição em cima e, embaixo,
 * título curto à esquerda com ação opcional à direita. A logo fica em faixa
 * própria porque no celular ela não cabe junto do título e do seletor de aluno.
 *
 * `fixed`, não `sticky`: no Safari do iOS a barra de URL entra e sai durante a
 * rolagem e um header sticky acompanha esse movimento. A altura total (h-24 +
 * h-12 = 9rem) está espelhada no paddingTop do MobileShell — mudou aqui, muda lá.
 */
export default function MobileHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-30 border-b border-border/60 bg-secondary/80 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-24 items-center justify-center px-4">
        <OrgLogo className="max-h-20 max-w-[280px]" />
      </div>
      <div className="flex h-12 items-center justify-between px-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  );
}
