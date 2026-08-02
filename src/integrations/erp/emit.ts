
/**
 * Emissor de eventos ERP
 * Wrapper central para todas as chamadas ERP
 * Gerencia logs discretos e controle de erros
 */

import { erpClient } from './client';
import { getERPConfig } from '@/lib/featureFlags';
import { toast } from '@/hooks/use-toast';

export interface ERPResult {
  ok: boolean;
  skipped?: boolean;
  mock?: boolean;
  data?: any;
  error?: string;
}

export async function withERP(
  orgId: string,
  fnName: keyof typeof erpClient,
  args: any[]
): Promise<ERPResult> {
  try {
    const config = await getERPConfig(orgId);

    // Se integração não habilitada, pular
    if (!config.enabled) {
      console.log(`[ERP] Integração desabilitada para ${String(fnName)}`);
      return { ok: true, skipped: true };
    }

    // Executar função do cliente ERP
    const clientMethod = erpClient[fnName] as Function;
    if (!clientMethod) {
      console.error(`[ERP] Método ${String(fnName)} não encontrado`);
      return { ok: false, error: `Método ${String(fnName)} não implementado` };
    }

    const result = await clientMethod.apply(erpClient, [orgId, ...args]);
    
    // Log discreto para auditoria
    if (result.mock) {
      console.log(`[ERP] ${String(fnName)} executado em modo simulado`);
      toast({
        title: 'Ação executada em modo simulado',
        description: `${String(fnName)} foi executado em modo de teste.`,
      });
    } else if (result.ok) {
      console.log(`[ERP] ${String(fnName)} executado com sucesso`);
    } else {
      console.warn(`[ERP] ${String(fnName)} falhou:`, result.error);
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`[ERP] Erro em ${String(fnName)}:`, error);
    
    return {
      ok: false,
      error: errorMessage,
    };
  }
}

// Helpers específicos para eventos comuns
export const erpEmit = {
  async upsertClient(orgId: string, clientData: any) {
    return withERP(orgId, 'upsertClientByCPF', [clientData]);
  },

  async createReceivable(orgId: string, receivableData: any) {
    return withERP(orgId, 'createReceivable', [receivableData]);
  },

  async testConnection(orgId: string) {
    return withERP(orgId, 'testConnection', []);
  },
};
