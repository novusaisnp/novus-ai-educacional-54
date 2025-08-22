// Utilities específicas para notas

export const normalizeGradeInput = (value: string): number | undefined => {
  if (!value || value.trim() === '') return undefined;
  
  // Normalizar vírgula para ponto
  const normalized = value.replace(',', '.');
  const number = parseFloat(normalized);
  
  if (isNaN(number)) return undefined;
  
  // Clamp entre 0 e 10
  return Math.max(0, Math.min(10, number));
};

export const formatGrade = (grade: number | null | undefined): string => {
  if (grade == null) return '';
  return grade.toFixed(1);
};

export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

export const buildGradesMap = (grades: any[]): Record<string, number | undefined> => {
  const map: Record<string, number | undefined> = {};
  
  grades.forEach(grade => {
    const key = `${grade.student_id}:${grade.assessment_id}`;
    map[key] = grade.grade ?? undefined;
  });
  
  return map;
};

export const calculateWeightedAverage = (
  studentId: string, 
  assessments: any[], 
  gradesMap: Record<string, number | undefined>
): number | null => {
  let totalWeightedGrades = 0;
  let totalWeights = 0;
  
  assessments.forEach(assessment => {
    const key = `${studentId}:${assessment.id}`;
    const grade = gradesMap[key];
    
    if (grade != null) {
      totalWeightedGrades += grade * assessment.weight;
      totalWeights += assessment.weight;
    }
  });
  
  return totalWeights > 0 ? totalWeightedGrades / totalWeights : null;
};