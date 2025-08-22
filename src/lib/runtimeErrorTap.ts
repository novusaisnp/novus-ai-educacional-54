import { logger } from '@/lib/logger';

export function tapRuntimeErrors() {
  if (typeof window === 'undefined') return;
  
  const once = (type: 'error' | 'unhandledrejection', ev: any) => {
    try {
      const msg = type === 'error' ? ev?.error?.message || ev?.message : ev?.reason?.message || String(ev?.reason);
      const stack = type === 'error' ? ev?.error?.stack : ev?.reason?.stack;
      logger.error('[RUNTIME]', { type, msg, stack });
      console.error('[RUNTIME]', type, msg, stack);
    } catch {}
  };
  
  window.addEventListener('error', (e) => once('error', e));
  window.addEventListener('unhandledrejection', (e) => once('unhandledrejection', e));
}