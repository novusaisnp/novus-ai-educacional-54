import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';
import MobileHeader from '@/components/mobile/MobileHeader';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useStudents } from '@/hooks/useStudents';
import { useStudentAvatars } from '@/hooks/useDocuments';

type Student = { id: string; first_name: string; last_name: string; status: string; document_id: string | null };

const initials = (student: Student) =>
  `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase();

/**
 * Consulta rápida de aluno no corredor: quem é, está ativo, e o link pra ficha
 * completa no desktop. Editar cadastro, prontuário e PEI continuam lá.
 *
 * ponytail: filtro em memória sobre a lista de alunos ativos que o
 * `useStudents` já carrega — nenhuma query nova, nenhum debounce. Se uma escola
 * passar de alguns milhares de alunos, virar `ilike` paginado no servidor.
 */
export default function MobileStaffAlunos() {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [selected, setSelected] = useState<Student | null>(null);

  const { data: students = [], isLoading } = useStudents();

  const results = useMemo(() => {
    const needle = term.trim().toLowerCase();
    const list = students as Student[];
    if (!needle) return list.slice(0, 30);
    return list.filter((student) =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(needle)
    );
  }, [students, term]);

  const { data: avatars = {} } = useStudentAvatars(results.map((student) => student.id));

  return (
    <>
      <MobileHeader title="Alunos" />

      <div className="space-y-3 p-4 pb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-12 pl-11"
            placeholder="Buscar aluno"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-20 rounded-3xl" />
        ) : results.length === 0 ? (
          <p className="rounded-3xl bg-card p-6 text-center text-sm text-muted-foreground shadow-card">
            Nenhum aluno encontrado.
          </p>
        ) : (
          results.map((student) => (
            <button
              key={student.id}
              type="button"
              onClick={() => setSelected(student)}
              className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left shadow-card active:scale-[0.99]"
            >
              {avatars[student.id] ? (
                <img src={avatars[student.id]} alt="" className="h-11 w-11 shrink-0 rounded-2xl object-cover" />
              ) : (
                <span className="totem-ink grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-display text-sm font-semibold text-white">
                  {initials(student)}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate font-medium">
                {student.first_name} {student.last_name}
              </span>
            </button>
          ))
        )}
      </div>

      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {selected?.first_name} {selected?.last_name}
            </DrawerTitle>
          </DrawerHeader>
          <div className="space-y-2 px-4 pb-8 text-sm">
            <p className="text-muted-foreground">
              Situação: <span className="text-foreground">{selected?.status}</span>
            </p>
            <p className="text-muted-foreground">
              Documento: <span className="text-foreground">{selected?.document_id || '—'}</span>
            </p>
            <Button
              variant="secondary"
              className="mt-2 h-11 w-full"
              onClick={() => navigate('/app/alunos')}
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir ficha completa
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
