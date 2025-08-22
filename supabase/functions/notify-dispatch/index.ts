
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

// CORS básico
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type QueueItem = {
  id: string;
  organization_id: string;
  channel: "email" | "whatsapp";
  event_type: string;
  recipient: string;
  payload: Record<string, any>;
  template_id: string | null;
  status: "queued" | "sending" | "sent" | "failed" | "skipped";
  error: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

type Template = {
  id: string;
  organization_id: string;
  channel: "email" | "whatsapp";
  event_type: string;
  name: string;
  version: number;
  subject: string | null;
  body_md: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
const whatsappApiUrl = Deno.env.get("WHATSAPP_API_URL") || "";
const whatsappApiToken = Deno.env.get("WHATSAPP_API_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const nowIso = () => new Date().toISOString();

function mergeTemplate(text: string, payload: Record<string, any>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = payload?.[key];
    return v !== undefined && v !== null ? String(v) : "";
  });
}

// Conversão simples de Markdown -> HTML (negrito, links e quebras de linha)
function mdToHtml(md: string): string {
  let html = md;
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\n/g, "<br/>");
  return html;
}

async function getActiveTemplateFor(item: QueueItem): Promise<Template | null> {
  if (item.template_id) {
    const { data, error } = await supabase
      .from("notification_templates")
      .select("*")
      .eq("id", item.template_id)
      .maybeSingle();
    if (error) {
      console.warn("getActiveTemplateFor error by id", error.message);
      return null;
    }
    return data as Template | null;
  }
  const { data, error } = await supabase
    .from("notification_templates")
    .select("*")
    .eq("organization_id", item.organization_id)
    .eq("channel", item.channel)
    .eq("event_type", item.event_type)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1);
  if (error) {
    console.warn("getActiveTemplateFor error", error.message);
    return null;
  }
  return (data?.[0] as Template) || null;
}

async function checkConsent(orgId: string, channel: "email" | "whatsapp", payload: Record<string, any>): Promise<boolean> {
  // Espera-se que o produtor informe owner_type e owner_id no payload para validação LGPD.
  const owner_type = payload?.owner_type as "guardian" | "staff" | undefined;
  const owner_id = payload?.owner_id as string | undefined;

  if (!owner_type || !owner_id) {
    // Sem dados do dono do contato: assumir permitido (não bloquear envio),
    // mas recomendamos que os produtores preencham owner_*.
    return true;
  }

  const { data, error } = await supabase
    .from("contact_consents")
    .select("allowed")
    .eq("organization_id", orgId)
    .eq("owner_type", owner_type)
    .eq("owner_id", owner_id)
    .eq("channel", channel)
    .maybeSingle();

  if (error) {
    console.warn("checkConsent error", error.message);
    return true; // não bloquear em caso de erro operacional
  }
  if (!data) return true;
  return Boolean((data as { allowed: boolean }).allowed);
}

async function insertDelivery(orgId: string, queueId: string, status: string, details?: Record<string, any>, providerMsgId?: string) {
  await supabase.from("notification_deliveries").insert({
    organization_id: orgId,
    queue_id: queueId,
    status,
    details: details ?? {},
    provider_message_id: providerMsgId ?? null,
  });
}

async function updateQueueStatus(id: string, status: QueueItem["status"], error?: string | null) {
  await supabase.from("notification_queue").update({
    status,
    error: error ?? null,
    sent_at: ["sent", "failed", "skipped"].includes(status) ? nowIso() : null,
  }).eq("id", id);
}

async function createInteraction(opts: {
  organization_id: string;
  channel: "email" | "whatsapp";
  summary: string;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  payload?: Record<string, any>;
}) {
  const {
    organization_id, channel, summary, entity_type, entity_id, performed_by, payload
  } = opts;

  if (!performed_by) {
    // performed_by é NOT NULL, então só insere se vier do produtor
    return;
  }

  await supabase.from("interactions").insert({
    organization_id,
    channel,
    direction: "outbound",
    entity_type: entity_type ?? "guardian",
    entity_id: entity_id ?? payload?.owner_id ?? null,
    summary,
    performed_by,
    payload: payload ?? {},
  });
}

async function logAudit(orgId: string, action: string, table: string, diff: Record<string, any>) {
  await supabase.from("audit_logs").insert({
    organization_id: orgId,
    table_name: table,
    action,
    diff,
  });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!resend) throw new Error("RESEND_API_KEY ausente");
  const from = Deno.env.get("RESEND_FROM") || "NOVUS.AI <no-reply@resend.dev>";
  const res = await resend.emails.send({ from, to: [to], subject, html });
  return res;
}

