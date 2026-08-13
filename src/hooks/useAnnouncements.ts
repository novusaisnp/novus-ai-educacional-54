import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useSession } from './useSession';
import { usePortalAuth } from './usePortalAuth';
import { useToast } from './use-toast';
import { hashContractText } from '@/features/secretaria/lib/enrollmentContractTemplate';
import type { AnnouncementRow } from '@/integrations/supabase/db-types';

export type AnnouncementType = 'aviso' | 'foto' | 'autorizacao' | 'enquete';

export interface AnnouncementPayload {
  /** enquete */
  options?: string[];
  /** foto: paths no bucket docs (via documents.owner_type='announcement') */
  photos?: string[];
  /** autorizacao: data/local do evento, texto do termo */
  deadline?: string;
}

export type Announcement = AnnouncementRow & {
  type: AnnouncementType;
  payload: AnnouncementPayload;
};

/**
 * Query única do mural — a mesma estava duplicada inline em
 * `pages/app/mural.tsx` e `pages/portal/dashboard.tsx`. RLS já corta por
 * organização (staff via current_org_id, guardian via current_guardian_org_id),
 * então não precisa de filtro explícito aqui.
 */
export const useAnnouncements = (limit?: number) => {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['announcements', orgId, limit],
    queryFn: async (): Promise<Announcement[]> => {
      let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Announcement[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateAnnouncement = () => {
  const { orgId } = useOrganization();
  const { user } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      title: string;
      body: string;
      type: AnnouncementType;
      payload?: AnnouncementPayload;
    }) => {
      if (!orgId) throw new Error('Organização não encontrada');

      const { data, error } = await supabase
        .from('announcements')
        .insert([
          {
            organization_id: orgId,
            title: input.title,
            body: input.body,
            type: input.type,
            payload: (input.payload ?? {}) as never,
            created_by: user?.id,
          } as never,
        ])
        .select('id')
        .single();

      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast({ title: 'Publicado' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao publicar', description: error.message });
    },
  });
};

export interface AnnouncementResponse {
  id: string;
  announcement_id: string;
  guardian_id: string;
  response: { choice?: string; signerName?: string; hash?: string };
  signed_at: string | null;
}

/** Respostas do responsável logado (autorização assinada / voto em enquete). */
export const useMyAnnouncementResponses = () => {
  const { guardian } = usePortalAuth();

  return useQuery({
    queryKey: ['announcement_responses', guardian?.id],
    queryFn: async (): Promise<AnnouncementResponse[]> => {
      if (!guardian?.id) return [];
      const { data, error } = await supabase
        .from('announcement_responses')
        .select('id, announcement_id, guardian_id, response, signed_at')
        .eq('guardian_id', guardian.id);

      if (error) throw error;
      return (data || []) as unknown as AnnouncementResponse[];
    },
    enabled: !!guardian?.id,
  });
};

/**
 * Responde um post do mural. Serve enquete (choice) e autorização (assinatura:
 * nome do signatário + hash SHA-256 do texto autorizado, mesmo mecanismo do
 * contrato de matrícula — o que foi assinado fica provável depois).
 */
export const useRespondAnnouncement = () => {
  const { guardian } = usePortalAuth();
  const { orgId } = useOrganization();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      announcementId: string;
      studentId?: string;
      choice?: string;
      signText?: string;
    }) => {
      if (!guardian?.id || !orgId) throw new Error('Responsável ou organização não encontrada');

      const response: AnnouncementResponse['response'] = {};
      if (input.choice) response.choice = input.choice;
      if (input.signText) {
        response.signerName = guardian.name ?? '';
        response.hash = await hashContractText(input.signText);
      }

      const { error } = await supabase.from('announcement_responses').upsert(
        {
          organization_id: orgId,
          announcement_id: input.announcementId,
          guardian_id: guardian.id,
          student_id: input.studentId ?? null,
          response: response as never,
          signed_at: input.signText ? new Date().toISOString() : null,
        } as never,
        // bate exatamente com announcement_responses_unique (ver migration)
        { onConflict: 'announcement_id,guardian_id' }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcement_responses'] });
      toast({ title: 'Resposta enviada' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao responder', description: error.message });
    },
  });
};
