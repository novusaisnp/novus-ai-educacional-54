import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
        .select('id, name, year, period_id, room_id, series:series_id(name), period:period_id(name), room:room_id(name)')
        .eq('organization_id', orgData.organization_id)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!orgData?.organization_id,
  });
};

export const useClassrooms = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['classrooms', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, code, type, capacity, building')
        .eq('organization_id', orgData.organization_id)
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data || [];
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

export const useTimeSlots = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['time_slots', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('time_slots')
        .select('id, day_of_week, start_time, end_time')
        .eq('organization_id', orgData.organization_id)
        .order('day_of_week, start_time');

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgData?.organization_id,
  });
};

// Lista completa (inclui inativas) pra tela de cadastro -- useClassrooms acima é
// enxuto de propósito (só ativas, colunas mínimas) pro seletor de currículo/turma,
// não mexido pra não regredir curriculo.tsx/SubmodalTurmas.tsx.
export const useClassroomsAdmin = () => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['classrooms_admin', orgData?.organization_id],
    queryFn: async () => {
      if (!orgData?.organization_id) return [];

      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, code, type, capacity, building, resources, active')
        .eq('organization_id', orgData.organization_id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgData?.organization_id,
  });
};

export interface ClassroomFormInput {
  id?: string;
  name: string;
  code?: string | null;
  type: 'classroom' | 'lab' | 'auditorium' | 'library' | 'other';
  capacity?: number | null;
  building?: string | null;
  resources?: string[];
  active: boolean;
}

export const useUpsertClassroom = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ClassroomFormInput) => {
      if (!orgData?.organization_id) throw new Error('Organização não encontrada');

      const payload = {
        organization_id: orgData.organization_id,
        name: input.name,
        code: input.code || null,
        type: input.type,
        capacity: input.capacity ?? null,
        building: input.building || null,
        resources: input.resources ?? [],
        active: input.active,
      };

      if (input.id) {
        const { error } = await supabase.from('classrooms').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('classrooms').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms_admin', orgData?.organization_id] });
      queryClient.invalidateQueries({ queryKey: ['classrooms', orgData?.organization_id] });
    },
  });
};

export interface TimeSlotFormInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export const useCreateTimeSlot = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TimeSlotFormInput) => {
      if (!orgData?.organization_id) throw new Error('Organização não encontrada');

      const { error } = await supabase.from('time_slots').insert({
        organization_id: orgData.organization_id,
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_slots', orgData?.organization_id] });
    },
  });
};

export const useDeleteTimeSlot = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_slots', orgData?.organization_id] });
    },
  });
};