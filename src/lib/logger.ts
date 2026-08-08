
// Sistema de logging estruturado para substituir console.log
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  userId?: string;
  organizationId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private createLogEntry(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && level === 'debug') return false;
    return true;
  }

  private formatLog(entry: LogEntry): string {
    const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.createLogEntry('debug', message, context);
    if (this.isDevelopment) {
      console.debug(this.formatLog(entry));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    const entry = this.createLogEntry('info', message, context);
    if (this.isDevelopment) {
      console.info(this.formatLog(entry));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.createLogEntry('warn', message, context);
    console.warn(this.formatLog(entry));
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
    const entry = this.createLogEntry('error', message, context);
    console.error(this.formatLog(entry));
  }
}

export const logger = new Logger();
