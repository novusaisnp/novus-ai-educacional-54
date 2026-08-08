
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // CORS preflight
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
    const body = await req.json().catch(() => ({}));

    // Normalização simples: esperar campos comuns
    const provider_message_id: string | undefined =
      body?.message_id || body?.id || body?.data?.id || body?.provider_message_id;
    const statusRaw: string | undefined =
      body?.status || body?.event || body?.type;

    if (!provider_message_id) {
      return new Response(JSON.stringify({ error: "provider_message_id ausente" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mapear status do provedor para nosso domínio
    const statusMap: Record<string, string> = {
      delivered: "delivered",
      bounce: "bounced",
      bounced: "bounced",
      read: "read",
      opened: "read",
      failed: "failed",
      sent: "sent",
    };
    const mapped = statusRaw ? (statusMap[statusRaw.toLowerCase()] || "sent") : "sent";

    // Atualizar delivery existente (idempotente por provider_message_id)
    const { data: deliveries, error: findErr } = await supabase
      .from("notification_deliveries")
      .select("*")
      .eq("provider_message_id", provider_message_id)
      .limit(1);

    if (findErr) {
      throw new Error(findErr.message);
    }

    if (!deliveries || deliveries.length === 0) {
      // Sem delivery encontrado, apenas registrar (não criar sem org)
      return new Response(JSON.stringify({ ok: true, note: "delivery_not_found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const delivery = deliveries[0];

    const { error: updErr } = await supabase
      .from("notification_deliveries")
      .update({
        status: mapped,
        details: { ...(delivery.details || {}), webhook_body: body, updated_at: new Date().toISOString() },
      })
      .eq("id", delivery.id);

    if (updErr) {
      throw new Error(updErr.message);
    }

    return new Response(JSON.stringify({ ok: true, updated: mapped }), {
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
