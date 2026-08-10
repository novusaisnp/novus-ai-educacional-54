
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, BookOpen, UserCheck, ExternalLink, Building, Layers, Grid3X3, Calendar, UserPlus, FileText, UserMinus, ClipboardList, HelpCircle, UserX, RotateCcw, FileSignature, ArrowRightLeft, UserCog, Building2, Clock, type LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModalType } from '../types';

interface SecretariaHubProps {
  onOpenModal: (modal: ModalType) => void;
}

// Identidade visual "produto" (skill novus-satellite-visual-identity): totem = círculo com
// gradiente radial saturado, luz vindo do canto superior-esquerdo — 1 matiz por grupo.
function totemStyle(hue: number): React.CSSProperties {
  return {
    background: `radial-gradient(circle at 32% 26%, hsl(${hue} 55% 48% / .98), hsl(${hue} 62% 30% / .92))`,
    boxShadow: `0 4px 12px -5px hsl(${hue} 60% 28% / .55), inset 0 1px 1px hsl(0 0% 100% / .4)`,
  };
}

// Card sem borda, sombra em camadas tingida na cor de marca (teal) — não cinza neutro.
const CARD_STYLE: React.CSSProperties = {
  background: 'hsl(40 25% 99%)',
  boxShadow:
    '0 1px 1px hsl(174 35% 18% / 0.05), 0 10px 22px -14px hsl(174 40% 18% / 0.32), 0 28px 44px -30px hsl(174 45% 15% / 0.28), inset 0 1px 0 hsl(0 0% 100% / 0.7)',
};

const GROUPS: { label: string; icon: LucideIcon; hue: number }[] = [
  { label: 'Cadastros Acadêmicos', icon: GraduationCap, hue: 174 }, // teal
  { label: 'Estrutura Escolar', icon: Building2, hue: 38 }, // gold
  { label: 'Atendimento', icon: HelpCircle, hue: 14 }, // coral
  { label: 'Ciclo do Aluno', icon: RotateCcw, hue: 205 }, // azul profundo
  { label: 'Equipe', icon: UserCog, hue: 150 }, // verde
];

