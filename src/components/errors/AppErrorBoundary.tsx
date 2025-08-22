
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logAuditSafe } from '@/utils/auditSafe';
import { logger } from '@/lib/logger';
import { ReactNode } from 'react';

// Helper to normalize unknown errors
function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(typeof e === 'string' ? e : JSON.stringify(e));
}

interface AppErrorBoundaryProps {
  children: ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const handleError = async (error: unknown, errorInfo: any) => {
    const normalizedError = toError(error);
    
    // Log para auditoria sem PII
    await logAuditSafe('ui_error', {
      message: normalizedError.message,
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'unknown',
      componentStack: errorInfo.componentStack?.substring(0, 500),
      timestamp: new Date().toISOString(),
    });

    logger.error('AppErrorBoundary caught error', {
      message: normalizedError.message,
      stack: normalizedError.stack,
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
