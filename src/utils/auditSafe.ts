
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Lista de campos PII que devem ser removidos
const PII_FIELDS = [
  'email', 'name', 'fullName', 'first_name', 'last_name', 
  'phone', 'cpf', 'cnpj', 'rg', 'address', 'password',
  'token', 'secret', 'key', 'credential', 'search', 'hash', 'query'
];

export function sanitizeAudit(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    
    // Remove campos PII conhecidos
    if (PII_FIELDS.some(pii => lowerKey.includes(pii))) {
      continue;
    }
    
    // Recursivamente sanitizar objetos aninhados
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeAudit(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeAudit(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export async function logAuditSafe(
  action: string, 
  payload?: unknown,
  organizationId?: string
) {
  try {
    const cleanPayload = sanitizeAudit(payload);
    
    await logAudit({
      table_name: 'ui_events',
      action,
      diff: cleanPayload,
      organization_id: organizationId || '', // Will be handled by RLS
    });
  } catch (error: any) {
    logger.error('Failed to log audit safely', { 
      action, 
      error: error?.message 
    });
  }
}
