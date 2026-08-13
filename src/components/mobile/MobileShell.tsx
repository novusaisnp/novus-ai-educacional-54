import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Style, StatusBar } from '@capacitor/status-bar';
import MobileTabBar, { type MobileTab } from './MobileTabBar';
import { isNativeApp } from '@/lib/native';
import { usePushRegistration } from '@/hooks/usePushRegistration';

/**
 * Casca das rotas /m/*: conteúdo rolável + tab bar fixa. Sem sidebar, sem
 * breadcrumb — nada é reusado do layout desktop de propósito.
 */
export default function MobileShell({ tabs }: { tabs: MobileTab[] }) {
  // Fundo do app é claro; sem isto o Android desenha ícones brancos na status
  // bar e some com hora/bateria. No navegador é no-op.
  useEffect(() => {
    if (isNativeApp) StatusBar.setStyle({ style: Style.Light });
  }, []);

  // Só dentro do app: pede permissão e guarda o token do aparelho.
  usePushRegistration();

  return (
    <div className="min-h-screen bg-background">
      {/* Header e rodapé são fixos: o espaço deles sai daqui, não do fluxo.
          pt = h-24 + h-12 do MobileHeader; pb = tab bar (3.5rem) + assinatura
          (1.5rem) + safe area. */}
      <main
        className="mx-auto max-w-screen-sm"
        style={{
          paddingTop: 'calc(9rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))',
        }}
      >
        <Outlet />
      </main>
      <div
        className="fixed inset-x-0 bottom-0 z-40 bg-secondary/80 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <MobileTabBar tabs={tabs} />
        <div className="flex h-6 items-center justify-center gap-1.5 border-t border-border/40 text-[11px] text-muted-foreground">
          <span>Uma solução</span>
          <img src="/brand/novus-ai-logo.png" alt="NOVUS.AI" className="h-3 object-contain" />
        </div>
      </div>
    </div>
  );
}
