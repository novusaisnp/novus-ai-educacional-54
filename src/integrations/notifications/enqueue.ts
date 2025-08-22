
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit/logAudit";
import { buildPortalLink, DeepLink } from "./deeplinks";
import type { NotificationQueueInsert, NotificationDeliveriesInsert } from "@/integrations/supabase/db-types";

// Tipos simples para uso no app
export type NotificationChannel = "email" | "whatsapp";

export type EnqueueArgs = {
  organization_id: string;
  channel: NotificationChannel;
  event_type: string;
  recipient: string; // email ou E.164
  payload: Record<string, any>;
  template_id?: string;
};

// Util para construir link do Portal e injetar em payload
export function withDeepLink(
  payload: Record<string, any>,
  link: DeepLink
): Record<string, any> {
  return { ...payload, link: buildPortalLink(link) };
}

// Busca usuário atual (para performed_by)
async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Inserir delivery diretamente (permitido pela policy de INSERT com WITH CHECK)
async function insertSkippedDelivery(orgId: string, queueId: string, reason: string) {
  const deliveryData: NotificationDeliveriesInsert = {
    organization_id: orgId,
    queue_id: queueId,
    status: "skipped",
    details: { reason },
  };

  const { error } = await supabase.from("notification_deliveries").insert(deliveryData);
  if (error) {
    logger.warn("insertSkippedDelivery failed", { message: error.message });
  }
}

async function insertInteractionIfPossible(args: {
  organization_id: string;
  channel: NotificationChannel;
  summary: string;
  performed_by?: string | null;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, any>;
}) {
  const { organization_id, channel, summary, performed_by, entity_type, entity_id, payload } = args;
  if (!performed_by) return;

  const { error } = await supabase.from("interactions").insert({
    organization_id,
    channel,
    direction: "outbound",
    entity_type: entity_type ?? payload?.owner_type ?? "guardian",
    entity_id: entity_id ?? payload?.owner_id ?? null,
    summary,
    performed_by,
    payload: payload ?? {},
  });
  if (error) {
    logger.warn("insertInteractionIfPossible failed", { message: error.message });
  }
}

// Função principal: enfileira respeitando config local (email/whatsapp enabled)
export async function enqueueNotification(args: EnqueueArgs) {
  const { organization_id, channel, event_type, recipient, payload, template_id } = args;

  const performed_by = await getCurrentUserId();
  const enrichedPayload = { ...payload, performed_by };

  // Ler config local por org (via hook fora de React: replicamos leitura simples)
  let channelEnabled = true;
  try {
    const raw = localStorage.getItem(`notifications:${organization_id}`);
    const cfg = raw ? JSON.parse(raw) : { enabled: { email: false, whatsapp: false } };
    channelEnabled = Boolean(cfg?.enabled?.[channel]);
  } catch {
    channelEnabled = true;
  }

  // Se canal desabilitado localmente: marcar como skipped imediatamente
  if (!channelEnabled) {
    const queueData: NotificationQueueInsert = {
      organization_id,
      channel,
      event_type,
      recipient,
      payload: enrichedPayload,
      template_id: template_id ?? null,
      status: "skipped",
      error: "canal_desabilitado_org",
      scheduled_for: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("notification_queue")
      .insert(queueData)
      .select("*")
      .maybeSingle();

    if (error) {
      logger.warn("enqueueNotification (skipped) failed", { message: error.message });
      throw error;
    }

    if (data?.id) {
      await insertSkippedDelivery(organization_id, data.id, "channel_disabled");
      await insertInteractionIfPossible({
        organization_id,
        channel,
        summary: `Notificação não enviada (canal desabilitado) — ${event_type}`,
        performed_by,
        payload: enrichedPayload,
      });
      await logAudit({
        organization_id,
        action: "notification_skipped",
        table_name: "notification_queue",
        diff: { queue_id: data.id, reason: "channel_disabled", event_type, channel },
      });
    }
    return { queued: false, skipped: true, id: data?.id ?? null };
  }

  // Canal habilitado: enfileirar como queued
  const queueData: NotificationQueueInsert = {
    organization_id,
    channel,
    event_type,
    recipient,
    payload: enrichedPayload,
    template_id: template_id ?? null,
    status: "queued",
    scheduled_for: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("notification_queue")
    .insert(queueData)
    .select("*")
    .maybeSingle();

  if (error) {
    logger.warn("enqueueNotification failed", { message: error.message });
    await logAudit({
      organization_id,
      action: "notification_enqueue_failed",
      table_name: "notification_queue",
      diff: { event_type, channel, error: error.message },
    });
    throw error;
  }

  await logAudit({
    organization_id,
    action: "notification_enqueued",
    table_name: "notification_queue",
    diff: { queue_id: data?.id, event_type, channel },
  });

  return { queued: true, skipped: false, id: data?.id ?? null };
}
