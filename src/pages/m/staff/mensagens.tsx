import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Send } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  entity_id: string;
  direction: string;
  summary: string;
  created_at: string;
  read_at: string | null;
}

// Todas as conversas com responsáveis da organização, de uma query só —
// agrupar no cliente é mais barato que N queries por responsável, e o volume
// (mensagens de uma escola) cabe folgado.
const useGuardianThreads = () => {
  const { orgId } = useOrganization();

  return useQuery({
    queryKey: ['staff.guardian_threads', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interactions')
        .select('id, entity_id, direction, summary, created_at, read_at')
        .eq('entity_type', 'guardian')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const messages = (data || []) as unknown as Message[];

      const guardianIds = [...new Set(messages.map((m) => m.entity_id))];
      if (guardianIds.length === 0) return { messages, names: new Map<string, string>() };

      const { data: entities } = await supabase
        .from('entidades')
        .select('id, nome')
        .in('id', guardianIds);

      return {
        messages,
        names: new Map((entities || []).map((e) => [e.id, e.nome as string])),
      };
    },
    enabled: !!orgId,
  });
};

export default function MobileStaffMensagens() {
  const { orgId } = useOrganization();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const { data, isLoading } = useGuardianThreads();
  const [openGuardian, setOpenGuardian] = useState<string | null>(null);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const messages = data?.messages ?? [];
  const names = data?.names ?? new Map<string, string>();

  const reply = useMutation({
    mutationFn: async (summary: string) => {
      if (!orgId || !openGuardian) throw new Error('Organização não encontrada');
      const { error } = await supabase.from('interactions').insert({
        organization_id: orgId,
        entity_type: 'guardian',
        entity_id: openGuardian,
        direction: 'inbound',
        channel: 'sistema',
        summary,
        performed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff.guardian_threads'] }),
  });

  // Marca como lidas as mensagens do responsável ao abrir a conversa.
  useEffect(() => {
    if (!openGuardian) return;
    const unread = messages.filter((m) => m.entity_id === openGuardian && m.direction === 'outbound' && !m.read_at);
    if (unread.length === 0) return;
    supabase
      .from('interactions')
      .update({ read_at: new Date().toISOString() } as never)
      .in('id', unread.map((m) => m.id))
      .then(() => queryClient.invalidateQueries({ queryKey: ['staff.guardian_threads'] }));
  }, [openGuardian, messages, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [openGuardian, messages.length]);

  if (openGuardian) {
    const thread = messages.filter((m) => m.entity_id === openGuardian).reverse();

    const send = async () => {
      if (!text.trim()) return;
      await reply.mutateAsync(text.trim());
      setText('');
    };

    return (
      <div className="flex min-h-screen flex-col">
        <MobileHeader
          title={names.get(openGuardian) ?? 'Responsável'}
          right={
            <Button variant="ghost" size="sm" onClick={() => setOpenGuardian(null)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
          }
        />
        <div className="flex-1 space-y-3 p-4">
          {thread.map((msg) => {
            const fromSchool = msg.direction === 'inbound';
            return (
              <div key={msg.id} className={cn('flex', fromSchool ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-3xl px-4 py-2.5 text-sm shadow-card',
                    fromSchool ? 'bg-primary text-primary-foreground' : 'bg-card'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.summary}</p>
                  <p className={cn('mt-1 text-[10px]', fromSchool ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {new Date(msg.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
        <div
          className="sticky flex items-end gap-2 border-t border-border/60 bg-card/95 p-3 backdrop-blur"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
        >
          <Textarea
            placeholder="Responder…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            className="min-h-[44px] resize-none"
          />
          <Button size="icon" className="h-11 w-11 shrink-0" disabled={!text.trim() || reply.isPending} onClick={send}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const guardianIds = [...new Set(messages.map((m) => m.entity_id))];

  return (
    <>
      <MobileHeader title="Mensagens" />
      <div className="space-y-3 p-4">
        {isLoading ? (
          <Skeleton className="h-20 rounded-3xl" />
        ) : guardianIds.length === 0 ? (
          <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            Nenhuma conversa ainda.
          </p>
        ) : (
          guardianIds.map((id) => {
            const last = messages.find((m) => m.entity_id === id)!;
            const unread = messages.filter((m) => m.entity_id === id && m.direction === 'outbound' && !m.read_at).length;
            return (
              <button
                key={id}
                onClick={() => setOpenGuardian(id)}
                className="flex w-full items-center gap-3 rounded-3xl bg-card p-4 text-left shadow-card"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{names.get(id) ?? 'Responsável'}</p>
                  <p className="truncate text-xs text-muted-foreground">{last.summary}</p>
                </div>
                {unread > 0 && (
                  <span className="totem-coral grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-semibold text-white">
                    {unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </>
  );
}
