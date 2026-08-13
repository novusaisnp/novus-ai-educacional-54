import type { StudentAttendanceRow } from '@/hooks/usePortalAcademic';

/**
 * Colunas DATE do Postgres voltam como 'YYYY-MM-DD'. `new Date('2026-08-12')`
 * é interpretado como UTC e, em UTC-3, imprime o dia anterior. O sufixo
 * 'T00:00:00' força interpretação local. Padrão já usado em todo o repo,
 * centralizado aqui pro app mobile não repetir o bug de fuso.
 */
export function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

export function formatDateBR(date?: string | null): string {
  if (!date) return '—';
  return parseDateOnly(date).toLocaleDateString('pt-BR');
}

/** Percentual de presença: presente + atraso + justificada contam como presença. */
export function attendancePercent(rows: Pick<StudentAttendanceRow, 'status'>[]): number {
  if (rows.length === 0) return 0;
  const present = rows.filter((r) => r.status !== 'falta').length;
  return (present / rows.length) * 100;
}
