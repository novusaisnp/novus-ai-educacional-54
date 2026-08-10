
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useOrganization } from "@/hooks/useOrganization";
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
  const { data: orgData } = useOrganization();
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
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-6 border-b">
              <div>
                <h1 className="text-lg font-semibold">Portal</h1>
                <p className="text-xs text-muted-foreground">
                  {orgData?.organizations?.name}
                </p>
              </div>
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
          {/* Top bar for mobile */}
          <div className="flex items-center justify-between h-16 px-4 border-b lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Portal dos Responsáveis</h1>
            <div />
          </div>

          {/* Content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>

        <Toaster />
      </div>
  );
}
