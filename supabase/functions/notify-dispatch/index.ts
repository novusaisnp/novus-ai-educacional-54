
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { Resend } from "npm:resend@2.0.0";

// CORS básico
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 'push' entrou nos CHECK de notification_queue/templates/contact_consents na
// migration 20260814020000. Para esse canal, `recipient` é o user_id do dono
// dos tokens — não um e-mail/telefone.
type Channel = "email" | "whatsapp" | "push";

type QueueItem = {
  id: string;
  organization_id: string;
  channel: Channel;
  event_type: string;
  recipient: string;
  payload: Record<string, unknown>;
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
  channel: Channel;
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

function mergeTemplate(text: string, payload: Record<string, unknown>): string {
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

async function checkConsent(orgId: string, channel: "email" | "whatsapp", payload: Record<string, unknown>): Promise<boolean> {
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

// --- FCM HTTP v1 --------------------------------------------------------
// A API v1 exige OAuth do service account (a legacy key foi desligada pelo
// Google). Sem lib: JWT RS256 assinado com WebCrypto e trocado por token.

const fcmServiceAccount = (() => {
  const raw = Deno.env.get("FCM_SERVICE_ACCOUNT");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { client_email: string; private_key: string; project_id: string };
  } catch {
    console.warn("FCM_SERVICE_ACCOUNT não é um JSON válido");
    return null;
  }
})();

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function fcmAccessToken(): Promise<string> {
  const account = fcmServiceAccount!;
  const pem = account.private_key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const issuedAt = Math.floor(Date.now() / 1000);
  const claim = {
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const encoder = new TextEncoder();
  const unsigned = `${b64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))}.${b64url(encoder.encode(JSON.stringify(claim)))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const assertion = `${unsigned}.${b64url(new Uint8Array(signature))}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(`fcm_oauth_${resp.status}: ${JSON.stringify(json)}`);
  return json.access_token as string;
}

/**
 * Envia para todos os aparelhos do usuário. Token que o Google diz não existir
 * mais (app desinstalado) é apagado — senão a fila tenta pra sempre.
 * Retorna quantos aparelhos aceitaram.
 */
async function sendPush(userId: string, title: string, body: string, route?: string): Promise<number> {
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (!tokens?.length) throw new Error("push_sem_token");

  const accessToken = await fcmAccessToken();
  const endpoint = `https://fcm.googleapis.com/v1/projects/${fcmServiceAccount!.project_id}/messages:send`;
  let delivered = 0;

  for (const { token } of tokens as { token: string }[]) {
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          // O app abre nessa rota ao tocar na notificação.
          data: route ? { route } : undefined,
          android: { priority: "HIGH" },
        },
      }),
    });

    if (resp.ok) {
      delivered += 1;
      continue;
    }

    const detail = await resp.text();
    if (resp.status === 404 || detail.includes("UNREGISTERED") || detail.includes("INVALID_ARGUMENT")) {
      await supabase.from("push_tokens").delete().eq("token", token);
      console.warn("push token removido", { status: resp.status });
      continue;
    }
    throw new Error(`fcm_${resp.status}: ${detail}`);
  }

  if (delivered === 0) throw new Error("push_sem_token");
  return delivered;
}

async function insertDelivery(orgId: string, queueId: string, status: string, details?: Record<string, unknown>, providerMsgId?: string) {
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
  channel: Channel;
  summary: string;
  entity_type?: string;
  entity_id?: string;
  performed_by?: string;
  payload?: Record<string, unknown>;
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

async function logAudit(orgId: string, action: string, table: string, diff: Record<string, unknown>) {
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
      performed_by: item.payload?.performed_by as string | undefined,
      entity_type: item.payload?.entity_type as string | undefined,
      entity_id: item.payload?.entity_id as string | undefined,
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
      const emailResp = await sendEmail(item.recipient, subject, html);
      // O SDK do Resend não lança em erro de validação/domínio (403 etc.) -- retorna
      // { data: null, error: {...} }. Sem checar isso, o envio ficava marcado "sent"
      // mesmo quando a Resend recusou de verdade (achado real: domínio de teste
      // resend.dev só entrega pro e-mail dono da conta, silenciosamente até aqui).
      if (emailResp?.error) {
        throw new Error(emailResp.error.message ?? JSON.stringify(emailResp.error));
      }
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
      const waResp = await sendWhatsapp(item.recipient, text);
      const providerMessageId = waResp?.message_id ?? waResp?.id ?? null;

      await insertDelivery(item.organization_id, item.id, "sent", { provider: "whatsapp" }, providerMessageId || undefined);
      await updateQueueStatus(item.id, "sent", null);
      await logAudit(item.organization_id, "notification_sent", "notification_queue", {
        queue_id: item.id, channel: item.channel, event_type: item.event_type,
      });
      return;
    }

    if (item.channel === "push") {
      if (!fcmServiceAccount) {
        throw new Error("provider_ausente_push");
      }
      // recipient é o user_id; os aparelhos vêm de push_tokens.
      const delivered = await sendPush(
        item.recipient,
        subject || "NOVUS.AI Educacional",
        text,
        item.payload?.route as string | undefined,
      );

      await insertDelivery(item.organization_id, item.id, "sent", { provider: "fcm", devices: delivered });
      await updateQueueStatus(item.id, "sent", null);
      await logAudit(item.organization_id, "notification_sent", "notification_queue", {
        queue_id: item.id, channel: item.channel, event_type: item.event_type,
      });
      return;
    }

    // Canal desconhecido
    throw new Error(`canal_desconhecido_${item.channel}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err ?? "erro_desconhecido");

    // push_sem_token não é falha de envio: o usuário simplesmente não tem o app
    // instalado. Retentar não muda nada, então entra como skipped.
    if (message.startsWith("provider_ausente") || message === "push_sem_token") {
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
        performed_by: item.payload?.performed_by as string | undefined,
        entity_type: item.payload?.entity_type as string | undefined,
        entity_id: item.payload?.entity_id as string | undefined,
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown_error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
