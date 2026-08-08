
import React, { Suspense, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { SecretariaModalContext, ModalType } from '../types';
import {
  ClassRow,
  DocumentRow,
  EnrollmentRow,
  GuardianRow,
  ReEnrollmentRow,
  RequestRow,
  StudentRow,
  SubjectRow,
  WaitlistApplicationRow,
} from '@/integrations/supabase/db-types';

interface EditingStates {
  alunos: StudentRow | null;
  turmas: ClassRow | null;
  disciplinas: SubjectRow | null;
  matriculas: EnrollmentRow | null;
  unidades: string | null;
  segmentos: string | null;
  series: string | null;
  periodos: string | null;
  responsaveis: GuardianRow | null;
  documentos: DocumentRow | null;
  visitantes: string | null;
  reservas: WaitlistApplicationRow | null;
  solicitacoes: RequestRow | null;
  'ex-alunos': StudentRow | null;
  rematricula: ReEnrollmentRow | null;
}

// Lazy imports dos submodais
const SubmodalAlunos = React.lazy(() => 
  import('../alunos/SubmodalAlunos').then(module => ({ default: module.SubmodalAlunos }))
);
const SubmodalTurmas = React.lazy(() => 
  import('../turmas/SubmodalTurmas').then(module => ({ default: module.SubmodalTurmas }))
);
const SubmodalDisciplinas = React.lazy(() => 
  import('../disciplinas/SubmodalDisciplinas').then(module => ({ default: module.SubmodalDisciplinas }))
);
const SubmodalMatriculas = React.lazy(() => 
  import('../matriculas/SubmodalMatriculas').then(module => ({ default: module.SubmodalMatriculas }))
);
const SubmodalUnidades = React.lazy(() => 
  import('../unidades/SubmodalUnidades').then(module => ({ default: module.SubmodalUnidades }))
);
const SubmodalSegmentos = React.lazy(() => 
  import('../segmentos/SubmodalSegmentos').then(module => ({ default: module.SubmodalSegmentos }))
);
const SubmodalSeries = React.lazy(() => 
  import('../series/SubmodalSeries').then(module => ({ default: module.SubmodalSeries }))
);
const SubmodalPeriodos = React.lazy(() => 
  import('../periodos/SubmodalPeriodos').then(module => ({ default: module.SubmodalPeriodos }))
);
const SubmodalVisitantes = React.lazy(() => 
  import('../visitantes/SubmodalVisitantes').then(module => ({ default: module.SubmodalVisitantes }))
);
const SubmodalResponsaveis = React.lazy(() => 
  import('../responsaveis/SubmodalResponsaveis').then(module => ({ default: module.SubmodalResponsaveis }))
);
const SubmodalDocumentos = React.lazy(() => 
  import('../documentos/SubmodalDocumentos').then(module => ({ default: module.SubmodalDocumentos }))
);
const SubmodalReservas = React.lazy(() => 
  import('../reservas/SubmodalReservas').then(module => ({ default: module.SubmodalReservas }))
);
const SubmodalSolicitacoes = React.lazy(() => 
  import('../solicitacoes/SubmodalSolicitacoes').then(module => ({ default: module.SubmodalSolicitacoes }))
);
const SubmodalExAlunos = React.lazy(() => 
  import('../ex-alunos/SubmodalExAlunos').then(module => ({ default: module.SubmodalExAlunos }))
);
const SubmodalRematricula = React.lazy(() => 
  import('../rematricula/SubmodalRematricula').then(module => ({ default: module.SubmodalRematricula }))
);

interface ModalMestreProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: ModalType;
  editingItem?: EditingStates[ModalType];
}

