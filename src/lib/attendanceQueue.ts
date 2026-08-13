import { supabase } from '@/integrations/supabase/client';

export interface PendingAttendance {
  /** Momento da captura em sala — o professor precisa saber de quando é. */
  capturedAt: string;
  organizationId: string;
  classId: string;
  subjectId: string;
  date: string;
  rows: { student_id: string; status: string; note: string | null }[];
}

const KEY = 'novus.attendance.pending';

/**
 * Fila em disco das chamadas que ainda não subiram. O React Query já segura a
 * mutation enquanto o app está aberto, mas essa pausa vive em memória: fechar o
 * app antes de a rede voltar perdia a chamada. Aqui a lista sobrevive ao
 * fechamento e é reenviada no próximo boot com rede.
 *
 * O upsert é idempotente (UNIQUE class_id,subject_id,student_id,date), então
 * reenviar algo que já subiu não duplica nada — por isso a fila pode ser boba:
 * grava antes de tentar, remove quando o servidor confirma.
 */
export function readQueue(): PendingAttendance[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingAttendance[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingAttendance[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('attendance-queue-changed'));
}

/** Mesma chamada (turma+disciplina+dia) reenfileirada substitui a anterior. */
export function enqueue(item: PendingAttendance) {
  const rest = readQueue().filter((queued) => keyOf(queued) !== keyOf(item));
  writeQueue([...rest, item]);
}

export function dequeue(item: PendingAttendance) {
  writeQueue(readQueue().filter((queued) => keyOf(queued) !== keyOf(item)));
}

const keyOf = (item: PendingAttendance) => `${item.classId}|${item.subjectId}|${item.date}`;

export async function pushAttendance(item: PendingAttendance) {
  const { error } = await supabase.from('attendance').upsert(
    item.rows.map((row) => ({
      organization_id: item.organizationId,
      class_id: item.classId,
      subject_id: item.subjectId,
      date: item.date,
      ...row,
    })),
    // A UNIQUE real de public.attendance é (class_id, subject_id, student_id,
    // date) — SEM organization_id. Incluir coluna fora da constraint faz o
    // Postgres rejeitar com 400 (42P10). Não "melhorar" esta lista.
    { onConflict: 'class_id,subject_id,student_id,date' }
  );
  if (error) throw error;
}

/** Tenta subir tudo que está na fila. Erro de rede deixa o item para a próxima. */
export async function flushQueue(): Promise<number> {
  let sent = 0;
  for (const item of readQueue()) {
    try {
      await pushAttendance(item);
      dequeue(item);
      sent += 1;
    } catch {
      break;
    }
  }
  return sent;
}
