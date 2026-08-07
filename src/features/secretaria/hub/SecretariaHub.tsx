
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, BookOpen, UserCheck, ExternalLink, Building, Layers, Grid3X3, Calendar, UserPlus, FileText, UserMinus, ClipboardList, HelpCircle, UserX, RotateCcw, FileSignature, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModalType } from '../types';

interface SecretariaHubProps {
  onOpenModal: (modal: ModalType) => void;
}

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
    { id: 'alunos' as const, title: 'Alunos', description: 'Gerenciar alunos da instituição', icon: Users, color: 'bg-blue-50 text-blue-600 border-blue-200' },
    { id: 'turmas' as const, title: 'Turmas', description: 'Gerenciar turmas e classes', icon: GraduationCap, color: 'bg-green-50 text-green-600 border-green-200' },
    { id: 'disciplinas' as const, title: 'Disciplinas', description: 'Gerenciar disciplinas do currículo', icon: BookOpen, color: 'bg-purple-50 text-purple-600 border-purple-200' },
    { id: 'matriculas' as const, title: 'Matrículas', description: 'Gerenciar matrículas de alunos', icon: UserCheck, color: 'bg-orange-50 text-orange-600 border-orange-200' },
    { id: 'unidades' as const, title: 'Unidades', description: 'Gerenciar unidades/campi', icon: Building, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    { id: 'segmentos' as const, title: 'Segmentos', description: 'Gerenciar segmentos educacionais', icon: Layers, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    { id: 'series' as const, title: 'Séries', description: 'Gerenciar séries por segmento', icon: Grid3X3, color: 'bg-pink-50 text-pink-600 border-pink-200' },
    { id: 'periodos' as const, title: 'Períodos', description: 'Gerenciar períodos letivos', icon: Calendar, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
    { id: 'responsaveis' as const, title: 'Responsáveis', description: 'Gerenciar responsáveis', icon: UserPlus, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    { id: 'documentos' as const, title: 'Documentos', description: 'Repositório de documentos', icon: FileText, color: 'bg-gray-50 text-gray-600 border-gray-200' },
    { id: 'visitantes' as const, title: 'Visitantes', description: 'Controle de visitantes', icon: UserMinus, color: 'bg-red-50 text-red-600 border-red-200' },
    { id: 'reservas' as const, title: 'Reservas de Vaga', description: 'Lista de espera', icon: ClipboardList, color: 'bg-teal-50 text-teal-600 border-teal-200' },
    { id: 'solicitacoes' as const, title: 'Solicitações', description: 'Pedidos à secretaria', icon: HelpCircle, color: 'bg-violet-50 text-violet-600 border-violet-200' },
    { id: 'ex-alunos' as const, title: 'Ex-Alunos', description: 'Alunos inativos/transferidos', icon: UserX, color: 'bg-slate-50 text-slate-600 border-slate-200' },
    { id: 'rematricula' as const, title: 'Rematrícula', description: 'Processo de rematrícula', icon: RotateCcw, color: 'bg-amber-50 text-amber-600 border-amber-200' },
    { id: 'contratos' as const, title: 'Modelo de Contrato', description: 'Texto do contrato de matrícula com assinatura eletrônica', icon: FileSignature, color: 'bg-rose-50 text-rose-600 border-rose-200', singlePage: true },
    { id: 'transferencias' as const, title: 'Transferência Escolar', description: 'Guia de transferência com histórico acadêmico e assinatura eletrônica', icon: ArrowRightLeft, color: 'bg-orange-50 text-orange-600 border-orange-200', singlePage: true },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Secretaria</h1>
        <p className="text-muted-foreground mt-2">
          Central de gerenciamento acadêmico e administrativo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Card key={module.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${module.color}`}>
                    <Icon className="h-6 w-6" />
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

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Use o "Cadastro Rápido" para adicionar novos registros rapidamente, ou acesse as páginas 
          individuais para funcionalidades completas de gerenciamento.
        </p>
      </div>
    </div>
  );
}
