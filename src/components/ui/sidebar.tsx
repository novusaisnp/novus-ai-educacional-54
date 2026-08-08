import * as React from "react"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  User,
  Settings,
  Book,
  Calendar,
  Bell,
  FileText,
  ListChecks,
  BarChart,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Bot,
  Activity,
  ClipboardList,
  DollarSign,
  TestTube,
} from "lucide-react"

interface NavItem {
  title: string
  url: string
  icon?: React.ComponentType<{ className?: string }>
  isActive?: boolean
  items?: NavItem[]
}

interface SidebarData {
  user: {
    name: string
    email: string
    imageUrl: string
  }
  teams: {
    title: string
    members: {
      name: string
      imageUrl: string
    }[]
  }[]
  navMain: NavItem[]
  projects: {
    title: string
    members: {
      name: string
      imageUrl: string
    }[]
  }[]
  footer: {
    description: string
    copyright: string
    nav: {
      title: string
      url: string
    }[]
  }
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  data: SidebarData
}

export function Sidebar({ data, className, ...props }: SidebarProps) {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (url: string) => {
    return location.pathname === url
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isItemActive = isActive(item.url)

    if (item.items && item.items.length > 0) {
      return (
        <AccordionItem value={item.title} key={item.title}>
          <AccordionTrigger className="group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {item.icon && (
                  <item.icon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0 transition-colors",
                      isItemActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                )}
                <span>{item.title}</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-1">
            {item.items.map((subItem) => renderNavItem(subItem, level + 1))}
          </AccordionContent>
        </AccordionItem>
      )
    }

    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start px-4",
          level > 0 ? "pl-8" : "",
          isItemActive
            ? "bg-secondary text-foreground hover:bg-secondary/80"
            : "hover:bg-secondary/50",
          "font-medium"
        )}
        onClick={() => {
          navigate(item.url)
          setOpen(false)
        }}
        key={item.title}
      >
        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
        {item.title}
      </Button>
    )
  }

  return (
    <div className={cn("hidden border-r bg-background md:block", className)} {...props}>
      <div className="flex h-full max-h-screen flex-col justify-between space-y-2 py-2">
        <div className="flex-1 space-y-2 px-3 py-2">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight">Menu</h2>
            <p className="text-sm text-muted-foreground">Navegação principal</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {data.navMain.map((item) => renderNavItem(item))}
          </Accordion>
        </div>
        <div className="flex-1 space-y-2 px-3 py-2">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold tracking-tight">Configurações</h2>
            <p className="text-sm text-muted-foreground">Gerenciar sua conta</p>
          </div>
          <Button variant="ghost" className="w-full justify-start">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
        </div>
      </div>
    </div>
  )
}

export function MobileSidebar({ data }: { data: SidebarData }) {
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (url: string) => {
    return location.pathname === url
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const isItemActive = isActive(item.url)

    if (item.items && item.items.length > 0) {
      return (
        <AccordionItem value={item.title} key={item.title}>
          <AccordionTrigger className="group">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                {item.icon && (
                  <item.icon
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0 transition-colors",
                      isItemActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                )}
                <span>{item.title}</span>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-1">
            {item.items.map((subItem) => renderNavItem(subItem, level + 1))}
          </AccordionContent>
        </AccordionItem>
      )
    }

    return (
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start px-4",
          level > 0 ? "pl-8" : "",
          isItemActive
            ? "bg-secondary text-foreground hover:bg-secondary/80"
            : "hover:bg-secondary/50",
          "font-medium"
        )}
        onClick={() => {
          navigate(item.url)
          setOpen(false)
        }}
        key={item.title}
      >
        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
        {item.title}
      </Button>
    )
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:w-64">
        <div className="flex h-full max-h-screen flex-col justify-between space-y-2 py-2">
          <div className="flex-1 space-y-2 px-3 py-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">Menu</h2>
              <p className="text-sm text-muted-foreground">Navegação principal</p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {data.navMain.map((item) => renderNavItem(item))}
            </Accordion>
          </div>
          <div className="flex-1 space-y-2 px-3 py-2">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold tracking-tight">Configurações</h2>
              <p className="text-sm text-muted-foreground">Gerenciar sua conta</p>
            </div>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Adicionar as novas rotas do CRM nos dados de navegação da sidebar
