import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

type AuditArgs = {
  organization_id: string;
  action: string;          // ex: 'open_chatbot', 'run_risk_analysis'
  table_name?: string;     // ex: 'ai_features'
  diff?: Record<string, any>;
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
  } catch (e: any) {
    logger.warn("logAudit failed", { message: e?.message });
  }
}