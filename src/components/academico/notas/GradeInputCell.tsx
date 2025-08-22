
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useUpsertGrade } from '@/hooks/useGrades';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface GradeInputCellProps {
  assessmentId: string;
  studentId: string;
  initialGrade?: number;
  initialComments?: string;
  disabled?: boolean;
}

export const GradeInputCell: React.FC<GradeInputCellProps> = ({
  assessmentId,
  studentId,
  initialGrade,
  initialComments,
  disabled = false,
}) => {
  const [grade, setGrade] = useState(initialGrade?.toString() || '');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const upsertGrade = useUpsertGrade();
  const debounceRef = useRef<NodeJS.Timeout>();
  // Guarda o último valor salvo para idempotência
  const lastSavedRef = useRef<number | null>(initialGrade ?? null);

  // Atualiza referência quando o valor inicial muda por invalidação de cache
  useEffect(() => {
    lastSavedRef.current = initialGrade ?? null;
    // Não setamos state aqui para evitar flicker; input mantém o valor já digitado
  }, [initialGrade]);

  // Normalizar entrada: trocar vírgula por ponto
  const normalizeGrade = useCallback((value: string): string => {
    return value.replace(',', '.');
  }, []);

  // Validar nota (0-10)
  const validateGrade = useCallback((value: string): number | null => {
    if (!value.trim()) return null;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return null;
    return Math.max(0, Math.min(10, numValue));
  }, []);

  // Debounced save com idempotência
  const debouncedSave = useCallback((gradeValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const validatedGrade = validateGrade(gradeValue);

      // Idempotência: só salvar se valor mudou em relação ao último salvo
      const last = lastSavedRef.current;
      const comparable = validatedGrade ?? null;
      if (last === comparable) {
        logger.debug?.('Ignorando save idêntico', { studentId, assessmentId, grade: comparable });
        return;
      }

      upsertGrade.mutate(
        {
          assessment_id: assessmentId,
          student_id: studentId,
          grade: validatedGrade ?? undefined,
          comments: initialComments,
        },
        {
          onSuccess: (data) => {
            lastSavedRef.current = data.grade ?? null;
          },
          onError: (error: any) => {
            toast({
              variant: 'destructive',
              title: 'Erro ao salvar nota',
              description: error.message,
            });
            // Reverter valor em caso de erro
            setGrade(initialGrade?.toString() || '');
          },
        }
      );
    }, 300);
  }, [assessmentId, studentId, initialComments, upsertGrade, toast, validateGrade]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalizedValue = normalizeGrade(e.target.value);
      setGrade(normalizedValue);
    },
    [normalizeGrade]
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);

    const validatedGrade = validateGrade(grade);
    if (validatedGrade !== null) {
      setGrade(validatedGrade.toString());
    }

    debouncedSave(grade);
  }, [grade, validateGrade, debouncedSave]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }, []);

  // Cleanup debounce ao desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const cellClassName = `
    w-20 text-center
    ${upsertGrade.isPending ? 'opacity-50' : ''}
    ${isEditing ? 'ring-2 ring-primary' : ''}
  `.trim();

  return (
    <Input
      type="text"
      value={grade}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      disabled={disabled || upsertGrade.isPending}
      className={cellClassName}
      placeholder="0,0"
      maxLength={4}
    />
  );
};
