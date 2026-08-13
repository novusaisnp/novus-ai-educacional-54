import type { StudentAttendanceRow } from '@/hooks/usePortalAcademic';

// Moradia real em lib/utils: o portal web sofre do mesmo bug de fuso e não ia
// importar de uma pasta chamada 'mobile'. Reexportado aqui pelos consumidores
// que já apontavam pra cá.
export { parseDateOnly, formatDateBR } from '@/lib/utils';

/** Percentual de presença: presente + atraso + justificada contam como presença. */
export function attendancePercent(rows: Pick<StudentAttendanceRow, 'status'>[]): number {
  if (rows.length === 0) return 0;
  const present = rows.filter((r) => r.status !== 'falta').length;
  return (present / rows.length) * 100;
}
