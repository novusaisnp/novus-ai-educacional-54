import { describe, it, expect } from 'vitest';
import { attendancePercent, formatDateBR, parseDateOnly } from '@/lib/mobile/utils';

describe('mobile utils', () => {
  it('lê coluna DATE no fuso local, não em UTC', () => {
    expect(parseDateOnly('2026-08-12').getDate()).toBe(12);
    expect(formatDateBR('2026-08-12')).toBe('12/08/2026');
    expect(formatDateBR(null)).toBe('—');
  });

  it('conta atraso e justificada como presença', () => {
    expect(attendancePercent([])).toBe(0);
    expect(
      attendancePercent([
        { status: 'presente' },
        { status: 'atraso' },
        { status: 'justificada' },
        { status: 'falta' },
      ])
    ).toBe(75);
  });
});
