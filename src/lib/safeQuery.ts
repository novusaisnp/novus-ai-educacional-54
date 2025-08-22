import { logger } from '@/lib/logger';

export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    logger.warn('safeQuery fallback', { message: e?.message });
    return fallback;
  }
}