
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  GraduationCap,
  CreditCard,
  FileText,
  MessageSquare,
  HelpCircle,
  LogOut,
  Menu
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import { PWAStatus } from "@/components/pwa/PWAStatus";
import OrgLogo from "@/components/OrgLogo";
import { logAuditSafe } from "@/utils/auditSafe";

const navigation = [
  { name: 'Dashboard', href: '/portal/dashboard', icon: Home },
  { name: 'Notas e Frequência', href: '/portal/academico', icon: GraduationCap },
  { name: 'Financeiro', href: '/portal/financeiro', icon: CreditCard },
  { name: 'Documentos', href: '/portal/documentos', icon: FileText },
  { name: 'Interações', href: '/portal/interacoes', icon: MessageSquare },
  { name: 'Demandas', href: '/portal/demandas', icon: HelpCircle },
];

export function PortalLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { guardian } = usePortalAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    // Log logout audit
    await logAuditSafe('portal_auth', {
      outcome: 'logout',
      pathname: location.pathname,
    });

    await supabase.auth.signOut();
    navigate('/portal/login');
  };

  return (
      <div className="min-h-screen bg-background">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform lg:translate-x-0 lg:static lg:inset-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex flex-col h-full">
            {/* Header: marca da instituição, não o nome do módulo */}
            <div className="flex h-20 items-center justify-center border-b px-6">
              <OrgLogo className="max-h-14" />
            </div>

            {/* PWA Status */}
            <div className="px-4 py-2">
              <PWAStatus />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                
                return (
                  <Button
                    key={item.name}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Button>
                );
              })}
            </nav>

            {/* User info and logout */}
            <div className="p-4 border-t">
              <div className="mb-4">
                <p className="text-sm font-medium">{guardian?.name}</p>
                <p className="text-xs text-muted-foreground">{guardian?.email}</p>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Barra do topo (mobile): fixa. `sticky` acompanharia a barra de URL
              do Safari no iOS entrando e saindo durante a rolagem. O spacer
              logo abaixo reserva o espaço, evitando media query no padding. */}
          <div
            className="fixed inset-x-0 top-0 z-30 flex items-center h-16 px-4 border-b bg-secondary/80 backdrop-blur lg:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Centrada na barra inteira, não no espaço que sobra do hambúrguer:
                com `justify-between` a logo nascia deslocada pra direita pela
                largura do botão. `absolute` tira ela do fluxo, `pointer-events-none`
                garante que não roube o toque de nada por cima. */}
            <OrgLogo className="pointer-events-none absolute left-1/2 max-h-12 -translate-x-1/2" />
          </div>
          <div className="h-16 lg:hidden" style={{ marginTop: 'env(safe-area-inset-top)' }} />

          {/* Content — pb reserva o rodapé fixo */}
          <main
            className="flex-1 p-6"
            style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
          >
            <Outlet />
          </main>
        </div>

        {/* Rodapé fixo, mesmo padrão do AppShell desktop. `bg-secondary` (teal
            bem claro) em vez de `card`: destaca as duas barras do conteúdo como
            moldura sem escurecer a logo da instituição nem a assinatura. */}
        <footer
          className="fixed inset-x-0 bottom-0 z-30 border-t bg-secondary/80 backdrop-blur lg:pl-64"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <span>Uma solução</span>
            <img src="/brand/novus-ai-logo.png" alt="NOVUS.AI" className="h-4 object-contain" />
          </div>
        </footer>

        <Toaster />
      </div>
  );
}
