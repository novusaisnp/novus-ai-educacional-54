
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-erp-signature',
}

// Payload segue o schema canônico de Liquidação do contrato ERP
// (novusai-erp/docs/PLANO_MESTRE.md, Parte 1 §1.2, Porta 2), envelopado com
// o tipo de evento e a idempotency_key no formato
// "novus-educacional:<organization_id>:<numero_documento>".
interface LiquidacaoEvent {
  type: 'receivable.paid' | 'receivable.partially_paid' | 'receivable.canceled';
  data: {
    titulo_id: string;
    tipo_titulo?: string;
    valor_pago: number;
    data_pagamento: string;
    forma_pagamento?: string;
    observacoes?: string;
  };
  origem_sistema?: string;
  idempotency_key?: string;
  timestamp?: string;
}

const EVENT_STATUS: Record<LiquidacaoEvent['type'], string> = {
  'receivable.paid': 'pago',
  'receivable.partially_paid': 'parcial',
  'receivable.canceled': 'cancelado',
};

function parseIdempotencyKey(key: string | undefined): { organizationId: string; numeroDocumento: string } | null {
  if (!key) return null;
  const parts = key.split(':');
  if (parts.length < 3 || parts[0] !== 'novus-educacional') return null;
  return { organizationId: parts[1], numeroDocumento: parts.slice(2).join(':') };
}

async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const payloadData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Assumindo formato: sha256=<hash>
    const expectedSignature = signature.replace('sha256=', '');
    const signatureBuffer = new Uint8Array(
      expectedSignature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBuffer,
      payloadData
    );
  } catch (error) {
    console.error('Erro na verificação de assinatura:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  const signingSecret = Deno.env.get('ERP_SIGNING_SECRET');
  if (!signingSecret) {
    console.error('[Webhook] ERP_SIGNING_SECRET não configurado — recusando requisição');
    return new Response(
      JSON.stringify({ error: 'Webhook not configured' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const payload = await req.text();
    const signature = req.headers.get('x-erp-signature');

    if (!signature) {
      console.warn('[Webhook] Assinatura ausente');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const isValidSignature = await verifySignature(payload, signature, signingSecret);
    if (!isValidSignature) {
      console.warn('[Webhook] Assinatura inválida');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse do evento
    let event: LiquidacaoEvent;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error('[Webhook] Payload inválido:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const validEvents = Object.keys(EVENT_STATUS);
    if (!validEvents.includes(event.type)) {
      console.warn(`[Webhook] Tipo de evento não suportado: ${event.type}`);
      return new Response(
        JSON.stringify({ error: 'Unsupported event type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const correlation = parseIdempotencyKey(event.idempotency_key);
    if (!correlation) {
      console.warn('[Webhook] idempotency_key ausente ou em formato inesperado:', event.idempotency_key);
      return new Response(
        JSON.stringify({ error: 'Missing or invalid idempotency_key' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[Webhook] Processando ${event.type} para título ${event.data.titulo_id} (org ${correlation.organizationId})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const status = EVENT_STATUS[event.type];
    const { data: existing } = await supabase
      .from('financial_transactions')
      .select('id')
      .eq('organization_id', correlation.organizationId)
      .eq('external_id', event.data.titulo_id)
      .maybeSingle();

    const row = {
      organization_id: correlation.organizationId,
      external_id: event.data.titulo_id,
      numero_documento: correlation.numeroDocumento,
      amount: event.data.valor_pago,
      payment_date: event.data.data_pagamento,
      payment_method: event.data.forma_pagamento || null,
      status,
      raw_event: event,
      updated_at: new Date().toISOString(),
    };

    const { error: persistError } = existing
      ? await supabase.from('financial_transactions').update(row).eq('id', existing.id)
      : await supabase.from('financial_transactions').insert(row);
    if (persistError) throw persistError;

    // Log do evento para auditoria
    await supabase
      .from('audit_logs')
      .insert({
        organization_id: correlation.organizationId,
        table_name: 'erp_webhooks',
        action: 'webhook_received',
        diff: {
          event_type: event.type,
          titulo_id: event.data.titulo_id,
          valor_pago: event.data.valor_pago,
          data_pagamento: event.data.data_pagamento,
        },
        actor: null, // Sistema
      })
      .then(({ error }) => {
        if (error) console.error('[Webhook] Erro ao registrar audit:', error);
      });

    return new Response(
      JSON.stringify({
        status: 'processed',
        event_type: event.type,
        titulo_id: event.data.titulo_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Webhook] Erro no processamento:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
