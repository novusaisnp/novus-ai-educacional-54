import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertThresholds {
  inadimplencia_dias: number;
  inadimplencia_valor: number;
  risco_evasao_score: number;
  sla_demandas_horas: number;
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  inadimplencia_dias: 10,
  inadimplencia_valor: 500,
  risco_evasao_score: 0.8,
  sla_demandas_horas: 48,
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Iniciando geração de alertas operacionais...');

    // Buscar todas as organizações ativas
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgError) {
      throw orgError;
    }

    console.log(`Processando alertas para ${organizations?.length || 0} organizações`);

    let totalAlertas = 0;

    // Para cada organização, gerar alertas
    for (const org of organizations || []) {
      try {
        console.log(`Processando alertas para org ${org.id}`);
        
        const thresholds = DEFAULT_THRESHOLDS; // Em produção, buscar configurações específicas

        // 1. Alertas de Inadimplência (só se ERP estiver ativo)
        const inadimplenciaAlertas = await processInadimplenciaAlerts(supabase, org.id, thresholds);
        
        // 2. Alertas de Risco de Evasão
        const riscoEvasaoAlertas = await processRiscoEvasaoAlerts(supabase, org.id, thresholds);
        
        // 3. Alertas de SLA de Demandas
        const slaAlertas = await processSLADemandas(supabase, org.id, thresholds);

        const orgTotalAlertas = inadimplenciaAlertas + riscoEvasaoAlertas + slaAlertas;
        totalAlertas += orgTotalAlertas;

        console.log(`Org ${org.id}: ${orgTotalAlertas} alertas gerados`);

        // Log de auditoria para a organização
        if (orgTotalAlertas > 0) {
          await supabase.from('audit_logs').insert({
            organization_id: org.id,
            table_name: 'ai_features',
            action: 'ops_alerts_generated',
            diff: {
              inadimplencia: inadimplenciaAlertas,
              risco_evasao: riscoEvasaoAlertas,
              sla_demandas: slaAlertas,
              total: orgTotalAlertas,
            },
          });
        }

      } catch (orgError: any) {
        console.error(`Erro ao processar alertas para org ${org.id}:`, orgError.message);
      }
    }

    console.log(`Geração de alertas concluída. Total: ${totalAlertas} alertas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Alertas operacionais gerados com sucesso',
        stats: {
          organizationsProcessed: organizations?.length || 0,
          totalAlerts: totalAlertas,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Erro na geração de alertas operacionais:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro interno na geração de alertas'
      }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        },
      }
    );
  }
};

async function processInadimplenciaAlerts(
  supabase: any, 
  orgId: string, 
  thresholds: AlertThresholds
): Promise<number> {
  try {
    // Por enquanto, não temos integração ERP real
    // Retornar 0 alertas até que ERP seja implementado
    console.log(`Inadimplência: ERP não configurado para org ${orgId}`);
    return 0;

    // Quando ERP estiver integrado, usar lógica similar a:
    /*
    const { data: overdue, error } = await supabase
      .from('financial_transactions') // Tabela que virá do ERP
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'overdue')
      .gte('days_overdue', thresholds.inadimplencia_dias)
      .or(`amount.gte.${thresholds.inadimplencia_valor}`);

    if (error) throw error;

    if (overdue && overdue.length > 0) {
      // Criar interaction de alerta
      await supabase.from('interactions').insert({
        organization_id: orgId,
        entity_type: 'alert',
        entity_id: 'system',
        direction: 'system',
        channel: 'sistema',
        summary: `${overdue.length} alunos com inadimplência crítica`,
        payload: {
          category: 'inadimplencia',
          count: overdue.length,
          threshold_days: thresholds.inadimplencia_dias,
          threshold_amount: thresholds.inadimplencia_valor,
        },
        performed_by: 'system',
      });

      return overdue.length;
    }
    */
  } catch (error: any) {
    console.error(`Erro ao processar inadimplência para org ${orgId}:`, error.message);
  }
  
  return 0;
}

async function processRiscoEvasaoAlerts(
  supabase: any, 
  orgId: string, 
  thresholds: AlertThresholds
): Promise<number> {
  try {
    // Verificar se view de risco existe
    const { data: riskData, error } = await supabase
      .from('v_risco_evasao')
      .select('*')
      .eq('organization_id', orgId)
      .gte('risco_score', thresholds.risco_evasao_score);

    if (error) {
      console.log(`View de risco não disponível para org ${orgId}:`, error.message);
      return 0;
    }

    if (riskData && riskData.length > 0) {
      // Criar interaction de alerta
      await supabase.from('interactions').insert({
        organization_id: orgId,
        entity_type: 'alert',
        entity_id: 'system',
        direction: 'system',
        channel: 'sistema',
        summary: `${riskData.length} alunos com alto risco de evasão`,
        payload: {
          category: 'risco_evasao',
          count: riskData.length,
          threshold_score: thresholds.risco_evasao_score,
        },
        performed_by: 'system',
      });

      console.log(`Org ${orgId}: ${riskData.length} alertas de risco de evasão`);
      return riskData.length;
    }

  } catch (error: any) {
    console.error(`Erro ao processar risco de evasão para org ${orgId}:`, error.message);
  }
  
  return 0;
}

async function processSLADemandas(
  supabase: any, 
  orgId: string, 
  thresholds: AlertThresholds
): Promise<number> {
  try {
    // Calcular timestamp limite (48h atrás por padrão)
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - thresholds.sla_demandas_horas);

    const { data: overdueRequests, error } = await supabase
      .from('requests')
      .select('*')
      .eq('organization_id', orgId)
      .neq('status', 'concluida')
      .lt('updated_at', hoursAgo.toISOString());

    if (error) {
      console.error(`Erro ao buscar demandas em atraso para org ${orgId}:`, error.message);
      return 0;
    }

    if (overdueRequests && overdueRequests.length > 0) {
      // Criar interaction de alerta
      await supabase.from('interactions').insert({
        organization_id: orgId,
        entity_type: 'alert',
        entity_id: 'system',
        direction: 'system',
        channel: 'sistema',
        summary: `${overdueRequests.length} demandas com SLA estourado`,
        payload: {
          category: 'sla_demandas',
          count: overdueRequests.length,
          threshold_hours: thresholds.sla_demandas_horas,
        },
        performed_by: 'system',
      });

      console.log(`Org ${orgId}: ${overdueRequests.length} alertas de SLA`);
      return overdueRequests.length;
    }

  } catch (error: any) {
    console.error(`Erro ao processar SLA de demandas para org ${orgId}:`, error.message);
  }
  
  return 0;
}

serve(handler);