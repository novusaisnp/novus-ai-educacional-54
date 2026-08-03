import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const markForManualReview = async (
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  notes: string,
) => {
  await supabase
    .from('documents')
    .update({ validation_status: 'revisar', ai_notes: notes, validated_at: new Date().toISOString() })
    .eq('id', documentId);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  let documentId: string | undefined;

  try {
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

    const { document_id } = await req.json();
    documentId = document_id;
    if (!document_id) {
      return new Response(JSON.stringify({ error: 'Parâmetro obrigatório: document_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, title, file_path')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      return new Response(JSON.stringify({ error: 'Documento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [bucket, ...pathParts] = doc.file_path.split('/');
    const path = pathParts.join('/');
    const ext = doc.file_path.split('.').pop()?.toLowerCase() || '';

    if (!IMAGE_EXTENSIONS.includes(ext)) {
      // PDF/outros: fora de escopo da validação por IA nesta fatia — marca pra revisão manual.
      await markForManualReview(
        supabase,
        document_id,
        'Validação automática só está disponível para imagens (jpg/png/webp). Revisar manualmente.',
      );
      return new Response(JSON.stringify({ success: true, validation_status: 'revisar', reason: 'unsupported_file_type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { data: fileData, error: downloadError } = await supabase.storage.from(bucket).download(path);
    if (downloadError || !fileData) {
      throw new Error('Não foi possível baixar o arquivo do storage');
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    const mime = IMAGE_MIME[ext] || 'image/jpeg';

    const systemPrompt = `Você é um assistente de secretaria escolar que classifica documentos de matrícula de alunos.

Analise a imagem enviada e responda APENAS com um JSON válido nesta estrutura:
{
  "document_type": "RG" | "CPF" | "Comprovante de Residência" | "Certidão de Nascimento" | "Histórico Escolar" | "Foto 3x4" | "Outro",
  "legible": true ou false,
  "notes": "observação curta sobre a legibilidade ou o motivo de não reconhecer o documento"
}

Considere "legible": false se a imagem estiver borrada, cortada, incompleta ou não for de fato um documento.`;

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
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Classifique este documento de aluno:' },
              { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
            ],
          },
        ],
        max_tokens: 300,
      }),
    });

    const aiData = await response.json();
    if (!response.ok) {
      console.error('Erro OpenAI:', aiData);
      throw new Error('Erro na chamada para OpenAI');
    }

    let result: { document_type?: string; legible?: boolean; notes?: string };
    try {
      result = JSON.parse(aiData.choices[0].message.content);
    } catch (parseError) {
      console.error('Erro ao parsear JSON da IA:', parseError);
      throw new Error('Resposta da IA em formato inválido');
    }

    const validationStatus = result.legible && result.document_type ? 'validado' : 'revisar';

    const { data: updated, error: updateError } = await supabase
      .from('documents')
      .update({
        document_type: result.document_type || null,
        validation_status: validationStatus,
        ai_notes: result.notes || null,
        validated_at: new Date().toISOString(),
      })
      .eq('id', document_id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao salvar validação:', updateError);
      throw new Error('Erro ao salvar validação no banco de dados');
    }

    return new Response(JSON.stringify({ success: true, document: updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro na validação automática de documento:', error);

    if (documentId) {
      try {
        await markForManualReview(
          supabase,
          documentId,
          'Falha na validação automática — revisar manualmente.',
        );
      } catch {
        // se nem isso funcionar, segue pro fallback de resposta abaixo sem travar a request
      }
    }

    return new Response(JSON.stringify({
      error: 'Erro na validação automática',
      validation_status: 'revisar',
      message: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
