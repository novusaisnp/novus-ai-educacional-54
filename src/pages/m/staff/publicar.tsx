import { useRef, useState } from 'react';
import { Camera, FileSignature, ImagePlus, Megaphone, Vote } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useOrganization } from '@/hooks/useOrganization';
import { useAnnouncements, useCreateAnnouncement, type AnnouncementType } from '@/hooks/useAnnouncements';
import { uploadAnnouncementPhoto } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const TYPES: { value: AnnouncementType; label: string; icon: typeof Megaphone }[] = [
  { value: 'aviso', label: 'Aviso', icon: Megaphone },
  { value: 'foto', label: 'Fotos', icon: Camera },
  { value: 'autorizacao', label: 'Autorização', icon: FileSignature },
  { value: 'enquete', label: 'Enquete', icon: Vote },
];

export default function MobileStaffPublicar() {
  const { orgId } = useOrganization();
  const create = useCreateAnnouncement();
  const { data: announcements = [] } = useAnnouncements(10);

  const [type, setType] = useState<AnnouncementType>('aviso');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [options, setOptions] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canPublish = title.trim() && body.trim() && !create.isPending && !uploading;

  const publish = async () => {
    const parsedOptions = options
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    const announcement = await create.mutateAsync({
      title: title.trim(),
      body: body.trim(),
      type,
      payload: type === 'enquete' ? { options: parsedOptions } : {},
    });

    // Fotos só depois do insert — o path do storage inclui o announcement_id.
    if (type === 'foto' && files.length > 0 && orgId) {
      setUploading(true);
      try {
        const uploaded = await Promise.all(
          files.map((file) => uploadAnnouncementPhoto(file, orgId, announcement.id))
        );
        await supabase
          .from('announcements')
          .update({ payload: { photos: uploaded.map((u) => u.path) } as never } as never)
          .eq('id', announcement.id);
      } finally {
        setUploading(false);
      }
    }

    setTitle('');
    setBody('');
    setOptions('');
    setFiles([]);
  };

  return (
    <>
      <MobileHeader title="Publicar" />

      <div className="space-y-5 p-4">
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-2xl p-3 text-[11px] font-medium transition-colors',
                type === value ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground shadow-card'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3 rounded-3xl bg-card p-4 shadow-card">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            placeholder={type === 'autorizacao' ? 'Texto do termo que a família vai assinar…' : 'Mensagem…'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
          />

          {type === 'enquete' && (
            <Textarea
              placeholder={'Opções, uma por linha\nSim\nNão'}
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              rows={3}
            />
          )}

          {type === 'foto' && (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                <ImagePlus className="mr-2 h-4 w-4" />
                {files.length > 0 ? `${files.length} foto(s) selecionada(s)` : 'Escolher fotos'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
            </>
          )}

          <Button className="w-full" disabled={!canPublish} onClick={publish}>
            {create.isPending || uploading ? 'Publicando…' : 'Publicar'}
          </Button>
        </div>

        <section className="space-y-2">
          <h2 className="font-display text-base font-semibold">Publicações recentes</h2>
          {announcements.map((a) => (
            <div key={a.id} className="rounded-3xl bg-card p-4 shadow-card">
              <p className="truncate text-sm font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">
                {a.type} · {new Date(a.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