export function SecretariaHub({ onOpenModal }: SecretariaHubProps) {
  const navigate = useNavigate();

  // Função para determinar a rota correta baseada no módulo
  const getRouteForModule = (moduleId: string): string => {
    // Módulos com rotas canônicas
    const canonicalModules = ['alunos', 'turmas', 'disciplinas', 'matriculas'];

    if (canonicalModules.includes(moduleId)) {
      return `/app/${moduleId}`;
    }

    // Página de configuração única (não é lista de itens) — rota própria
    if (moduleId === 'contratos') {
      return '/app/secretaria/contratos/modelo';
    }
    if (moduleId === 'transferencias') {
      return '/app/secretaria/transferencias';
    }

    // Módulos exclusivos da secretaria
    return `/app/secretaria/${moduleId}`;
  };

  // Função para determinar a rota do cadastro rápido
  const getQuickAddRoute = (moduleId: string): string => {
    // Para os 4 módulos canônicos, usar hub da Secretaria com params
    const canonicalModules = ['alunos', 'turmas', 'disciplinas', 'matriculas'];

    if (canonicalModules.includes(moduleId)) {
      return `/app/secretaria?modal=${moduleId}&action=novo`;
    }

    // Para outros módulos, usar a rota específica com params
    const baseRoute = getRouteForModule(moduleId);
    return `${baseRoute}?modal=${moduleId}&action=novo`;
  };

  const modules = [
    { id: 'alunos' as const, title: 'Alunos', description: 'Gerenciar alunos da instituição', icon: Users, group: 'Cadastros Acadêmicos' },
    { id: 'turmas' as const, title: 'Turmas', description: 'Gerenciar turmas e classes', icon: GraduationCap, group: 'Cadastros Acadêmicos' },
    { id: 'disciplinas' as const, title: 'Disciplinas', description: 'Gerenciar disciplinas do currículo', icon: BookOpen, group: 'Cadastros Acadêmicos' },
    { id: 'matriculas' as const, title: 'Matrículas', description: 'Gerenciar matrículas de alunos', icon: UserCheck, group: 'Cadastros Acadêmicos' },
    { id: 'unidades' as const, title: 'Unidades', description: 'Gerenciar unidades/campi', icon: Building, group: 'Estrutura Escolar' },
    { id: 'segmentos' as const, title: 'Segmentos', description: 'Gerenciar segmentos educacionais', icon: Layers, group: 'Estrutura Escolar' },
    { id: 'series' as const, title: 'Séries', description: 'Gerenciar séries por segmento', icon: Grid3X3, group: 'Estrutura Escolar' },
    { id: 'periodos' as const, title: 'Períodos', description: 'Gerenciar períodos letivos', icon: Calendar, group: 'Estrutura Escolar' },
    { id: 'salas' as const, title: 'Salas', description: 'Ambientes físicos disponíveis para as turmas', icon: Building2, group: 'Estrutura Escolar', singlePage: true },
    { id: 'horarios' as const, title: 'Horários', description: 'Grade de dia-da-semana × hora do currículo', icon: Clock, group: 'Estrutura Escolar', singlePage: true },
    { id: 'responsaveis' as const, title: 'Responsáveis', description: 'Gerenciar responsáveis', icon: UserPlus, group: 'Atendimento' },
    { id: 'documentos' as const, title: 'Documentos', description: 'Repositório de documentos', icon: FileText, group: 'Atendimento' },
    { id: 'visitantes' as const, title: 'Visitantes', description: 'Controle de visitantes', icon: UserMinus, group: 'Atendimento' },
    { id: 'reservas' as const, title: 'Reservas de Vaga', description: 'Lista de espera', icon: ClipboardList, group: 'Atendimento' },
    { id: 'solicitacoes' as const, title: 'Solicitações', description: 'Pedidos à secretaria', icon: HelpCircle, group: 'Atendimento' },
    { id: 'ex-alunos' as const, title: 'Ex-Alunos', description: 'Alunos inativos/transferidos', icon: UserX, group: 'Ciclo do Aluno' },
    { id: 'rematricula' as const, title: 'Rematrícula', description: 'Processo de rematrícula', icon: RotateCcw, group: 'Ciclo do Aluno' },
    { id: 'contratos' as const, title: 'Modelo de Contrato', description: 'Texto do contrato de matrícula com assinatura eletrônica', icon: FileSignature, group: 'Ciclo do Aluno', singlePage: true },
    { id: 'transferencias' as const, title: 'Transferência Escolar', description: 'Guia de transferência com histórico acadêmico e assinatura eletrônica', icon: ArrowRightLeft, group: 'Ciclo do Aluno', singlePage: true },
    { id: 'equipe' as const, title: 'Equipe', description: 'Convidar professores, coordenadores e secretários', icon: UserCog, group: 'Equipe', singlePage: true },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Secretaria</h1>
        <p className="text-muted-foreground mt-2">
          Central de gerenciamento acadêmico e administrativo
        </p>
      </div>

      <Accordion type="multiple" className="w-full space-y-3">
        {GROUPS.map((group) => {
          const items = modules.filter((m) => m.group === group.label);
          if (items.length === 0) return null;
          const GroupIcon = group.icon;

          return (
            <AccordionItem key={group.label} value={group.label} className="border-0 rounded-2xl" style={CARD_STYLE}>
              <AccordionTrigger className="px-4 hover:no-underline [&>svg]:h-5 [&>svg]:w-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={totemStyle(group.hue)}>
                    <GroupIcon className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-semibold">{group.label}</span>
                  <span
                    className="flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white"
                    style={totemStyle(group.hue)}
                  >
                    {items.length}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((module) => {
                    const Icon = module.icon;
                    return (
                      <Card
                        key={module.id}
                        className="relative border-0 transition-transform duration-200 hover:-translate-y-0.5"
                        style={CARD_STYLE}
                      >
                        <CardHeader>
                          <div className="flex items-center space-x-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={totemStyle(group.hue)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-xl">{module.title}</CardTitle>
                              <CardDescription>{module.description}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Button
                              onClick={() => navigate(getRouteForModule(module.id))}
                              className="w-full"
                              variant="default"
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              {'singlePage' in module && module.singlePage ? 'Abrir' : 'Abrir Lista'}
                            </Button>
                            {!('singlePage' in module && module.singlePage) && (
                              <Button
                                onClick={() => navigate(getQuickAddRoute(module.id))}
                                className="w-full"
                                variant="outline"
                              >
                                Cadastro Rápido
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Use o "Cadastro Rápido" para adicionar novos registros rapidamente, ou acesse as páginas
          individuais para funcionalidades completas de gerenciamento.
        </p>
      </div>
    </div>
  );
}
