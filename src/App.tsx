import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";

import { AppShell } from '@/components/layout/AppShell';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PortalProtectedRoute from '@/components/portal/PortalProtectedRoute';
import { PortalLayout } from '@/components/portal/PortalLayout';
import RoutePerfObserver from '@/components/perf/RoutePerfObserver';

const Index = lazy(() => import('@/pages/Index'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Login = lazy(() => import('@/pages/auth/login'));
const Register = lazy(() => import('@/pages/auth/register'));
const Reset = lazy(() => import('@/pages/auth/reset'));
const Dashboard = lazy(() => import('@/pages/app/dashboard'));

// Portal Pages
const PortalLogin = lazy(() => import('@/pages/portal/login'));
const PortalDashboard = lazy(() => import('@/pages/portal/dashboard'));
const PortalFinanceiro = lazy(() => import('@/pages/portal/financeiro'));
const PortalDocumentos = lazy(() => import('@/pages/portal/documentos'));
const PortalInteracoes = lazy(() => import('@/pages/portal/interacoes'));
const PortalDemandas = lazy(() => import('@/pages/portal/demandas'));

import AlunosPage from '@/pages/app/alunos';
import TurmasPage from '@/pages/app/turmas';
import DisciplinasPage from '@/pages/app/disciplinas';
import MatriculasPage from '@/pages/app/matriculas';

import AcademicoPage from '@/pages/app/academico';
import ChamadaPage from '@/pages/app/academico/chamada';
import RelatorioCallPage from '@/pages/app/academico/chamada/relatorio';
import AvaliacoesPage from '@/pages/app/academico/avaliacoes';
import NotasPage from '@/pages/app/academico/notas';

import PedagogicoPage from '@/pages/app/pedagogico';
import EventosPage from '@/pages/app/eventos';

import SecretariaPage from '@/pages/app/secretaria';
import SecretariaAlunosPage from '@/pages/app/secretaria/alunos';
import SecretariaTurmasPage from '@/pages/app/secretaria/turmas';
import SecretariaDisciplinasPage from '@/pages/app/secretaria/disciplinas';
import SecretariaMatriculasPage from '@/pages/app/secretaria/matriculas';
import SecretariaVisitantesPage from '@/pages/app/secretaria/visitantes';
import SecretariaResponsaveisPage from '@/pages/app/secretaria/responsaveis';
import SecretariaResponsaveisListPage from '@/pages/app/secretaria/responsaveis/ListPage';
import SecretariaDocumentosPage from '@/pages/app/secretaria/documentos';
import SecretariaDocumentosListPage from '@/pages/app/secretaria/documentos/ListPage';
import SecretariaPeriodsPage from '@/pages/app/secretaria/periodos';
import SecretariaPeriodCalendarPage from '@/pages/app/secretaria/periodos/calendario';
import SecretariaSegmentsListPage from '@/pages/app/secretaria/segmentos/ListPage';
import SecretariaSeriesListPage from '@/pages/app/secretaria/series/ListPage';
import SecretariaUnitsListPage from '@/pages/app/secretaria/unidades/ListPage';
import SecretariaExAlunos from '@/pages/app/secretaria/ex-alunos';
import SecretariaExAlunosListPage from '@/pages/app/secretaria/ex-alunos/ListPage';
import SecretariaReservas from '@/pages/app/secretaria/reservas';
import SecretariaSolicitacoes from '@/pages/app/secretaria/solicitacoes';
import SecretariaRematriculaLote from '@/pages/app/secretaria/rematricula';
import SecretariaRematricula from '@/pages/app/secretaria/rematricula/ListPage';
import SecretariaContratoModelo from '@/pages/app/secretaria/contratos/modelo';

import ConfigIntegracoesPage from '@/pages/app/config/integracoes';
import OnboardingPage from '@/pages/app/onboarding';

import DevDiagnosticsPage from '@/pages/app/dev/diagnostics';
import CRMHub from '@/pages/app/crm';
import CRMLeads from '@/pages/app/crm/leads';
import CRMLeadDetail from '@/pages/app/crm/leads/[id]';
import CRMInteracoes from '@/pages/app/crm/interacoes';
import CRMDemandas from '@/pages/app/crm/demandas';
import CRMCampanhas from '@/pages/app/crm/campanhas';
import AssistenteIA from '@/pages/app/crm/assistente';

import BIHub from '@/pages/app/bi';
import BIAcademico from '@/pages/app/bi/academico';
import BIFinanceiro from '@/pages/app/bi/financeiro';
import BICRM from '@/pages/app/bi/crm';

function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Algo deu errado</h1>
        <p className="text-muted-foreground">Ocorreu um erro inesperado. Tente recarregar a página.</p>
      </div>
    </div>
  );
}