async function sendWhatsapp(to: string, text: string) {
  if (!whatsappApiUrl || !whatsappApiToken) throw new Error("WhatsApp provider ausente");
  const resp = await fetch(whatsappApiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${whatsappApiToken}`,
    },
    body: JSON.stringify({ to, text }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`WhatsApp provider error: ${resp.status} ${body}`);
  }
  const json = await resp.json().catch(() => ({}));
  return json;
}

async function processItem(item: QueueItem) {
  // Já marcado como 'queued'. Mudar para 'sending'.
  await updateQueueStatus(item.id, "sending");

  // Consentimento
  const allowed = await checkConsent(item.organization_id, item.channel, item.payload || {});
  if (!allowed) {
    await insertDelivery(item.organization_id, item.id, "skipped", { reason: "consent_denied" });
    await updateQueueStatus(item.id, "skipped", "Consentimento negado");
    await logAudit(item.organization_id, "notification_skipped", "notification_queue", {
      queue_id: item.id, reason: "consent_denied", channel: item.channel, event_type: item.event_type,
    });
    await createInteraction({
      organization_id: item.organization_id,
      channel: item.channel,
      summary: `Notificação não enviada (consentimento negado) — ${item.event_type}`,
      performed_by: item.payload?.performed_by ?? null,
      entity_type: item.payload?.entity_type,
      entity_id: item.payload?.entity_id,
      payload: { queue_id: item.id, recipient: item.recipient },
    });
    return;
  }

  // Template
  const template = await getActiveTemplateFor(item);
  const bodyMd = template?.body_md ?? "";
  const subject = template?.subject ? mergeTemplate(template.subject, item.payload || {}) : `Notificação: ${item.event_type}`;

  // Render
  const rendered = mergeTemplate(bodyMd, item.payload || {});
  const html = mdToHtml(rendered);
  const text = rendered.replace(/<[^>]*>/g, "");

  try {
    if (item.channel === "email") {
      if (!resend) {
        throw new Error("provider_ausente_email");
      }
      const emailResp: any = await sendEmail(item.recipient, subject, html);
      const providerMessageId = emailResp?.data?.id ?? emailResp?.id ?? null;

      await insertDelivery(item.organization_id, item.id, "sent", { provider: "resend" }, providerMessageId || undefined);
      await updateQueueStatus(item.id, "sent", null);
      await logAudit(item.organization_id, "notification_sent", "notification_queue", {
        queue_id: item.id, channel: item.channel, event_type: item.event_type,
      });
      return;
    }

    if (item.channel === "whatsapp") {
      if (!whatsappApiUrl || !whatsappApiToken) {
        throw new Error("provider_ausente_whatsapp");
      }
      const waResp: any = await sendWhatsapp(item.recipient, text);
      const providerMessageId = waResp?.message_id ?? waResp?.id ?? null;

      await insertDelivery(item.organization_id, item.id, "sent", { provider: "whatsapp" }, providerMessageId || undefined);
      await updateQueueStatus(item.id, "sent", null);
      await logAudit(item.organization_id, "notification_sent", "notification_queue", {
        queue_id: item.id, channel: item.channel, event_type: item.event_type,
      });
      return;
    }

    // Canal desconhecido
    throw new Error(`canal_desconhecido_${item.channel}`);
  } catch (err: any) {
    const message = String(err?.message || err || "erro_desconhecido");

    if (message.startsWith("provider_ausente")) {
      // Sem provider: marcar skipped + interaction + audit
      await insertDelivery(item.organization_id, item.id, "skipped", { reason: message });
      await updateQueueStatus(item.id, "skipped", message);
      await logAudit(item.organization_id, "notification_skipped", "notification_queue", {
        queue_id: item.id, reason: message, channel: item.channel, event_type: item.event_type,
      });
      await createInteraction({
        organization_id: item.organization_id,
        channel: item.channel,
        summary: `Notificação não enviada (provider ausente) — ${item.event_type}`,
        performed_by: item.payload?.performed_by ?? null,
        entity_type: item.payload?.entity_type,
        entity_id: item.payload?.entity_id,
        payload: { queue_id: item.id, recipient: item.recipient },
      });
      return;
    }

    // Falha real no envio
    await insertDelivery(item.organization_id, item.id, "failed", { error: message });
    await updateQueueStatus(item.id, "failed", message);
    await logAudit(item.organization_id, "notification_failed", "notification_queue", {
      queue_id: item.id, error: message, channel: item.channel, event_type: item.event_type,
    });
  }
}

Deno.serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { limit = 50 } = await req.json().catch(() => ({ limit: 50 }));

    // Buscar itens da fila (priorizando agendados)
    const { data, error } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "queued")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(Math.max(1, Math.min(100, limit)));

    if (error) {
      throw new Error(error.message);
    }

    const items = (data || []) as QueueItem[];
    for (const item of items) {
      await processItem(item);
    }

    return new Response(JSON.stringify({
      processed: items.length,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "unknown_error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
