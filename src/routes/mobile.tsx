import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import {
  BookOpen,
  CalendarCheck,
  Home,
  LayoutGrid,
  MessageCircle,
  Megaphone,
  MoreHorizontal,
  Newspaper,
  Users,
} from 'lucide-react';
import MobileShell from '@/components/mobile/MobileShell';
import type { MobileTab } from '@/components/mobile/MobileTabBar';
import { SelectedStudentProvider } from '@/components/mobile/StudentSwitcher';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import PortalProtectedRoute from '@/components/portal/PortalProtectedRoute';

const OrgGate = lazy(() => import('@/components/auth/OrgGate'));
const MobileIndex = lazy(() => import('@/pages/m/index'));

const FamiliaInicio = lazy(() => import('@/pages/m/familia/inicio'));
const FamiliaAcademico = lazy(() => import('@/pages/m/familia/academico'));
const FamiliaMural = lazy(() => import('@/pages/m/familia/mural'));
const FamiliaMensagens = lazy(() => import('@/pages/m/familia/mensagens'));
const FamiliaMais = lazy(() => import('@/pages/m/familia/mais'));

const StaffChamada = lazy(() => import('@/pages/m/staff/chamada'));
const StaffPublicar = lazy(() => import('@/pages/m/staff/publicar'));
const StaffMensagens = lazy(() => import('@/pages/m/staff/mensagens'));
const StaffMais = lazy(() => import('@/pages/m/staff/mais'));

const FAMILIA_TABS: MobileTab[] = [
  { to: '/m/familia/inicio', label: 'Início', icon: Home },
  { to: '/m/familia/academico', label: 'Acadêmico', icon: BookOpen },
  { to: '/m/familia/mural', label: 'Mural', icon: Newspaper },
  { to: '/m/familia/mensagens', label: 'Mensagens', icon: MessageCircle },
  { to: '/m/familia/mais', label: 'Mais', icon: MoreHorizontal },
];

const STAFF_TABS: MobileTab[] = [
  { to: '/m/staff/chamada', label: 'Chamada', icon: CalendarCheck },
  { to: '/m/staff/publicar', label: 'Publicar', icon: Megaphone },
  { to: '/m/staff/mensagens', label: 'Mensagens', icon: MessageCircle },
  { to: '/m/staff/mais', label: 'Mais', icon: LayoutGrid },
];

/**
 * Subárvore /m/* do app mobile. O módulo inteiro é carregado sob demanda (é
 * `lazy` no App.tsx) e cada tela também: o chunk principal já tem ~2,2 MB por
 * imports eager, e o app nativo não pode baixar o sistema inteiro pra mostrar
 * um anel de frequência.
 *
 * Guards reusados, nenhum novo: família = PortalProtectedRoute,
 * staff = ProtectedRoute + OrgGate.
 */
export default function MobileRoutes() {
  return (
    <Routes>{mobileRoutes}</Routes>
  );
}

const mobileRoutes = (
  <Route path="/">
    <Route index element={<MobileIndex />} />

    <Route element={<PortalProtectedRoute />}>
      <Route
        path="familia"
        element={
          <SelectedStudentProvider>
            <MobileShell tabs={FAMILIA_TABS} />
          </SelectedStudentProvider>
        }
      >
        <Route index element={<FamiliaInicio />} />
        <Route path="inicio" element={<FamiliaInicio />} />
        <Route path="academico" element={<FamiliaAcademico />} />
        <Route path="mural" element={<FamiliaMural />} />
        <Route path="mensagens" element={<FamiliaMensagens />} />
        <Route path="mais" element={<FamiliaMais />} />
      </Route>
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<OrgGate />}>
        <Route path="staff" element={<MobileShell tabs={STAFF_TABS} />}>
          <Route index element={<StaffChamada />} />
          <Route path="chamada" element={<StaffChamada />} />
          <Route path="publicar" element={<StaffPublicar />} />
          <Route path="mensagens" element={<StaffMensagens />} />
          <Route path="mais" element={<StaffMais />} />
        </Route>
      </Route>
    </Route>
  </Route>
);
