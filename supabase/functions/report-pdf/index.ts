import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  organization_id: string;
  report_type: 'academico' | 'financeiro' | 'crm';
  filters: Record<string, any>;
  data: any[];
}

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

    const { organization_id, report_type, filters, data }: ReportRequest = await req.json();

    console.log(`Gerando PDF para org ${organization_id}, tipo: ${report_type}`);

    // Verificar autenticação e organização
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Não autenticado');
    }

    // Gerar conteúdo HTML do relatório
    const htmlContent = generateReportHTML(report_type, data, filters);
    
    // Para simplicidade, vamos criar um PDF básico usando uma biblioteca simples
    // Em produção, usar algo como Puppeteer ou similar
    const pdfBuffer = await generatePDFFromHTML(htmlContent);
    
    // Upload para storage
    const fileName = `report-${report_type}-${organization_id}-${new Date().toISOString().split('T')[0]}.pdf`;
    const filePath = `reports/${organization_id}/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('docs')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do PDF:', uploadError);
      throw uploadError;
    }

    // Gerar URL assinado temporário (válido por 1 hora)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('docs')
      .createSignedUrl(filePath, 3600); // 1 hora

    if (urlError) {
      console.error('Erro ao gerar URL assinado:', urlError);
      throw urlError;
    }

    // Log de auditoria
    await supabase.from('audit_logs').insert({
      organization_id,
      table_name: 'bi',
      action: 'generate_pdf_report',
      diff: { report_type, filters, file_path: filePath },
      actor: user.id,
    });

    console.log(`PDF gerado com sucesso: ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        downloadUrl: signedUrl.signedUrl,
        filePath,
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
    console.error('Erro na geração do PDF:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro interno na geração do PDF'
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

function generateReportHTML(reportType: string, data: any[], filters: Record<string, any>): string {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  
  let title = '';
  let content = '';

  switch (reportType) {
    case 'academico':
      title = 'Relatório Acadêmico';
      content = generateAcademicoContent(data, filters);
      break;
    case 'financeiro':
      title = 'Relatório Financeiro';
      content = generateFinanceiroContent(data, filters);
      break;
    case 'crm':
      title = 'Relatório CRM';
      content = generateCRMContent(data, filters);
      break;
    default:
      title = 'Relatório';
      content = '<p>Tipo de relatório não reconhecido</p>';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .summary { margin: 20px 0; padding: 15px; background-color: #f5f5f5; }
        .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #4CAF50; color: white; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p>Gerado em: ${currentDate}</p>
        <p>Período: ${filters.startDate || 'N/A'} a ${filters.endDate || 'N/A'}</p>
      </div>
      
      ${content}
      
      <div class="footer">
        <p>Relatório gerado automaticamente pelo sistema NOVUS.AI</p>
      </div>
    </body>
    </html>
  `;
}

function generateAcademicoContent(data: any[], filters: Record<string, any>): string {
  return `
    <div class="summary">
      <h2>Resumo Acadêmico</h2>
      <p><strong>Total de registros:</strong> ${data.length}</p>
      <p><strong>Período analisado:</strong> ${filters.startDate || 'N/A'} a ${filters.endDate || 'N/A'}</p>
    </div>
    
    <h2>Dados Detalhados</h2>
    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nome</th>
          <th>Status</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        ${data.slice(0, 50).map(item => `
          <tr>
            <td>${item.id || 'N/A'}</td>
            <td>${item.first_name || ''} ${item.last_name || ''}</td>
            <td>${item.status || 'N/A'}</td>
            <td>${item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function generateFinanceiroContent(data: any[], filters: Record<string, any>): string {
  return `
    <div class="summary">
      <h2>Resumo Financeiro</h2>
      <p><strong>Total de registros:</strong> ${data.length}</p>
      <p><strong>Período analisado:</strong> ${filters.startDate || 'N/A'} a ${filters.endDate || 'N/A'}</p>
      <p><em>Dados financeiros serão exibidos quando a integração ERP estiver ativa.</em></p>
    </div>
  `;
}

function generateCRMContent(data: any[], filters: Record<string, any>): string {
  return `
    <div class="summary">
      <h2>Resumo CRM</h2>
      <p><strong>Total de registros:</strong> ${data.length}</p>
      <p><strong>Período analisado:</strong> ${filters.startDate || 'N/A'} a ${filters.endDate || 'N/A'}</p>
    </div>
    
    <h2>Leads e Visitantes</h2>
    <table class="table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Email</th>
          <th>Data Visita</th>
          <th>Propósito</th>
        </tr>
      </thead>
      <tbody>
        ${data.slice(0, 50).map(item => `
          <tr>
            <td>${item.full_name || 'N/A'}</td>
            <td>${item.phone || 'N/A'}</td>
            <td>${item.email || 'N/A'}</td>
            <td>${item.visit_date ? new Date(item.visit_date).toLocaleDateString('pt-BR') : 'N/A'}</td>
            <td>${item.purpose || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Função simples para gerar PDF (em produção usar biblioteca apropriada)
async function generatePDFFromHTML(html: string): Promise<Uint8Array> {
  // Para simplicidade, retornamos um placeholder
  // Em produção, usar Puppeteer, html-pdf, ou similar
  const encoder = new TextEncoder();
  const placeholder = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Relatório gerado) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000207 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
295
%%EOF`;
  
  return encoder.encode(placeholder);
}

serve(handler);