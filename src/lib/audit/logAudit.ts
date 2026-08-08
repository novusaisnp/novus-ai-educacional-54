import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import type { Json } from "@/integrations/supabase/types";

type AuditArgs = {
  organization_id: string;
  action: string;          // ex: 'open_chatbot', 'run_risk_analysis'
  table_name?: string;     // ex: 'ai_features'
  diff?: Record<string, Json>;
};

export async function logAudit(args: AuditArgs) {
  try {
    const { error } = await supabase
      .from("audit_logs")
      .insert({
        organization_id: args.organization_id,
        table_name: args.table_name ?? "ai_features",
        action: args.action,
        diff: args.diff ?? {},
      });

    if (error) {
      logger.warn("logAudit failed", { message: error.message });
    }
  } catch (e) {
    logger.warn("logAudit failed", { message: e instanceof Error ? e.message : String(e) });
  }
}