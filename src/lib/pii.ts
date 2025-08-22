import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/**
 * Audita acesso a dados PII (Informações Pessoais Identificáveis)
 * Registra em audit_logs quando usuários autorizados acessam dados sensíveis
 */
export async function auditPII(entity: "guardians" | "profiles", entityId: string, columns: string[]) {
  try {
    await supabase.rpc("audit_pii_access", { 
      entity, 
      entity_id: entityId, 
      columns 
    });
    logger.info(`PII_ACCESS_LOGGED: ${entity}/${entityId}`, { columns });
  } catch (error) {
    logger.warn("auditPII_failed", { entity, entityId, columns, error });
  }
}