import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verificar auth
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

    const { assessment_id, student_id, text_content } = await req.json();

    if (!assessment_id || !student_id || !text_content) {
      return new Response(JSON.stringify({ error: 'Parâmetros obrigatórios: assessment_id, student_id, text_content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prompt para correção de redação
    const systemPrompt = `Você é um assistente pedagógico especializado em correção de redações e textos escolares.

Analise o texto fornecido e forneça um feedback estruturado nos seguintes aspectos:

1. GRAMÁTICA E ORTOGRAFIA (nota 0-10)
2. COERÊNCIA E COESÃO (nota 0-10) 
3. ESTRUTURA E ORGANIZAÇÃO (nota 0-10)
4. CRIATIVIDADE E ORIGINALIDADE (nota 0-10)

Para cada aspecto, forneça:
- Uma nota de 0 a 10
- Justificativa da nota
- Sugestões específicas de melhoria

Retorne APENAS um JSON válido com esta estrutura:
{
  "grammar_score": 8.5,
  "coherence_score": 7.0,
  "overall_feedback": "Resumo geral do desempenho",
  "suggestions": ["Sugestão 1", "Sugestão 2", "Sugestão 3"],
  "positive_aspects": ["Ponto forte 1", "Ponto forte 2"],
  "areas_for_improvement": ["Área para melhorar 1", "Área para melhorar 2"]
}`;

    // Chamar OpenAI para análise
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analise este texto:\n\n${text_content}` }
        ],
        max_completion_tokens: 1000,
      }),
    });

    const aiData = await response.json();
    
    if (!response.ok) {
      console.error('Erro OpenAI:', aiData);
      throw new Error('Erro na chamada para OpenAI');
    }

    let feedback;
    try {
      feedback = JSON.parse(aiData.choices[0].message.content);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da IA:', parseError);
      throw new Error('Resposta da IA em formato inválido');
    }

    // Salvar feedback na tabela assessments_feedback
    const { data: savedFeedback, error: saveError } = await supabase
      .from('assessments_feedback')
      .upsert({
        organization_id: null, // será preenchido via RLS
        assessment_id,
        student_id,
        ai_feedback: feedback,
        grammar_score: feedback.grammar_score || 0,
        coherence_score: feedback.coherence_score || 0,
        suggestions: feedback.suggestions || [],
        created_by: userData.user.id,
      }, { 
        onConflict: 'organization_id,assessment_id,student_id' 
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar feedback:', saveError);
      throw new Error('Erro ao salvar feedback no banco de dados');
    }

    return new Response(JSON.stringify({ 
      success: true,
      feedback: savedFeedback,
      ai_analysis: feedback
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na correção automática:', error);
    
    // Fallback para quando a IA falha
    const fallbackFeedback = {
      grammar_score: null,
      coherence_score: null,
      overall_feedback: 'Erro no sistema de correção automática. Um professor fará a correção manual.',
      suggestions: ['Sistema temporariamente indisponível'],
      positive_aspects: [],
      areas_for_improvement: ['Aguardar correção manual']
    };
    
    return new Response(JSON.stringify({ 
      error: 'Erro na correção automática',
      fallback_feedback: fallbackFeedback,
      message: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});