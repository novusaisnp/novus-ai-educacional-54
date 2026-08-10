import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, NavigateFunction } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import {
  LayoutDashboard,
  School,
  GraduationCap,
  NotebookPen,
  CalendarDays,
  Users,
  LogOut,
  Menu,
  Pin,
  PinOff,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Toaster } from '@/components/ui/toaster';
import { useSession } from '@/hooks/useSession';
import { supabase } from '@/integrations/supabase/client';
import { safeToast } from '@/lib/safeToast';
import { useSidebarContext, SidebarProvider } from './sidebar-context';
import { useUserRole } from '@/hooks/useUserRole';
import { useIAAccess } from '@/hooks/useIAAccess';
import { useOrganization } from '@/hooks/useOrganization';
import { logAudit } from '@/lib/audit/logAudit';
import { PWAStatus } from '@/components/pwa/PWAStatus';
import DebugBanner from "@/components/DebugBanner";

// Compartilhado entre o cartão de usuário da sidebar (desktop) e o dropdown
// do topbar (mobile, onde a sidebar fica oculta) — mesmo fluxo de logout,
// um só lugar pra manter.
export async function performLogout(navigate: NavigateFunction) {
  try {
    await supabase.auth.signOut();
    safeToast({ title: 'Logout realizado com sucesso' });
    navigate('/auth/login');
  } catch (error) {
    safeToast({ variant: 'destructive', title: 'Erro ao fazer logout' });
  }
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  coordenacao: 'Coordenação',
  professor: 'Professor',
  secretario: 'Secretaria',
};

const baseMenuItems = [
  { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard, roles: ['admin', 'coordenacao', 'professor', 'secretario'] },
  { title: 'BI', url: '/app/bi', icon: BarChart3, roles: ['admin', 'coordenacao', 'secretario'] },
  { title: 'Secretaria', url: '/app/secretaria', icon: School, roles: ['admin', 'coordenacao', 'secretario'] },
  { title: 'CRM', url: '/app/crm', icon: Users, roles: ['admin', 'coordenacao', 'secretario'], submenu: [
    { title: 'Leads', url: '/app/crm/leads' },
    { title: 'Interações', url: '/app/crm/interacoes' },
    { title: 'Demandas', url: '/app/crm/demandas' },
    { title: 'Campanhas', url: '/app/crm/campanhas' },
  ]},
  { title: 'Acadêmico', url: '/app/academico', icon: GraduationCap, roles: ['admin', 'coordenacao', 'professor'] },
  { title: 'Pedagógico', url: '/app/pedagogico', icon: NotebookPen, roles: ['admin', 'coordenacao', 'professor'] },
  { title: 'Eventos', url: '/app/eventos', icon: CalendarDays, roles: ['admin', 'coordenacao', 'professor', 'secretario'] },
];

function AppSidebar() {
  const location = useLocation();
  const { collapsed, hoverOpen, pinned, setPinned, expanded } = useSidebarContext();
  const { data: userRole } = useUserRole();
  const { canAccess } = useIAAccess();
  const { data: orgData } = useOrganization();

  const isActive = (url: string, pathname: string) => {
    return pathname === url || pathname.startsWith(url + '/');
  };

  const shouldShowTooltip = collapsed && !hoverOpen && !pinned;

  const handleAIItemClick = (action: string, url: string) => {
    if (orgData?.organization_id) {
      logAudit({
        organization_id: orgData.organization_id,
        action: `sidebar_${action}`,
        diff: { url },
      });
    }
  };

  // Filtrar itens do menu baseado no role do usuário e configurações de IA
  const menuItems = [...baseMenuItems];
  
  // Adicionar itens de IA apenas se habilitados
  const crmItem = menuItems.find(item => item.title === 'CRM');
  if (crmItem && canAccess('chatbot')) {
    crmItem.submenu = [...(crmItem.submenu || []), { title: 'Assistente IA', url: '/app/crm/assistente' }];
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  return (
    <TooltipProvider>
      <div
        className="sidebar overflow-y-auto flex flex-col h-full"
        style={{
          width: 'var(--sidebar-w)'
        }}
      >
        {/* Logo/Brand + Pin Button */}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className={`${!expanded ? 'text-center' : 'text-left'} transition-all duration-300 flex-1`}>
            {!expanded ? (
              <div className="w-8 h-8 mx-auto">
                <img
                  src="/brand/novus-icon-mark.png"
                  alt="NOVUS.AI Educacional"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              // Logo oficial (ícone + wordmark), fundo branco original
              // removido via matte de saturação — o PNG entregue pelo
              // usuário vinha com um glow quase-branco opaco colado atrás
              // do texto, que aparecia como uma caixa clara sobre o
              // gradiente escuro da sidebar.
              <img
                src="/brand/novus-logo-sidebar.png"
                alt="NOVUS.AI Educacional"
                className="h-9 object-contain"
              />
            )}
          </div>

          {/* Pin Button */}
          {expanded && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPinned(!pinned)}
                  className="h-8 w-8 p-0 flex-shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label={pinned ? 'Desafixar sidebar' : 'Fixar sidebar'}
                >
                  {pinned ? (
                    <PinOff className="h-4 w-4" />
                  ) : (
                    <Pin className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{pinned ? 'Desafixar sidebar' : 'Fixar sidebar'}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.url, location.pathname);
              
              const menuButton = (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`flex items-center px-3 py-2 rounded-full transition-colors duration-200 ${
                    active
                      ? 'sidebar-nav-active font-semibold'
                      : 'hover:bg-sidebar-accent/40 text-sidebar-foreground'
                  }`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    if (item.url.includes('/crm/assistente')) {
                      handleAIItemClick('open_chatbot', item.url);
                    }
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {expanded && (
                    <span className="ml-3 transition-opacity duration-200">
                      {item.title}
                    </span>
                  )}
                </NavLink>
              );

              return shouldShowTooltip ? (
                <Tooltip key={item.title}>
                  <TooltipTrigger asChild>
                    {menuButton}
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    <p>{item.title}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                menuButton
              );
            })}
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}