export function ModalMestre({ isOpen, onClose, defaultTab, editingItem }: ModalMestreProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ModalType>(defaultTab || 'alunos');
  const [editingStates, setEditingStates] = useState<EditingStates>({
    alunos: null,
    turmas: null,
    disciplinas: null,
    matriculas: null,
    unidades: null,
    segmentos: null,
    series: null,
    periodos: null,
    responsaveis: null,
    documentos: null,
    visitantes: null,
    reservas: null,
    solicitacoes: null,
    'ex-alunos': null,
    rematricula: null,
  });

  const { data: orgData } = useOrganization();

  // Sincronizar com query params
  useEffect(() => {
    if (isOpen) {
      const modalParam = searchParams.get('modal') as ModalType;
      if (modalParam && ['alunos', 'turmas', 'disciplinas', 'matriculas'].includes(modalParam)) {
        setActiveTab(modalParam);
      } else if (defaultTab) {
        setActiveTab(defaultTab);
        setSearchParams(prev => {
          prev.set('modal', defaultTab);
          return prev;
        });
      }
    }
  }, [isOpen, searchParams, defaultTab, setSearchParams]);

  // Semear o item em edição quando o modal abre já com um alvo definido
  // (páginas-lista que usam o ModalMestre genérico, ex.: botão "Editar" de reservas)
  useEffect(() => {
    if (isOpen && defaultTab && editingItem) {
      setEditingStates(prev => ({ ...prev, [defaultTab]: editingItem }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Atualizar query params quando tab muda
  const handleTabChange = (tab: ModalType) => {
    setActiveTab(tab);
    setSearchParams(prev => {
      prev.set('modal', tab);
      return prev;
    });
  };

  // Limpar query params ao fechar
  const handleClose = () => {
    setSearchParams(prev => {
      prev.delete('modal');
      prev.delete('action');
      prev.delete('id');
      return prev;
    });
    
    // Reset editing states
    setEditingStates({
      alunos: null,
      turmas: null,
      disciplinas: null,
      matriculas: null,
      unidades: null,
      segmentos: null,
      series: null,
      periodos: null,
      responsaveis: null,
      documentos: null,
        visitantes: null,
        reservas: null,
        solicitacoes: null,
        'ex-alunos': null,
        rematricula: null,
      });
    
    onClose();
  };

  // Context compartilhado
  const context: SecretariaModalContext = {
    orgId: orgData?.organization_id || '',
    onSaved: () => {
      // Invalidar queries será feito pelos próprios submodais
    },
    onClose: handleClose,
  };

  const tabs = [
    { id: 'alunos' as const, label: 'Alunos', component: SubmodalAlunos },
    { id: 'turmas' as const, label: 'Turmas', component: SubmodalTurmas },
    { id: 'disciplinas' as const, label: 'Disciplinas', component: SubmodalDisciplinas },
    { id: 'matriculas' as const, label: 'Matrículas', component: SubmodalMatriculas },
    { id: 'unidades' as const, label: 'Unidades', component: SubmodalUnidades },
    { id: 'segmentos' as const, label: 'Segmentos', component: SubmodalSegmentos },
    { id: 'series' as const, label: 'Séries', component: SubmodalSeries },
    { id: 'periodos' as const, label: 'Períodos', component: SubmodalPeriodos },
    { id: 'responsaveis' as const, label: 'Responsáveis', component: SubmodalResponsaveis },
    { id: 'documentos' as const, label: 'Documentos', component: SubmodalDocumentos },
    { id: 'visitantes' as const, label: 'Visitantes', component: SubmodalVisitantes },
    { id: 'reservas' as const, label: 'Reservas', component: SubmodalReservas },
    { id: 'solicitacoes' as const, label: 'Solicitações', component: SubmodalSolicitacoes },
    { id: 'ex-alunos' as const, label: 'Ex-Alunos', component: SubmodalExAlunos },
    { id: 'rematricula' as const, label: 'Rematrícula', component: SubmodalRematricula },
  ];

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-20 w-full" />
      <div className="flex justify-end space-x-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido - Secretaria</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6 h-auto flex-wrap gap-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((tab) => {
            return (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                <Suspense fallback={<LoadingSkeleton />}>
                  {tab.id === 'alunos' && (
                    <SubmodalAlunos
                      context={context}
                      editingStudent={editingStates.alunos}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          alunos: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'turmas' && (
                    <SubmodalTurmas
                      context={context}
                      editingClass={editingStates.turmas}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          turmas: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'disciplinas' && (
                    <SubmodalDisciplinas
                      context={context}
                      editingSubject={editingStates.disciplinas}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          disciplinas: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'matriculas' && (
                    <SubmodalMatriculas
                      context={context}
                      editingEnrollment={editingStates.matriculas}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          matriculas: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'unidades' && (
                    <SubmodalUnidades
                      isOpen={true}
                      onClose={context.onClose}
                      editingId={editingStates.unidades}
                    />
                  )}
                  {tab.id === 'segmentos' && (
                    <SubmodalSegmentos
                      isOpen={true}
                      onClose={context.onClose}
                      editingId={editingStates.segmentos}
                    />
                  )}
                  {tab.id === 'series' && (
                    <SubmodalSeries
                      isOpen={true}
                      onClose={context.onClose}
                      editingId={editingStates.series}
                    />
                  )}
                  {tab.id === 'periodos' && (
                    <SubmodalPeriodos
                      isOpen={true}
                      onClose={context.onClose}
                      editingId={editingStates.periodos}
                    />
                  )}
                  {tab.id === 'visitantes' && (
                    <SubmodalVisitantes
                      isOpen={true}
                      onClose={context.onClose}
                      editingId={editingStates.visitantes}
                    />
                  )}
                  {tab.id === 'responsaveis' && (
                    <SubmodalResponsaveis
                      context={context}
                      editingGuardian={editingStates.responsaveis}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          responsaveis: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'documentos' && (
                    <SubmodalDocumentos
                      context={context}
                      editingDocument={editingStates.documentos}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          documentos: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'reservas' && (
                    <SubmodalReservas
                      context={context}
                      editingReserva={editingStates.reservas}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          reservas: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'solicitacoes' && (
                    <SubmodalSolicitacoes
                      context={context}
                      editingSolicitacao={editingStates.solicitacoes}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          solicitacoes: item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'ex-alunos' && (
                    <SubmodalExAlunos
                      context={context}
                      editingStudent={editingStates['ex-alunos']}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          'ex-alunos': item,
                        }));
                      }}
                    />
                  )}
                  {tab.id === 'rematricula' && (
                    <SubmodalRematricula
                      context={context}
                      editingReenrollment={editingStates.rematricula}
                      onEditingChange={(item) => {
                        setEditingStates(prev => ({
                          ...prev,
                          rematricula: item,
                        }));
                      }}
                    />
                  )}
                </Suspense>
              </TabsContent>
            );
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
