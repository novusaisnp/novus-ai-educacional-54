import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

export const useClasses = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['classes', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('classes')
        .select('id, name, year, period_id, series:series_id(name), period:period_id(name)')
        .eq('organization_id', orgData.organization_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useSubjects = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['subjects', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('organization_id', orgData.organization_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useTeachers = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['teachers', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('organization_id', orgData.organization_id)
        .eq('role', 'professor')
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const usePeriods = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['periods', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('periods')
        .select('id, name, date_start, date_end, active, year')
        .eq('organization_id', orgData.organization_id)
        .eq('active', true)
        .order('date_start', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useAcademicTerms = (periodId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['academic_terms', orgData?.organization_id, periodId ?? null],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      let query = supabase
        .from('academic_terms')
        .select('id, name, term_number, date_start, date_end, period_id')
        .eq('organization_id', orgData.organization_id);

      if (periodId) {
        query = query.eq('period_id', periodId);
      }

      const { data, error } = await query.order('date_start');

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};