import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';
import { DevUserCreator } from '@/components/DevUserCreator';
import { runDiagnostics } from '@/utils/runDiagnostics';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDevCreator, setShowDevCreator] = useState(false);
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
      {/* Seção do formulário - 1/3 da tela à ESQUERDA */}
      <div className="w-full lg:w-1/3 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            {/* Logo oficial NOVUS.AI */}
            <img src="/lovable-uploads/ccf5664a-144a-43dd-a5bc-c8b8afa55c11.png" alt="NOVUS.AI" className="mx-auto h-20 object-contain mb-8" />
            
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
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
                <Link to="/auth/reset" className="text-sm text-blue-600 hover:text-blue-500">
                  Esqueceu a senha?
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Seção de desenvolvimento */}
          <div className="text-center">
          </div>

          {showDevCreator && (
            <div className="space-y-4">
              <DevUserCreator />
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={async () => {
                  console.log('Executando diagnóstico...');
                  await runDiagnostics();
                }} 
                className="w-full"
              >
                🔧 Executar Diagnóstico Completo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Seção da imagem - 2/3 da tela à DIREITA com background */}
      <div 
        className="hidden lg:flex lg:w-2/3 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/lovable-uploads/822107e7-76df-4c9d-9b2a-5787d2c0b779.png)'
        }}
      >
      </div>
    </div>
  );
}