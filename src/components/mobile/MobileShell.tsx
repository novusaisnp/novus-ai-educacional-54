import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Style, StatusBar } from '@capacitor/status-bar';
import MobileTabBar, { type MobileTab } from './MobileTabBar';
import { isNativeApp } from '@/lib/native';

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

  return (
    <div className="min-h-screen bg-background">
      {/* pb: altura da tab bar (56px) + safe area */}
      <main
        className="mx-auto max-w-screen-sm"
        style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        <Outlet />
      </main>
      <MobileTabBar tabs={tabs} />
    </div>
  );
}
