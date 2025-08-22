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
    
    // Recuperar token de auth do cabeçalho
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token de autenticação requerido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar usuário autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, entity_type = 'general', entity_id = null } = await req.json();

    // Prompt contextual para educação
    const systemPrompt = `Você é um assistente educacional inteligente para o sistema NOVUS.AI.

Você ajuda pais, responsáveis e equipe escolar com:
- Informações sobre horários, calendário e eventos
- Consultas sobre notas e frequência dos alunos
- Orientações sobre documentos e matrículas
- Suporte administrativo geral
- Dúvidas pedagógicas básicas

Responda de forma educada, profissional e útil. 
Se não souber algo específico, oriente a entrar em contato com a secretaria.
Mantenha as respostas concisas e práticas.

Contexto da conversa: ${entity_type === 'student' ? 'Consulta sobre aluno' : 'Consulta geral'}`;

    // Chamar OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const aiData = await response.json();
    
    if (!response.ok) {
      console.error('Erro OpenAI:', aiData);
      throw new Error('Erro na chamada para OpenAI');
    }

    const aiResponse = aiData.choices[0].message.content;

    // Salvar interação no CRM
    const { error: interactionError } = await supabase
      .from('interactions')
      .insert({
        organization_id: null, // será preenchido via RLS/trigger
        entity_type: entity_type,
        entity_id: entity_id,
        direction: 'inbound',
        channel: 'sistema',
        summary: `Chatbot IA: ${message.substring(0, 50)}...`,
        payload: {
          user_message: message,
          ai_response: aiResponse,
          model: 'gpt-4o-mini'
        },
        performed_by: userData.user.id,
      });

    if (interactionError) {
      console.error('Erro ao salvar interação:', interactionError);
      // Não falha o chatbot se não conseguir salvar
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      interaction_saved: !interactionError 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no chatbot IA:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erro interno do chatbot',
      fallback_response: 'Desculpe, não foi possível processar sua solicitação no momento. Por favor, entre em contato com a secretaria para assistência.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});