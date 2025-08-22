
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logAuditSafe } from '@/utils/auditSafe';
import { logger } from '@/lib/logger';
import { ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const handleError = async (error: Error, errorInfo: any) => {
    // Log para auditoria sem PII
    await logAuditSafe('ui_error', {
      message: error.message,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent.substring(0, 100), // Truncate for safety
      componentStack: errorInfo.componentStack?.substring(0, 500),
      timestamp: new Date().toISOString(),
    });

    logger.error('AppErrorBoundary caught error', {
      message: error.message,
      stack: error.stack,
      pathname: window.location.pathname,
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      {children}
    </ErrorBoundary>
  );
}
