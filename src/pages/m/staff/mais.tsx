import { GraduationCap, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Tudo que o staff faz sentado (secretaria, notas, relatórios) continua no
// desktop — aqui é só o atalho, não uma reimplementação.
const ITEMS = [
  { icon: LayoutDashboard, label: 'Painel completo', to: '/app/dashboard' },
  { icon: Users, label: 'Alunos', to: '/m/staff/alunos' },
  { icon: GraduationCap, label: 'Notas', to: '/app/academico/notas' },
];

export default function MobileStaffMais() {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/auth/login', { replace: true });
  };

  return (
    <>
      <MobileHeader title="Mais" />
      <div className="space-y-3 p-4">
        {ITEMS.map(({ icon: Icon, label, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left shadow-card"
          >
            <span className="totem-ink grid h-11 w-11 place-items-center rounded-2xl">
              <Icon className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}

        <Button variant="ghost" className="w-full text-destructive" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </>
  );
}
