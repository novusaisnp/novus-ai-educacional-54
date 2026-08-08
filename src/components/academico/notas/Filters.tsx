import { memo } from 'react';
import { Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface FiltersProps {
  filters: {
    classId: string;
    subjectId: string;
    dateStart: string;
    dateEnd: string;
  };
  onFiltersChange: (filters: Partial<FiltersProps['filters']>) => void;
  classes: Array<{ id: string; name: string; grade: string }>;
  subjects: Array<{ id: string; name: string }>;
}

export const Filters = memo(({ filters, onFiltersChange, classes, subjects }: FiltersProps) => {
  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            value={filters.classId}
            onValueChange={(value) => onFiltersChange({ classId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma turma" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} - {cls.grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.subjectId || "all"}
            onValueChange={(value) => onFiltersChange({ subjectId: value === "all" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as disciplinas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as disciplinas</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            placeholder="Data inicial"
            value={filters.dateStart}
            onChange={(e) => onFiltersChange({ dateStart: e.target.value })}
          />

          <Input
            type="date"
            placeholder="Data final"
            value={filters.dateEnd}
            onChange={(e) => onFiltersChange({ dateEnd: e.target.value })}
          />
        </div>
      </CardContent>
    </Card>
  );
});

Filters.displayName = 'Filters';