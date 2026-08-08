import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { Json } from '@/integrations/supabase/types';

interface AuditLogPayload {
  table_name: string;
  action: string;
  diff: Record<string, Json>;
  organization_id: string;
  actor?: string;
  row_id?: string;
}

export const logAudit = async (payload: Omit<AuditLogPayload, 'actor'>) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        ...payload,
        actor: user.user?.id,
      });

    if (error) {
      logger.error('Erro ao registrar log de auditoria', { error: error.message });
    }
  } catch (error) {
    logger.error('Erro ao registrar log de auditoria', { error: error instanceof Error ? error.message : String(error) });
  }
};