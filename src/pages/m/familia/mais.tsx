import { FileText, LogOut, User, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

// Financeiro, Documentos e Perfil moram aqui em vez de virar aba própria —
// são acessos ocasionais, não a jornada diária da família. Por enquanto abrem
// as telas do portal web (mesmo login, dentro do WebView).
const ITEMS = [
  { icon: Wallet, label: 'Financeiro', to: '/portal/financeiro' },
  { icon: FileText, label: 'Documentos', to: '/portal/documentos' },
  { icon: User, label: 'Meus dados', to: '/portal/dashboard' },
];

export default function MobileFamiliaMais() {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/portal/login', { replace: true });
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
            <span className="totem-teal grid h-11 w-11 place-items-center rounded-2xl">
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
