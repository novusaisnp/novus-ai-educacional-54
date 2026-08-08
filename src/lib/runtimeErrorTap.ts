import { logger } from '@/lib/logger';

export function tapRuntimeErrors() {
  if (typeof window === 'undefined') return;
  
  const once = (type: 'error' | 'unhandledrejection', ev: ErrorEvent | PromiseRejectionEvent) => {
    try {
      const err = type === 'error' ? (ev as ErrorEvent).error : (ev as PromiseRejectionEvent).reason;
      const msg = err?.message || (type === 'error' ? (ev as ErrorEvent).message : String(err));
      const stack = err?.stack;
      logger.error('[RUNTIME]', { type, msg, stack });
      console.error('[RUNTIME]', type, msg, stack);
    } catch { /* no-op */ }
  };
  
  window.addEventListener('error', (e) => once('error', e));
  window.addEventListener('unhandledrejection', (e) => once('unhandledrejection', e));
}