function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <RoutePerfObserver />
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando…</div>}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />
            <Route path="/auth/reset" element={<Reset />} />
            
            {/* Portal Routes */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route element={<PortalProtectedRoute />}>
              <Route element={<PortalLayout />}>
                <Route path="/portal" element={<PortalDashboard />} />
                <Route path="/portal/dashboard" element={<PortalDashboard />} />
                <Route path="/portal/financeiro" element={<PortalFinanceiro />} />
                <Route path="/portal/documentos" element={<PortalDocumentos />} />
                <Route path="/portal/interacoes" element={<PortalInteracoes />} />
                <Route path="/portal/demandas" element={<PortalDemandas />} />
              </Route>
            </Route>
            
            <Route path="/app" element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Dashboard />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* BI Routes */}
                <Route path="bi" element={<BIHub />} />
                <Route path="bi/academico" element={<BIAcademico />} />
                <Route path="bi/financeiro" element={<BIFinanceiro />} />
                <Route path="bi/crm" element={<BICRM />} />
                
                {/* CRM Routes */}
                <Route path="crm" element={<CRMHub />} />
                <Route path="crm/leads" element={<CRMLeads />} />
                <Route path="crm/leads/:id" element={<CRMLeadDetail />} />
                <Route path="crm/interacoes" element={<CRMInteracoes />} />
                <Route path="crm/demandas" element={<CRMDemandas />} />
                <Route path="crm/campanhas" element={<CRMCampanhas />} />
                <Route path="crm/assistente" element={<AssistenteIA />} />
                
                <Route path="alunos" element={<AlunosPage />} />
                <Route path="turmas" element={<TurmasPage />} />
                <Route path="disciplinas" element={<DisciplinasPage />} />
                <Route path="matriculas" element={<MatriculasPage />} />
                
                <Route path="academico" element={<AcademicoPage />} />
                <Route path="academico/chamada" element={<ChamadaPage />} />
                <Route path="academico/chamada/relatorio" element={<RelatorioCallPage />} />
                <Route path="academico/avaliacoes" element={<AvaliacoesPage />} />
                <Route path="academico/notas" element={<NotasPage />} />
                <Route path="academico/alunos" element={<AlunosPage />} />
                
                <Route path="pedagogico" element={<PedagogicoPage />} />
                <Route path="eventos" element={<EventosPage />} />
                
                <Route path="secretaria" element={<SecretariaPage />} />
                <Route path="secretaria/alunos" element={<SecretariaAlunosPage />} />
                <Route path="secretaria/turmas" element={<SecretariaTurmasPage />} />
                <Route path="secretaria/disciplinas" element={<SecretariaDisciplinasPage />} />
                <Route path="secretaria/matriculas" element={<SecretariaMatriculasPage />} />
                <Route path="secretaria/visitantes" element={<SecretariaVisitantesPage />} />
                <Route path="secretaria/responsaveis" element={<SecretariaResponsaveisPage />} />
                <Route path="secretaria/responsaveis/list" element={<SecretariaResponsaveisListPage />} />
                <Route path="secretaria/documentos" element={<SecretariaDocumentosPage />} />
                <Route path="secretaria/documentos/list" element={<SecretariaDocumentosListPage />} />
                <Route path="secretaria/periodos" element={<SecretariaPeriodsPage />} />
                <Route path="secretaria/periodos/:periodId/calendario" element={<SecretariaPeriodCalendarPage />} />
                <Route path="secretaria/contratos/modelo" element={<SecretariaContratoModelo />} />
                <Route path="secretaria/segmentos/list" element={<SecretariaSegmentsListPage />} />
                <Route path="secretaria/series/list" element={<SecretariaSeriesListPage />} />
                <Route path="secretaria/unidades/list" element={<SecretariaUnitsListPage />} />
                <Route path="secretaria/ex-alunos" element={<SecretariaExAlunos />} />
                <Route path="secretaria/ex-alunos/list" element={<SecretariaExAlunosListPage />} />
                <Route path="secretaria/reservas" element={<SecretariaReservas />} />
                <Route path="secretaria/solicitacoes" element={<SecretariaSolicitacoes />} />
                <Route path="secretaria/rematricula" element={<SecretariaRematricula />} />
                <Route path="secretaria/rematricula/lote" element={<SecretariaRematriculaLote />} />

                <Route path="config/integracoes" element={<ConfigIntegracoesPage />} />
                <Route path="onboarding" element={<OnboardingPage />} />
                <Route path="dev/diagnostics" element={<DevDiagnosticsPage />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Login />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
