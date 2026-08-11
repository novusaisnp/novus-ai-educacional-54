import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { passwordSchema, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { IntroSplash, hasSeenIntro, markIntroSeen } from '@/components/IntroSplash';

const newPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSession();
  const [showIntro, setShowIntro] = useState(() => !hasSeenIntro());

  // Quando o login usa a senha temporária (e-mail nos dois campos) ou uma
  // senha resetada pelo admin, a conta fica pendente até definir uma senha
  // de verdade aqui mesmo — sem navegar pra outra rota.
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);

  const {
    register: registerNewPassword,
    handleSubmit: handleNewPasswordSubmit,
    formState: { errors: newPasswordErrors },
    reset: resetNewPasswordForm,
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  const finishIntro = () => {
    markIntroSeen();
    setShowIntro(false);
  };

  const redirectAfterAuth = async (userId: string) => {
    // Uma pessoa pode ter vínculo com mais de uma unidade (ex.: CEO multi-CNPJ) --
    // com 1 vínculo só, segue pro dashboard igual sempre foi; com mais de 1, o
    // seletor decide qual fica ativa antes de entrar no resto do app.
    const { count } = await supabase
      .from('user_organizations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    navigate((count ?? 0) > 1 ? '/auth/select-org' : '/app/dashboard');
  };

  // Decide o que fazer com uma sessão autenticada: checar senha_pendente
  // ANTES de navegar. Precisa estar aqui (reagindo a `user`), não dentro do
  // handleLogin — o listener onAuthStateChange (useSession) atualiza `user`
  // assim que signInWithPassword resolve, o que dispararia um redirect
  // imediato numa corrida contra a checagem assíncrona feita no handler.
  useEffect(() => {
    if (!user || needsPasswordSetup) return;
    let cancelled = false;

    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('senha_pendente')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (profile?.senha_pendente) {
        setNeedsPasswordSetup(true);
        return;
      }

      await redirectAfterAuth(user.id);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, needsPasswordSetup]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro no login',
          description: error.message
        });
      } else {
        toast({
          title: 'Login realizado com sucesso'
        });
        // Sucesso: o useEffect que observa `user` decide entre mostrar o
        // painel de definição de senha ou seguir pro app.
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const onSetNewPassword = async (data: NewPasswordFormData) => {
    setSettingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: data.newPassword });
      if (updateError) {
        toast({ variant: 'destructive', title: 'Erro ao definir senha', description: updateError.message });
        return;
      }

      const { error: rpcError } = await supabase.rpc('clear_senha_pendente');
      if (rpcError) {
        console.error('[Login] falha ao limpar senha_pendente:', rpcError.message);
      }

      toast({ title: 'Senha definida com sucesso!' });
      resetNewPasswordForm();
      if (user) await redirectAfterAuth(user.id);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado. Tente novamente.'
      });
    } finally {
      setSettingPassword(false);
    }
  };

  return (
    <>
      {showIntro && <IntroSplash onFinish={finishIntro} />}
      <div className="min-h-screen flex">
      {/* Coluna do formulário — 1/3 da tela à ESQUERDA */}
      <div className="w-full lg:w-[30%] flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              {/* Logo oficial NOVUS.AI Educacional */}
              <img src="/brand/novus-ai-educacional-logo.png" alt="NOVUS.AI Educacional" className="mx-auto h-24 object-contain mb-8" />

              <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                {needsPasswordSetup ? 'Cadastre sua senha' : 'Entre na sua conta'}
              </h2>
            </div>

            <Card>
              {needsPasswordSetup ? (
                <>
                  <CardHeader>
                    <CardTitle>Nova senha</CardTitle>
                    <CardDescription>Cadastre sua senha definitiva para continuar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleNewPasswordSubmit(onSetNewPassword)} className="space-y-4">
                      <div>
                        <Input
                          type="password"
                          placeholder="Nova senha"
                          {...registerNewPassword('newPassword')}
                        />
                        <p className="text-xs text-muted-foreground mt-1">{PASSWORD_POLICY_MESSAGE}</p>
                        {newPasswordErrors.newPassword && (
                          <p className="text-sm text-destructive mt-1">{newPasswordErrors.newPassword.message}</p>
                        )}
                      </div>
                      <div>
                        <Input
                          type="password"
                          placeholder="Confirme a nova senha"
                          {...registerNewPassword('confirmPassword')}
                        />
                        {newPasswordErrors.confirmPassword && (
                          <p className="text-sm text-destructive mt-1">{newPasswordErrors.confirmPassword.message}</p>
                        )}
                      </div>
                      <Button type="submit" className="w-full" disabled={settingPassword}>
                        {settingPassword ? 'Salvando...' : 'Definir senha'}
                      </Button>
                    </form>
                  </CardContent>
                </>
              ) : (
                <>
                  <CardHeader>
                    <CardTitle>Login</CardTitle>
                    <CardDescription>
                      Entre com suas credenciais para acessar o sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Input
                          type="email"
                          placeholder="Email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Input
                          type="password"
                          placeholder="Senha (primeiro acesso: use seu e-mail)"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <TurnstileWidget onVerify={setCaptchaToken} />
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                      </Button>
                    </form>

                    <div className="mt-4 text-center space-y-2">
                      <br />
                      <Link to="/auth/reset" className="text-sm text-primary hover:text-primary/80">
                        Esqueceu a senha?
                      </Link>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>
          </div>
        </div>

        {/* Rodapé da coluna — "Um produto NOVUS.AI" é atribuição à marca-mãe
            do ecossistema, não ao produto Educacional em si, por isso usa a
            logo da NOVUS.AI (não a Educacional do topo/2-3). A logo
            substitui a palavra "NOVUS.AI" na frase, não repete ao lado dela. */}
        <div className="py-6 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Um produto</span>
          <img src="/brand/novus-ai-logo.png" alt="NOVUS.AI" className="h-4 object-contain" />
        </div>
      </div>

      {/* Coluna da imagem — 2/3 da tela à DIREITA */}
      <div
        className="hidden lg:flex lg:w-[70%] bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/brand/login-background.jpg)'
        }}
      >
      </div>
      </div>
    </>
  );
}