function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: userRole } = useUserRole();
  const { canAccess } = useIAAccess();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getPageTitle = (pathname: string) => {
    const item = filteredMenuItems.find(item => 
      item.url === pathname || pathname.startsWith(item.url + '/')
    );
    return item?.title || 'Sistema';
  };

  // Usar os mesma lógica de filtros para mobile
  const mobileCrmItem = baseMenuItems.find(item => item.title === 'CRM');
  if (mobileCrmItem && canAccess('chatbot')) {
    mobileCrmItem.submenu = [...(mobileCrmItem.submenu || []), { title: 'Assistente IA', url: '/app/crm/assistente' }];
  }

  const filteredMenuItems = baseMenuItems.filter(item => {
    if (!userRole) return false;
    return item.roles.includes(userRole);
  });

  const userDisplayName = (user?.user_metadata?.full_name as string | undefined) || user?.email || 'Usuário';
  const userInitials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const roleLabel = roleLabels[userRole ?? ''] ?? 'Usuário';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center space-x-4">
        {/* Mobile menu trigger */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{getPageTitle(location.pathname)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-3">
        <PWAStatus />

      {/* Conta do usuário — canto superior direito, sempre visível (antes
          vivia num cartão no rodapé da sidebar, onde o rodapé fixo da
          página cobria por cima). */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-full py-1 pl-2.5 pr-1 transition-colors hover:bg-accent"
          >
            <span className="hidden sm:block text-right leading-tight">
              <span className="block text-sm font-semibold truncate max-w-[160px]">{userDisplayName}</span>
              <span className="block text-xs text-muted-foreground truncate max-w-[160px]">{roleLabel}</span>
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent-gold text-accent-gold-foreground text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-medium leading-none">{userDisplayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => performLogout(navigate)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-background border-r shadow-lg transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <img
                  src="/brand/novus-ai-educacional-logo.png"
                  alt="NOVUS.AI Educacional"
                  className="h-6 object-contain"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fechar menu"
                >
                  ×
                </Button>
              </div>
            </div>
            <nav className="p-4">
              <div className="space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = location.pathname === item.url || location.pathname.startsWith(item.url + '/');
                  
                  return (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                        active
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'hover:bg-sidebar-accent/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

// Error Boundary para evitar tela branca
function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="p-6 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-semibold mb-4">Algo deu errado</h1>
            <pre className="mt-2 text-sm opacity-70 whitespace-pre-wrap bg-muted p-4 rounded max-w-lg">
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <Button onClick={resetErrorBoundary} className="mt-4">
              Tentar novamente
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// Layout principal com data-attributes e grid fluido
function AppLayout({ children }: { children: React.ReactNode }) {
  const { expanded, onEnter, onLeave } = useSidebarContext();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden pb-12">
      <div 
        className="flex-1 grid app-grid" 
        style={{ 
          gridTemplateColumns: 'var(--sidebar-w) minmax(0, 1fr)'
        }}
        data-sidebar={expanded ? 'expanded' : 'collapsed'}
      >
        <aside 
          className="sidebar h-screen sticky top-0 hidden md:block"
          style={{ width: 'var(--sidebar-w)' }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
        >
          <AppSidebar />
        </aside>
        <main className="min-w-0 flex flex-col">
          <TopBar />
          <div className="flex-1 p-6 overflow-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Rodapé fixo */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
            <span>Uma solução</span>
            <img
              src="/brand/novus-ai-logo.png"
              alt="NOVUS.AI"
              className="h-4 object-contain"
            />
          </div>
        </div>
      </footer>
    </div>
  );
}

export function AppShell() {
  return (
    <SidebarProvider>
      <AppErrorBoundary>
        <AppLayout>
          <Outlet />
        </AppLayout>
        <Toaster />
        <DebugBanner />
      </AppErrorBoundary>
    </SidebarProvider>
  );
}
