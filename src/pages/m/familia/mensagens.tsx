import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { usePortalData } from '@/hooks/usePortalData';
import { cn } from '@/lib/utils';

/**
 * Thread única família <-> escola. Reusa `interactions` (entity_type='guardian'):
 * direction='outbound' é mensagem do responsável, 'inbound' é resposta da escola.
 */
export default function MobileFamiliaMensagens() {
  const { interactions, loading, createInteractionMutation } = usePortalData();
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Query vem desc (mais recente primeiro); thread lê melhor asc.
  const messages = [...(interactions ?? [])].reverse();

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = async () => {
    if (!text.trim()) return;
    await createInteractionMutation.mutateAsync({ channel: 'sistema', summary: text.trim() });
    setText('');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <MobileHeader title="Mensagens" />

      <div className="flex-1 space-y-3 p-4">
        {loading ? (
          <Skeleton className="h-20 rounded-3xl" />
        ) : messages.length === 0 ? (
          <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            Nenhuma mensagem ainda. Escreva pra secretaria abaixo.
          </p>
        ) : (
          messages.map((msg) => {
            const mine = msg.direction === 'outbound';
            return (
              <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-3xl px-4 py-2.5 text-sm shadow-card',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-card'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.summary}</p>
                  <p className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {new Date(msg.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div
        className="sticky bottom-0 flex items-end gap-2 border-t border-border/60 bg-card/95 p-3 backdrop-blur"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        <Textarea
          placeholder="Escreva para a escola…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={1}
          className="min-h-[44px] resize-none"
        />
        <Button size="icon" className="h-11 w-11 shrink-0" disabled={!text.trim() || createInteractionMutation.isPending} onClick={send}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
