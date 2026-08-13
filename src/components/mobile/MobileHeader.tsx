import { ReactNode } from 'react';

/** Cabeçalho fixo do app mobile — título curto à esquerda, ação opcional à direita. */
export default function MobileHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <header
      className="sticky top-0 z-30 border-b border-border/60 bg-card/95 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
        {right}
      </div>
    </header>
  );
}
