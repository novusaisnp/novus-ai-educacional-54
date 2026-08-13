import { describe, it, expect, beforeEach, vi } from 'vitest';

const upsert = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ upsert }) },
}));

import { enqueue, dequeue, readQueue, flushQueue, type PendingAttendance } from '@/lib/attendanceQueue';

const item = (date: string): PendingAttendance => ({
  capturedAt: '2026-08-12T23:00:00.000Z',
  organizationId: 'org',
  classId: 'turma',
  subjectId: 'disciplina',
  date,
  rows: [{ student_id: 'aluno', status: 'presente', note: null }],
});

describe('fila de chamadas offline', () => {
  beforeEach(() => {
    localStorage.clear();
    upsert.mockReset();
  });

  it('reenfileirar a mesma chamada substitui em vez de duplicar', () => {
    enqueue(item('2026-08-12'));
    enqueue(item('2026-08-12'));
    enqueue(item('2026-08-13'));
    expect(readQueue()).toHaveLength(2);
  });

  it('mantém o item na fila quando o envio falha', async () => {
    upsert.mockResolvedValue({ error: new Error('offline') });
    enqueue(item('2026-08-12'));

    expect(await flushQueue()).toBe(0);
    expect(readQueue()).toHaveLength(1);
  });

  it('esvazia a fila quando o envio dá certo', async () => {
    upsert.mockResolvedValue({ error: null });
    enqueue(item('2026-08-12'));

    expect(await flushQueue()).toBe(1);
    expect(readQueue()).toHaveLength(0);
  });

  it('dequeue remove só a chamada correspondente', () => {
    enqueue(item('2026-08-12'));
    enqueue(item('2026-08-13'));
    dequeue(item('2026-08-12'));
    expect(readQueue().map((queued) => queued.date)).toEqual(['2026-08-13']);
  });
});
