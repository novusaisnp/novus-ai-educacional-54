
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { logAuditSafe } from '@/utils/auditSafe';
import { firstName } from '@/lib/utils';

/**
 * Pra onde o responsável vai depois de entrar.
 *
 * 1. A rota que ele tentou abrir antes de ser barrado (`PortalProtectedRoute`
 *    guarda em `state.from`). Sem isto, quem digitava /m/familia/* caía no
 *    portal e nunca mais voltava — o caminho de volta existia e era ignorado.
 * 2. Sem origem, decide pela largura da tela, não pela plataforma: no celular
 *    a pele certa é o app (/m), no desktop é o portal. `Capacitor.isNativePlatform()`
 *    não serve aqui — no Safari do iPhone é `false`, e iOS nativo não existe.
 */
function destinoAposLogin(state: unknown): string {
  const from = (state as { from?: string } | null)?.from;
  if (from) return from;
  return window.matchMedia('(max-width: 767px)').matches ? '/m/familia/inicio' : '/portal/dashboard';
}

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Log failed login attempt
        await logAuditSafe('portal_auth', {
          outcome: 'error',
          reason: 'invalid_credentials',
          pathname: window.location.pathname,
        });

        toast({
          title: 'Erro no login',
          description: 'Email ou senha incorretos.',
          variant: 'destructive',
        });
        return;
      }

      // Verify user is a guardian (papel RESPONSAVEL ativo em entidades)
      const { data: guardian } = await supabase
        .from('entidades')
        .select('id, name:nome, entidade_papeis!inner(papel)')
        .eq('user_id', data.user.id)
        .eq('entidade_papeis.papel', 'RESPONSAVEL')
        .eq('entidade_papeis.ativo', true)
        .single();

      if (!guardian) {
        await supabase.auth.signOut();
        
        await logAuditSafe('portal_auth', {
          outcome: 'error',
          reason: 'not_guardian',
          pathname: window.location.pathname,
        });

        toast({
          title: 'Acesso negado',
          description: 'Apenas responsáveis podem acessar o portal.',
          variant: 'destructive',
        });
        return;
      }

      // Log successful login
      await logAuditSafe('portal_auth', {
        outcome: 'success',
        guardianId: guardian.id,
        pathname: window.location.pathname,
      });

      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo(a), ${firstName(guardian.name)}!`,
      });

      navigate(destinoAposLogin(location.state), { replace: true });
    } catch {
      await logAuditSafe('portal_auth', {
        outcome: 'error',
        reason: 'system_error',
        pathname: window.location.pathname,
      });

      toast({
        title: 'Erro no sistema',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Portal dos Responsáveis</CardTitle>
          <CardDescription>
            Acesse sua conta para acompanhar o desenvolvimento educacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
