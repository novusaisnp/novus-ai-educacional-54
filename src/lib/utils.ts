import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Data 'YYYY-MM-DD' no fuso local. `toISOString()` converte pra UTC e, em
 * UTC-3, joga tudo que é meia-noite local (ou depois das 21h) pro dia errado —
 * bug que já apareceu na chamada, no vencimento da 1ª mensalidade e nas datas
 * padrão de matrícula. 'en-CA' é o locale que formata ISO sem converter fuso.
 */
export function toLocalISODate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA');
}

/**
 * Colunas DATE do Postgres voltam como 'YYYY-MM-DD'. `new Date('2026-08-12')`
 * é interpretado como UTC e, em UTC-3, imprime o dia anterior. O sufixo
 * 'T00:00:00' força interpretação local.
 */
export function parseDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

/**
 * Primeiro nome, pra saudação. Nome completo em cabeçalho de boas-vindas fica
 * longo demais e quebra a linha no celular.
 */
export function firstName(name?: string | null): string {
  return name?.trim().split(/\s+/)[0] ?? '';
}

export function formatDateBR(date?: string | null): string {
  if (!date) return '—';
  return parseDateOnly(date).toLocaleDateString('pt-BR');
}
