import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/useSession';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

export default function Onboarding() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        toast({
          title: 'Sessão expirada',
          description: 'Faça login novamente para continuar.',
          variant: 'destructive',
        });
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/onboarding-create-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ organization_name: organizationName.trim() }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: 'Não foi possível criar a organização',
          description: result?.error || 'Tente novamente em instantes.',
          variant: 'destructive',
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['organization', user?.id] });
      toast({
        title: 'Organização criada',
        description: `"${organizationName.trim()}" foi criada e vinculada à sua conta.`,
      });
      navigate('/app/dashboard');
    } catch (error) {
      toast({
        title: 'Erro inesperado',
        description: 'Não foi possível criar a organização. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crie sua organização</CardTitle>
          <CardDescription>
            Sua conta ainda não está vinculada a nenhuma organização. Crie uma para
            começar a usar o sistema — você será o administrador dela.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization_name">Nome da organização</Label>
              <Input
                id="organization_name"
                placeholder="Ex: Colégio Exemplo"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting || !organizationName.trim()} className="w-full">
              {isSubmitting ? 'Criando...' : 'Criar organização'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
