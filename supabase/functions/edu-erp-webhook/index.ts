
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-erp-signature',
}

interface WebhookEvent {
  id: string;
  type: 'receivable.paid' | 'receivable.partially_paid' | 'receivable.canceled';
  data: {
    receivableId: string;
    contractId: string;
    amount: number;
    paidAmount?: number;
    paidAt?: string;
    metadata?: {
      orgId?: string;
      localContractId?: string;
    };
  };
  timestamp: string;
}

// Simples deduplicação em memória (para produção usar Redis/DB)
const processedEvents = new Set<string>();

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

    // Parse do evento
    let event: WebhookEvent;
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

    // Deduplicação simples
    if (processedEvents.has(event.id)) {
      console.log(`[Webhook] Evento ${event.id} já processado`);
      return new Response(
        JSON.stringify({ status: 'already_processed' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Para fins de demonstração, assumir que temos o signingSecret
    // Em produção, isso deveria vir da configuração da organização
    const DEMO_SIGNING_SECRET = Deno.env.get('ERP_SIGNING_SECRET') || 'demo-secret-key';
    
    // Verificar assinatura
    const isValidSignature = await verifySignature(payload, signature, DEMO_SIGNING_SECRET);
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

    // Validar tipo de evento
    const validEvents = ['receivable.paid', 'receivable.partially_paid', 'receivable.canceled'];
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

    // Marcar como processado
    processedEvents.add(event.id);

    // Log do evento para auditoria
    console.log(`[Webhook] Processando ${event.type} para contrato ${event.data.contractId}`);
    
    // Conectar ao Supabase para registrar audit log
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Registrar evento em audit_logs se temos orgId
    if (event.data.metadata?.orgId) {
      try {
        await supabase
          .from('audit_logs')
          .insert({
            organization_id: event.data.metadata.orgId,
            table_name: 'erp_webhooks',
            action: 'webhook_received',
            diff: {
              event_type: event.type,
              receivable_id: event.data.receivableId,
              contract_id: event.data.contractId,
              amount: event.data.amount,
              paid_amount: event.data.paidAmount,
              paid_at: event.data.paidAt,
            },
            actor: null, // Sistema
          });
        
        console.log(`[Webhook] Evento registrado em audit para org ${event.data.metadata.orgId}`);
      } catch (auditError) {
        console.error('[Webhook] Erro ao registrar audit:', auditError);
        // Não falhar o webhook por causa do audit log
      }
    }

    // Em uma implementação futura, aqui poderíamos:
    // 1. Atualizar status de pagamento na tabela de matrículas/mensalidades
    // 2. Disparar notificações realtime
    // 3. Executar outras ações baseadas no evento

    // Por ora, apenas logamos e retornamos sucesso
    return new Response(
      JSON.stringify({ 
        status: 'processed',
        event_id: event.id,
        event_type: event.type 
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
