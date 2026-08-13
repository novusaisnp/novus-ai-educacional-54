import { useEffect, useState } from 'react';
import { Camera, CheckCircle2, FileSignature, Megaphone, Vote } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import StudentSwitcher, { useSelectedStudent } from '@/components/mobile/StudentSwitcher';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAnnouncements,
  useMyAnnouncementResponses,
  useRespondAnnouncement,
  type Announcement,
} from '@/hooks/useAnnouncements';
import { getSignedUrl } from '@/lib/storage';

const TYPE_META = {
  aviso: { icon: Megaphone, totem: 'totem-teal', label: 'Aviso' },
  foto: { icon: Camera, totem: 'totem-gold', label: 'Foto' },
  autorizacao: { icon: FileSignature, totem: 'totem-coral', label: 'Autorização' },
  enquete: { icon: Vote, totem: 'totem-info', label: 'Enquete' },
} as const;

function PhotoStrip({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all(paths.map((p) => getSignedUrl('docs', p).catch(() => null)))
      .then((signed) => {
        if (active) setUrls(signed.filter((u): u is string => !!u));
      });
    return () => {
      active = false;
    };
  }, [paths]);

  if (urls.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
      {urls.map((url) => (
        <img key={url} src={url} alt="" className="h-40 w-40 shrink-0 snap-start rounded-2xl object-cover" />
      ))}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  answered,
}: {
  announcement: Announcement;
  answered?: { choice?: string; signerName?: string };
}) {
  const { student } = useSelectedStudent();
  const respond = useRespondAnnouncement();
  const meta = TYPE_META[announcement.type] ?? TYPE_META.aviso;
  const Icon = meta.icon;
  const photos = announcement.payload?.photos ?? [];
  const options = announcement.payload?.options ?? [];

  return (
    <article className="space-y-3 rounded-3xl bg-card p-4 shadow-card">
      <header className="flex items-start gap-3">
        <span className={`${meta.totem} grid h-11 w-11 shrink-0 place-items-center rounded-2xl`}>
          <Icon className="h-5 w-5 text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{announcement.title}</p>
          <p className="text-xs text-muted-foreground">
            {meta.label} · {new Date(announcement.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </header>

      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{announcement.body}</p>

      {announcement.type === 'foto' && photos.length > 0 && <PhotoStrip paths={photos} />}

      {announcement.type === 'autorizacao' &&
        (answered?.signerName ? (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Autorizado por {answered.signerName}
          </p>
        ) : (
          <Button
            className="w-full"
            disabled={respond.isPending}
            onClick={() =>
              respond.mutate({
                announcementId: announcement.id,
                studentId: student?.id,
                signText: `${announcement.title}\n\n${announcement.body}`,
              })
            }
          >
            Autorizar e assinar
          </Button>
        ))}

      {announcement.type === 'enquete' && options.length > 0 && (
        <div className="space-y-2">
          {options.map((option) => {
            const chosen = answered?.choice === option;
            return (
              <Button
                key={option}
                variant={chosen ? 'default' : 'outline'}
                className="w-full justify-start"
                disabled={respond.isPending}
                onClick={() =>
                  respond.mutate({ announcementId: announcement.id, studentId: student?.id, choice: option })
                }
              >
                {chosen && <CheckCircle2 className="mr-2 h-4 w-4" />}
                {option}
              </Button>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default function MobileFamiliaMural() {
  const { data: announcements = [], isLoading } = useAnnouncements();
  const { data: responses = [] } = useMyAnnouncementResponses();
  const byAnnouncement = new Map(responses.map((r) => [r.announcement_id, r.response]));

  return (
    <>
      <MobileHeader title="Mural" right={<StudentSwitcher />} />

      <div className="space-y-3 p-4">
        {isLoading ? (
          <>
            <Skeleton className="h-36 rounded-3xl" />
            <Skeleton className="h-36 rounded-3xl" />
          </>
        ) : announcements.length === 0 ? (
          <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            Nada publicado ainda. Avisos, fotos e autorizações da escola aparecem aqui.
          </p>
        ) : (
          announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} answered={byAnnouncement.get(a.id)} />
          ))
        )}
      </div>
    </>
  );
}