export const sidebarData = {
  user: {
    name: "John Doe",
    email: "john@example.com",
    imageUrl: "https://github.com/shadcn.png",
  },
  teams: [
    {
      title: "Vendas",
      members: [
        {
          name: "John Doe",
          imageUrl: "https://github.com/shadcn.png",
        },
        {
          name: "Jane Doe",
          imageUrl: "https://avatars.githubusercontent.com/u/87679105?v=4",
        },
      ],
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "/app/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "Alunos",
      url: "/app/alunos",
      icon: User,
      isActive: false,
    },
    {
      title: "Turmas",
      url: "/app/turmas",
      icon: Users,
      isActive: false,
    },
    {
      title: "Disciplinas",
      url: "/app/disciplinas",
      icon: Book,
      isActive: false,
    },
    {
      title: "Matrículas",
      url: "/app/matriculas",
      icon: ListChecks,
      isActive: false,
    },
    {
      title: "Acadêmico",
      url: "/app/academico",
      icon: Book,
      isActive: false,
      items: [
        {
          title: "Chamada",
          url: "/app/academico/chamada",
        },
        {
          title: "Avaliações",
          url: "/app/academico/avaliacoes",
        },
        {
          title: "Notas",
          url: "/app/academico/notas",
        },
      ],
    },
    {
      title: "CRM",
      url: "/app/crm",
      icon: Users,
      isActive: false,
      items: [
        {
          title: "Hub",
          url: "/app/crm",
        },
        {
          title: "Leads",
          url: "/app/crm/leads",
        },
        {
          title: "Interações",
          url: "/app/crm/interacoes",
        },
        {
          title: "Demandas",
          url: "/app/crm/demandas",
        },
        {
          title: "Campanhas",
          url: "/app/crm/campanhas",
        },
      ],
    },
    {
      title: "IA Educacional",
      url: "/app/ai",
      icon: Bot,
      isActive: false,
      items: [
        {
          title: "Assistente IA",
          url: "/app/crm/assistente",
        },
        {
          title: "Painel de Risco",
          url: "/app/academico/alunos",
        },
        {
          title: "Correção com IA",
          url: "/app/academico/avaliacoes",
        },
        {
          title: "Financeiro (IA)",
          url: "/app/crm/demandas",
        },
        {
          title: "Diagnósticos IA",
          url: "/app/dev/diagnostics",
        },
      ],
    },
    {
      title: "Pedagógico",
      url: "/app/pedagogico",
      icon: BarChart,
      isActive: false,
    },
    {
      title: "Eventos",
      url: "/app/eventos",
      icon: Calendar,
      isActive: false,
    },
    {
      title: "Secretaria",
      url: "/app/secretaria",
      icon: FileText,
      isActive: false,
      items: [
        {
          title: "Alunos",
          url: "/app/secretaria/alunos",
        },
        {
          title: "Turmas",
          url: "/app/secretaria/turmas",
        },
        {
          title: "Disciplinas",
          url: "/app/secretaria/disciplinas",
        },
        {
          title: "Matrículas",
          url: "/app/secretaria/matriculas",
        },
        {
          title: "Visitantes",
          url: "/app/secretaria/visitantes",
        },
        {
          title: "Reservas de Vaga",
          url: "/app/secretaria/reservas",
        },
        {
          title: "Solicitações",
          url: "/app/secretaria/solicitacoes",
        },
        {
          title: "Rematrícula",
          url: "/app/secretaria/rematricula",
        },
        {
          title: "Responsáveis",
          url: "/app/secretaria/responsaveis",
        },
        {
          title: "Documentos",
          url: "/app/secretaria/documentos",
        },
        {
          title: "Períodos",
          url: "/app/secretaria/periodos",
        },
      ],
    },
    {
      title: "Configurações",
      url: "/app/config/integracoes",
      icon: Settings,
      isActive: false,
    },
  ],
  projects: [
    {
      title: "Projeto 1",
      members: [
        {
          name: "John Doe",
          imageUrl: "https://github.com/shadcn.png",
        },
        {
          name: "Jane Doe",
          imageUrl: "https://avatars.githubusercontent.com/u/87679105?v=4",
        },
      ],
    },
  ],
  footer: {
    description: "© 2023 SchoolOS. All rights reserved.",
    copyright: "SchoolOS",
    nav: [
      {
        title: "Terms of Service",
        url: "/terms",
      },
      {
        title: "Privacy Policy",
        url: "/privacy",
      },
    ],
  },
}
