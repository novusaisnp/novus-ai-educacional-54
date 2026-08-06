import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSession();

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
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
        navigate('/app/dashboard');
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

  return (
    <div className="min-h-screen flex">
      {/* Coluna do formulário — 1/3 da tela à ESQUERDA */}
      <div className="w-full lg:w-1/3 flex flex-col bg-background">
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              {/* Logo oficial NOVUS.AI Educacional */}
              <img src="/lovable-uploads/novus-ai-educacional-logo.png" alt="NOVUS.AI Educacional" className="mx-auto h-24 object-contain mb-8" />

              <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                Entre na sua conta
              </h2>
            </div>

            <Card>
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
                      placeholder="Senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
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
            </Card>
          </div>
        </div>

        {/* Rodapé da coluna — "Um produto NOVUS.AI" é atribuição à marca-mãe
            do ecossistema, não ao produto Educacional em si, por isso usa a
            logo da NOVUS.AI (não a Educacional do topo/2-3). A logo
            substitui a palavra "NOVUS.AI" na frase, não repete ao lado dela. */}
        <div className="py-6 border-t flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Um produto</span>
          <img src="/lovable-uploads/756ae602-1dc7-4970-aa18-8b7d0675b217.png" alt="NOVUS.AI" className="h-4 object-contain" />
        </div>
      </div>

      {/* Coluna da imagem — 2/3 da tela à DIREITA */}
      <div
        className="hidden lg:flex lg:w-2/3 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/lovable-uploads/login-background.jpg)'
        }}
      >
      </div>
    </div>
  );
}