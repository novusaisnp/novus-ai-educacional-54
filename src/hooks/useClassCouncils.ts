import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';
import { finalizeClassCouncil } from '@/features/academico/lib/finalizeClassCouncil';

export type ClassCouncilStatus = 'rascunho' | 'concluida';
export type ClassCouncilDecision = 'aprovado' | 'progressao_parcial' | 'retido';

export interface ClassCouncil {
  id: string;
  class_id: string;
  term_id: string;
  status: ClassCouncilStatus;
  signer_name: string | null;
  finalized_at: string | null;
  document_id: string | null;
}

export interface ClassCouncilOpinion {
  id: string;
  class_council_id: string;
  student_id: string;
  opinion_text: string | null;
  decision: ClassCouncilDecision | null;
  students: { first_name: string; last_name: string } | null;
}

export const useClassCouncil = (classId?: string, termId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['class_council', orgData?.organization_id, classId ?? null, termId ?? null],
    queryFn: async (): Promise<ClassCouncil | null> => {
      if (!orgData?.organization_id || !classId || !termId) return null;

      const { data, error } = await supabase
        .from('class_councils')
        .select('id, class_id, term_id, status, signer_name, finalized_at, document_id')
        .eq('organization_id', orgData.organization_id)
        .eq('class_id', classId)
        .eq('term_id', termId)
        .maybeSingle();

      if (error) throw error;
      return data as ClassCouncil | null;
    },
    enabled: !!orgData?.organization_id && !!classId && !!termId,
  });
};

export const useClassCouncilOpinions = (classCouncilId?: string) => {
  const { data: orgData } = useOrganization();

  return useQuery({
    queryKey: ['class_council_opinions', orgData?.organization_id, classCouncilId ?? null],
    queryFn: async (): Promise<ClassCouncilOpinion[]> => {
      if (!orgData?.organization_id || !classCouncilId) return [];

      const { data, error } = await supabase
        .from('class_council_opinions')
        .select('id, class_council_id, student_id, opinion_text, decision, students(first_name, last_name)')
        .eq('organization_id', orgData.organization_id)
        .eq('class_council_id', classCouncilId);

      if (error) throw error;

      const rows = (data || []) as unknown as ClassCouncilOpinion[];
      return rows.sort((a, b) =>
        `${a.students?.first_name} ${a.students?.last_name}`.localeCompare(
          `${b.students?.first_name} ${b.students?.last_name}`
        )
      );
    },
    enabled: !!orgData?.organization_id && !!classCouncilId,
  });
};

export const useCreateClassCouncil = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ classId, termId, studentIds }: { classId: string; termId: string; studentIds: string[] }) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }
      const organizationId = orgData.organization_id;

      const { data: council, error: councilError } = await supabase
        .from('class_councils')
        .insert({ organization_id: organizationId, class_id: classId, term_id: termId })
        .select('id, class_id, term_id, status, signer_name, finalized_at, document_id')
        .single();
      if (councilError) throw councilError;

      if (studentIds.length > 0) {
        const { error: opinionsError } = await supabase.from('class_council_opinions').insert(
          studentIds.map((studentId) => ({
            organization_id: organizationId,
            class_council_id: council.id,
            student_id: studentId,
          }))
        );
        if (opinionsError) throw opinionsError;
      }

      return council as ClassCouncil;
    },
    onSuccess: (council) => {
      queryClient.invalidateQueries({ queryKey: ['class_council', orgData?.organization_id, council.class_id, council.term_id] });
      queryClient.invalidateQueries({ queryKey: ['class_council_opinions', orgData?.organization_id, council.id] });
      toast({ title: 'Ata de conselho de classe criada — preencha os pareceres.' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar ata',
        description: error.message,
      });
    },
  });
};

export const useUpdateClassCouncilOpinion = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      opinionId,
      classCouncilId,
      opinion_text,
      decision,
    }: {
      opinionId: string;
      classCouncilId: string;
      opinion_text?: string;
      decision?: ClassCouncilDecision | null;
    }) => {
      const payload: { opinion_text?: string; decision?: ClassCouncilDecision | null } = {};
      if (opinion_text !== undefined) payload.opinion_text = opinion_text;
      if (decision !== undefined) payload.decision = decision;

      const { error } = await supabase
        .from('class_council_opinions')
        .update(payload)
        .eq('id', opinionId)
        .eq('organization_id', orgData?.organization_id);

      if (error) throw error;
      return { classCouncilId };
    },
    onSuccess: ({ classCouncilId }) => {
      queryClient.invalidateQueries({ queryKey: ['class_council_opinions', orgData?.organization_id, classCouncilId] });
    },
  });
};

export const useFinalizeClassCouncil = () => {
  const { data: orgData } = useOrganization();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: Omit<Parameters<typeof finalizeClassCouncil>[0], 'orgId'>) => {
      if (!orgData?.organization_id) {
        throw new Error('Organização não encontrada');
      }
      return finalizeClassCouncil({ ...input, orgId: orgData.organization_id });
    },
    onSuccess: (council) => {
      queryClient.invalidateQueries({ queryKey: ['class_council'] });
      queryClient.invalidateQueries({ queryKey: ['class_council_opinions', orgData?.organization_id, council.id] });
      toast({ title: 'Ata finalizada e assinada com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar ata',
        description: error.message,
      });
    },
  });
};
