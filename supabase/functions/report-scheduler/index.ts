import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Iniciando scheduler de relatórios...');

    // Buscar todas as organizações com agendamentos ativos
    // Como não temos tabela específica, vamos simular com localStorage
    // Em produção, criar tabela organization_settings
    
    const today = new Date();
    const isMonday = today.getDay() === 1; // Segunda-feira
    const isFirstDayOfMonth = today.getDate() === 1;

    console.log(`Hoje é: ${today.toISOString()}, Segunda: ${isMonday}, Primeiro do mês: ${isFirstDayOfMonth}`);

    // Buscar organizações ativas
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name');

    if (orgError) {
      throw orgError;
    }

    console.log(`Encontradas ${organizations?.length || 0} organizações`);

    let totalReportsGenerated = 0;
    let totalEmailsSkipped = 0;

    // Para cada organização, verificar se deve gerar relatórios
    for (const org of organizations || []) {
      try {
        // Simulação: assumir que todas as orgs querem relatórios semanais nas segundas
        if (isMonday) {
          console.log(`Processando relatórios semanais para org ${org.id}`);
          
          // Gerar relatórios para cada escopo (academico, crm)
          const scopes = ['academico', 'crm']; // Financeiro só se ERP estiver ativo
          
          for (const scope of scopes) {
            try {
              // Chamar função de geração de PDF
              const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('report-pdf', {
                body: {
                  organization_id: org.id,
                  report_type: scope,
                  filters: {
                    startDate: getWeekStartDate(),
                    endDate: today.toISOString().split('T')[0],
                  },
                  data: [], // Dados serão buscados na função PDF
                },
              });

              if (pdfError) {
                console.error(`Erro ao gerar PDF ${scope} para org ${org.id}:`, pdfError);
                continue;
              }

              totalReportsGenerated++;
              console.log(`PDF ${scope} gerado para org ${org.id}`);

              // Email seria enviado aqui (se provedor configurado)
              // Por enquanto, apenas log
              totalEmailsSkipped++;
              console.log(`Email não enviado (provedor não configurado) para org ${org.id}, relatório ${scope}`);

              // Log de auditoria
              await supabase.from('audit_logs').insert({
                organization_id: org.id,
                table_name: 'bi',
                action: 'scheduled_report_generated',
                diff: { 
                  report_type: scope, 
                  frequency: 'weekly',
                  email_skipped: true,
                  file_path: pdfResult?.filePath || null,
                },
              });

            } catch (scopeError: any) {
              console.error(`Erro ao processar scope ${scope} para org ${org.id}:`, scopeError.message);
            }
          }
        }

        // Relatórios mensais no primeiro dia do mês
        if (isFirstDayOfMonth) {
          console.log(`Processando relatórios mensais para org ${org.id}`);
          
          // Lógica similar aos semanais, mas com período mensal
          const { data: monthlyPdf, error: monthlyError } = await supabase.functions.invoke('report-pdf', {
            body: {
              organization_id: org.id,
              report_type: 'academico',
              filters: {
                startDate: getMonthStartDate(),
                endDate: today.toISOString().split('T')[0],
              },
              data: [],
            },
          });

          if (!monthlyError) {
            totalReportsGenerated++;
            totalEmailsSkipped++;
            
            await supabase.from('audit_logs').insert({
              organization_id: org.id,
              table_name: 'bi',
              action: 'scheduled_report_generated',
              diff: { 
                report_type: 'academico', 
                frequency: 'monthly',
                email_skipped: true,
                file_path: monthlyPdf?.filePath || null,
              },
            });
          }
        }

      } catch (orgError: any) {
        console.error(`Erro ao processar org ${org.id}:`, orgError.message);
      }
    }

    console.log(`Scheduler concluído. Relatórios gerados: ${totalReportsGenerated}, Emails pulados: ${totalEmailsSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scheduler executado com sucesso',
        stats: {
          organizationsProcessed: organizations?.length || 0,
          reportsGenerated: totalReportsGenerated,
          emailsSkipped: totalEmailsSkipped,
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
    console.error('Erro no scheduler de relatórios:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erro interno no scheduler'
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

function getWeekStartDate(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Ajuste para segunda-feira
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getMonthStartDate(): string {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return firstDay.toISOString().split('T')[0];
}

serve(handler);