import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/hooks/useSession';

interface OrgOption {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function SelectOrg() {
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSession();

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    (async () => {
      const { data: memberships } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id);

      const orgIds = (memberships ?? []).map((m) => m.organization_id);
      if (orgIds.length <= 1) {
        navigate('/app/dashboard');
        return;
      }

      const { data: orgRows } = await supabase
        .from('organizations')
        .select('id, name, logo_url')
        .in('id', orgIds);

      setOrgs(orgRows ?? []);
      setLoading(false);
    })();
  }, [user, navigate]);

  const handleSelect = async (orgId: string) => {
    setSwitching(orgId);
    const { error } = await supabase.rpc('switch_active_organization', { p_organization_id: orgId });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível trocar de unidade',
        description: error.message,
      });
      setSwitching(null);
      return;
    }

    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Escolha a unidade</CardTitle>
            <CardDescription>Sua conta tem acesso a mais de uma unidade — selecione com qual deseja trabalhar agora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <p className="text-sm text-muted-foreground">Carregando unidades...</p>}
            {!loading &&
              orgs.map((org) => (
                <Button
                  key={org.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  disabled={switching !== null}
                  onClick={() => handleSelect(org.id)}
                >
                  {org.logo_url && (
                    <img src={org.logo_url} alt="" className="h-8 w-8 object-contain mr-3 rounded" />
                  )}
                  <span>{switching === org.id ? 'Entrando...' : org.name}</span>
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
