
import React, { memo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GradesFiltersProps {
  selectedClass: string;
  selectedSubject: string;
  selectedAssessment: string;
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onAssessmentChange: (value: string) => void;
  classes: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  assessments: Array<{ id: string; title: string; date: string }>;
  isLoading?: boolean;
}

export const GradesFilters = memo(({
  selectedClass,
  selectedSubject,
  selectedAssessment,
  onClassChange,
  onSubjectChange,
  onAssessmentChange,
  classes,
  subjects,
  assessments,
  isLoading = false,
}: GradesFiltersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Turma</label>
            <Select value={selectedClass} onValueChange={onClassChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Disciplina</label>
            <Select value={selectedSubject} onValueChange={onSubjectChange} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma disciplina" />
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
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Avaliação</label>
            <Select 
              value={selectedAssessment} 
              onValueChange={onAssessmentChange} 
              disabled={isLoading || selectedSubject === 'all'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma avaliação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as avaliações</SelectItem>
                {assessments.map((assessment) => (
                  <SelectItem key={assessment.id} value={assessment.id}>
                    {assessment.title} - {new Date(`${assessment.date}T00:00:00`).toLocaleDateString('pt-BR')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

GradesFilters.displayName = 'GradesFilters';
