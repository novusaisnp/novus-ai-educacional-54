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
