
import { logAudit } from '@/lib/audit';
import { logger } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';

// Lista de campos PII que devem ser removidos (comparação por nome exato de campo)
const PII_FIELDS = new Set([
  'email', 'name', 'fullname', 'first_name', 'last_name',
  'phone', 'cpf', 'cnpj', 'rg', 'address', 'password',
  'token', 'secret', 'key', 'credential', 'search', 'hash', 'query'
]);

export function sanitizeAudit(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();

    // Remove campos PII conhecidos (match exato, não substring — evita falsos
    // positivos como "organizationId" (contém "rg") ou "pathname" (contém "name"))
    if (PII_FIELDS.has(lowerKey)) {
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
  // Sem organização não há como gravar audit_logs (organization_id é uma
  // coluna uuid NOT NULL) — pular silenciosamente em vez de tentar inserir
  // uma string vazia, o que sempre falha no banco.
  if (!organizationId) {
    return;
  }

  try {
    const cleanPayload = sanitizeAudit(payload);

    await logAudit({
      table_name: 'ui_events',
      action,
      diff: cleanPayload as Record<string, Json>,
      organization_id: organizationId,
    });
  } catch (error) {
    logger.error('Failed to log audit safely', {
      action,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
