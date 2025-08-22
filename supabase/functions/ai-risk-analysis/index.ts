import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verificar auth se não for chamada por cron
    const isCronJob = req.headers.get('x-cron-signature');
    let organizationId = null;
    let userId = null;

    if (!isCronJob) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Token de autenticação requerido' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
      if (userError || !userData.user) {
        return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = userData.user.id;
      
      // Obter organization_id do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .single();
      
      organizationId = profileData?.organization_id;
    }

    const { model_type = 'evasao', force_update = false } = await req.json().catch(() => ({}));

    // Análise de risco de evasão
    if (model_type === 'evasao') {
      const { data: studentsAtRisk, error } = await supabase
        .from('v_risco_evasao')
        .select('*')
        .gte('risco_score', 0.6);

      if (error) {
        throw new Error(`Erro ao consultar v_risco_evasao: ${error.message}`);
      }

      // Salvar predições na tabela prediction_logs
      for (const student of studentsAtRisk || []) {
        await supabase
          .from('prediction_logs')
          .upsert({
            organization_id: student.organization_id,
            model_type: 'evasao',
            entity_type: 'student',
            entity_id: student.id,
            prediction_score: student.risco_score,
            confidence: 0.8, // Modelo simples
            factors: {
              freq_media: student.freq_media,
              nota_media: student.nota_media,
              calculated_at: student.calculated_at
            },
            created_by: userId,
          }, { 
            onConflict: 'organization_id,model_type,entity_type,entity_id',
            ignoreDuplicates: !force_update 
          });
      }

      return new Response(JSON.stringify({ 
        success: true,
        model_type: 'evasao',
        students_analyzed: studentsAtRisk?.length || 0,
        high_risk_count: studentsAtRisk?.filter(s => s.risco_score >= 0.8).length || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Análise de inadimplência (simulada por enquanto)
    if (model_type === 'inadimplencia') {
      // Por enquanto retorna dados simulados
      // Em um cenário real, integraria com sistema financeiro
      
      return new Response(JSON.stringify({ 
        success: true,
        model_type: 'inadimplencia',
        message: 'Análise de inadimplência ainda não implementada - necessário módulo financeiro'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Tipo de modelo não suportado',
      supported_types: ['evasao', 'inadimplencia']
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na análise de risco:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno na análise de risco',
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});