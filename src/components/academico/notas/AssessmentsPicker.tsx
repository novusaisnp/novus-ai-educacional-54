import { memo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface AssessmentsPickerProps {
  assessments: any[];
  selectedAssessmentIds: string[];
  onSelectionChange: (assessmentId: string, checked: boolean) => void;
}

export const AssessmentsPicker = memo(({ 
  assessments, 
  selectedAssessmentIds, 
  onSelectionChange 
}: AssessmentsPickerProps) => {
  if (!assessments.length) return null;

  return (
    <Card className="no-print">
      <CardHeader>
        <CardTitle>Selecionar Avaliações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {assessments.map((assessment) => (
            <div key={assessment.id} className="flex items-center space-x-2">
              <Checkbox
                id={assessment.id}
                checked={selectedAssessmentIds.includes(assessment.id)}
                onCheckedChange={(checked) => 
                  onSelectionChange(assessment.id, checked as boolean)
                }
              />
              <label
                htmlFor={assessment.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {assessment.title} - {format(new Date(assessment.date), 'dd/MM/yyyy')} 
                <Badge variant="outline" className="ml-2">
                  Peso {assessment.weight}
                </Badge>
              </label>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

AssessmentsPicker.displayName = 'AssessmentsPicker';