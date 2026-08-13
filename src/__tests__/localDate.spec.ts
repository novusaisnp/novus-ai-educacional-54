import { describe, it, expect } from 'vitest';
import { toLocalISODate } from '@/lib/utils';

describe('toLocalISODate', () => {
  it('mantém o dia local mesmo à noite (toISOString viraria o dia em UTC-3)', () => {
    expect(toLocalISODate(new Date(2026, 7, 12, 23, 30))).toBe('2026-08-12');
  });

  it('formata meia-noite local no próprio dia', () => {
    expect(toLocalISODate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
