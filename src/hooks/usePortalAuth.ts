import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { GuardianRow } from '@/integrations/supabase/db-types';

type Guardian = GuardianRow;

interface UsePortalAuthReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuardian: boolean;
  guardian: Guardian | null;
}

export function usePortalAuth(): UsePortalAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Get guardian profile
  const { data: guardian, isLoading: guardianLoading } = useQuery({
    queryKey: ['guardian-profile', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data, error } = await supabase
        .from('entidades')
        .select('id, name:nome, cpf, email, phone:telefone, entidade_papeis!inner(dados_papel)')
        .eq('user_id', session.user.id)
        .eq('entidade_papeis.papel', 'RESPONSAVEL')
        .eq('entidade_papeis.ativo', true)
        .single();

      if (error) {
        console.error('Error fetching guardian:', error);
        return null;
      }

      const papel = Array.isArray(data.entidade_papeis) ? data.entidade_papeis[0] : data.entidade_papeis;
      const dadosPapel = (papel?.dados_papel ?? null) as { relationship?: string } | null;
      const { entidade_papeis, ...rest } = data;
      return { ...rest, relationship: dadosPapel?.relationship ?? null } as Guardian;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isGuardian = !!guardian;

  return {
    session,
    user: session?.user ?? null,
    loading: loading || guardianLoading,
    isGuardian,
    guardian,
  };
}