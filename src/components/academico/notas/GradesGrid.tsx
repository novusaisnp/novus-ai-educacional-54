import { memo, useCallback } from 'react';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { normalizeGradeInput, formatGrade, calculateWeightedAverage } from '@/lib/utils/grades';

interface GradesGridStudent {
  id: string;
  first_name: string;
  last_name: string;
}

interface GradesGridAssessment {
  id: string;
  title: string;
  date: string;
  weight: number;
}

interface GradesGridProps {
  students: GradesGridStudent[];
  assessments: GradesGridAssessment[];
  gradesMap: Record<string, number | undefined>;
  onGradeChange: (studentId: string, assessmentId: string, value: number | undefined) => void;
  canEdit: boolean;
}

export const GradesGrid = memo(({ 
  students, 
  assessments, 
  gradesMap, 
  onGradeChange,
  canEdit 
}: GradesGridProps) => {
  const handleInputChange = useCallback((studentId: string, assessmentId: string, value: string) => {
    const normalizedValue = normalizeGradeInput(value);
    onGradeChange(studentId, assessmentId, normalizedValue);
  }, [onGradeChange]);

  const handleInputBlur = useCallback((studentId: string, assessmentId: string, value: string) => {
    // Commit final value on blur
    const normalizedValue = normalizeGradeInput(value);
    onGradeChange(studentId, assessmentId, normalizedValue);
  }, [onGradeChange]);

  if (!students.length || !assessments.length) return null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48">Nome do Aluno</TableHead>
            {assessments.map((assessment) => (
              <TableHead key={assessment.id} className="text-center min-w-24">
                <div className="space-y-1">
                  <div className="font-medium">{assessment.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(assessment.date), 'dd/MM')}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Peso {assessment.weight}
                  </Badge>
                </div>
              </TableHead>
            ))}
            <TableHead className="text-center min-w-24">
              <div className="font-medium">Média Ponderada</div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const weightedAvg = calculateWeightedAverage(student.id, assessments, gradesMap);
            const isLowAverage = weightedAvg !== null && weightedAvg < 6.0;
            
            return (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  {student.first_name} {student.last_name}
                </TableCell>
                {assessments.map((assessment) => {
                  const key = `${student.id}:${assessment.id}`;
                  const grade = gradesMap[key];
                  const isEmpty = grade == null;
                  
                  return (
                    <TableCell key={assessment.id} className="text-center">
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={formatGrade(grade)}
                        onChange={(e) => 
                          handleInputChange(student.id, assessment.id, e.target.value)
                        }
                        onBlur={(e) =>
                          handleInputBlur(student.id, assessment.id, e.target.value)
                        }
                        className={`w-20 text-center ${isEmpty ? 'bg-yellow-50 border-yellow-200' : ''}`}
                        placeholder="—"
                        disabled={!canEdit}
                      />
                    </TableCell>
                  );
                })}
                <TableCell className="text-center">
                  <Badge 
                    variant={isLowAverage ? "destructive" : "default"}
                    className="font-mono"
                  >
                    {weightedAvg !== null ? weightedAvg.toFixed(1) : '—'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
});

GradesGrid.displayName = 'GradesGrid';