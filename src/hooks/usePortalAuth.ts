import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface UsePortalAuthReturn {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isGuardian: boolean;
  guardian: any | null;
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
        .from('guardians')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) {
        console.error('Error fetching guardian:', error);
        return null;
      }

      return data;
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