import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLinkedStudents, type LinkedStudent } from '@/hooks/usePortalAcademic';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SelectedStudentValue {
  students: LinkedStudent[];
  student: LinkedStudent | null;
  setStudentId: (id: string) => void;
}

const SelectedStudentContext = createContext<SelectedStudentValue>({
  students: [],
  student: null,
  setStudentId: () => {},
});

/** Filho selecionado, compartilhado por todas as telas da pele "família". */
export function SelectedStudentProvider({ children }: { children: ReactNode }) {
  const { data: students = [] } = useLinkedStudents();
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId && students.length > 0) setStudentId(students[0].id);
  }, [students, studentId]);

  const student = students.find((s) => s.id === studentId) ?? null;

  return (
    <SelectedStudentContext.Provider value={{ students, student, setStudentId }}>
      {children}
    </SelectedStudentContext.Provider>
  );
}

export const useSelectedStudent = () => useContext(SelectedStudentContext);

/** Trocador de filho — só aparece quando o responsável tem mais de um. */
export default function StudentSwitcher() {
  const { students, student, setStudentId } = useSelectedStudent();

  if (!student) return null;

  // Primeiro nome também no caso de filho único — ele divide a barra do
  // cabeçalho com o título da tela, e o nome completo estourava a linha no
  // celular. O menu abaixo mostra o nome inteiro quando é preciso desambiguar.
  if (students.length < 2) {
    return <span className="text-sm text-muted-foreground">{student.first_name}</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground">
        {student.first_name}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {students.map((s) => (
          <DropdownMenuItem key={s.id} onClick={() => setStudentId(s.id)}>
            {`${s.first_name} ${s.last_name}`.trim()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
