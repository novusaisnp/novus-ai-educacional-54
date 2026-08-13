import { Outlet } from 'react-router-dom';
import MobileTabBar, { type MobileTab } from './MobileTabBar';

/**
 * Casca das rotas /m/*: conteúdo rolável + tab bar fixa. Sem sidebar, sem
 * breadcrumb — nada é reusado do layout desktop de propósito.
 */
export default function MobileShell({ tabs }: { tabs: MobileTab[] }) {
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
