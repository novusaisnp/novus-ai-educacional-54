
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createAdminUser } from '@/utils/createAdminUser';
import { UserPlus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function DevUserCreator() {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleCreateUser = async () => {
    setIsCreating(true);
    setResult(null);

    try {
      const result = await createAdminUser();
      setResult(result);

      if (result.success) {
        toast({
          title: 'Sucesso!',
          description: result.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro ao configurar usuário',
          description: result.message,
        });
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: 'Ocorreu um erro inesperado ao configurar o usuário',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Configurar Usuário Desenvolvedor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Email:</strong> selftnt@gmail.com</p>
          <p><strong>Senha:</strong> 388030</p>
          <p><strong>Role:</strong> admin</p>
          <p className="text-xs mt-2 p-2 bg-blue-50 rounded">
            Este botão irá criar o usuário se ele não existir, ou verificar se já está configurado corretamente.
          </p>
        </div>

        <Button 
          onClick={handleCreateUser} 
          disabled={isCreating}
          className="w-full"
        >
          {isCreating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Configurando...
            </>
          ) : (
            'Configurar Usuário'
          )}
        </Button>

        {result && (
          <div className={`flex items-start gap-2 p-3 rounded-md text-sm ${
            result.success 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {result.success ? (
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{result.success ? 'Sucesso!' : 'Erro'}</p>
              <p className="mt-1">{result.message}</p>
              {result.success && (
                <p className="mt-2 text-xs">
                  Agora você pode fazer login com as credenciais acima.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
