import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useBIAccess } from '@/hooks/useBIAccess';
import { useState } from 'react';
import { logger } from '@/lib/logger';
import { logAudit } from '@/lib/audit/logAudit';
import { useOrganization } from '@/hooks/useOrganization';
import { safeToast } from '@/lib/safeToast';
import { supabase } from '@/integrations/supabase/client';
import { toCsv, downloadCsv } from '@/lib/csv';

interface ExportToolbarProps {
  reportType: 'academico' | 'financeiro' | 'crm';
  data: any[];
  filters?: Record<string, any>;
  csvColumns?: Array<{
    key: string;
    label: string;
    format?: (value: any) => string;
  }>;
}

export function ExportToolbar({
  reportType,
  data,
  filters = {},
  csvColumns = [],
}: ExportToolbarProps) {
  const { canExport } = useBIAccess();
  const { data: orgData } = useOrganization();
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  if (!canExport) {
    return null;
  }

  const handleCSVExport = () => {
    try {
      if (!data || data.length === 0) {
        safeToast({
          variant: 'destructive',
          title: 'Nenhum dado para exportar',
        });
        return;
      }

      // Usar colunas fornecidas ou gerar automaticamente
      const columns = csvColumns.length > 0 ? csvColumns : 
        Object.keys(data[0]).map(key => ({ key, label: key }));

      const csvContent = toCsv(data, columns);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${reportType}-${timestamp}.csv`;
      
      downloadCsv(csvContent, filename);

      // Log da ação
      logger.info('bi_csv_export', { reportType, recordCount: data.length });
      
      // Auditoria
      if (orgData?.organization_id) {
        logAudit({
          organization_id: orgData.organization_id,
          table_name: 'bi',
          action: 'export_csv',
          diff: { reportType, filters, recordCount: data.length },
        });
      }

      safeToast({
        title: 'CSV exportado com sucesso',
        description: `${data.length} registros exportados`,
      });
    } catch (error: any) {
      logger.error('Erro ao exportar CSV', { error: error.message });
      safeToast({
        variant: 'destructive',
        title: 'Erro ao exportar CSV',
        description: error.message,
      });
    }
  };

  const handlePDFExport = async () => {
    try {
      setIsExportingPDF(true);

      if (!orgData?.organization_id) {
        throw new Error('Organização não identificada');
      }

      const { data: result, error } = await supabase.functions.invoke('report-pdf', {
        body: {
          organization_id: orgData.organization_id,
          report_type: reportType,
          filters,
          data: data.slice(0, 100), // Limitar dados para evitar payload muito grande
        },
      });

      if (error) {
        throw error;
      }

      if (result?.downloadUrl) {
        // Abrir URL de download em nova aba
        window.open(result.downloadUrl, '_blank');
        
        safeToast({
          title: 'PDF gerado com sucesso',
          description: 'O download começará automaticamente',
        });
      }

      // Log da ação
      logger.info('bi_pdf_export', { reportType, recordCount: data.length });
      
      // Auditoria
      logAudit({
        organization_id: orgData.organization_id,
        table_name: 'bi',
        action: 'export_pdf',
        diff: { reportType, filters, recordCount: data.length },
      });

    } catch (error: any) {
      logger.error('Erro ao exportar PDF', { error: error.message });
      safeToast({
        variant: 'destructive',
        title: 'Erro ao exportar PDF',
        description: error.message,
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCSVExport}
        disabled={!data || data.length === 0}
      >
        <Download className="h-4 w-4 mr-2" />
        Exportar CSV
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handlePDFExport}
        disabled={!data || data.length === 0 || isExportingPDF}
      >
        {isExportingPDF ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <FileText className="h-4 w-4 mr-2" />
        )}
        Exportar PDF
      </Button>
    </div>
  );
}