
import { getERPConfig, ERPConfig } from '@/lib/featureFlags';

const SOURCE_SYSTEM = 'novus-educacional';
const SYNC_ENDPOINT = '/functions/v1/sync-webhook';

interface ERPClientData {
  cpf: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface CreateReceivableInput {
  numeroDocumento: string;
  valorOriginal: number;
  dataVencimento: string; // YYYY-MM-DD
  situacao?: string;
  observacoes?: string;
  clienteCpfCnpj?: string;
  // Campos de forward-compatibility: o `syncFinanceiro` do novusai-erp ainda não
  // mapeia `recorrente`/`periodicidade` no insert de `contas_receber` (bug
  // conhecido, ver docs/STATUS.md) — enviar esses campos hoje é inofensivo
  // (chave extra de JSON ignorada) e evita qualquer mudança de código deste lado
  // quando o bug for corrigido do lado do ERP.
  recorrente?: boolean;
  periodicidade?: string;
}

interface ERPClientResponse {
  ok: boolean;
  skipped?: boolean;
  mock?: boolean;
  data?: unknown;
  error?: string;
}

async function signBody(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

class ERPClient {
  constructor(private config: ERPConfig) {}

  private async sendSyncEvent(
    table: string,
    data: Record<string, unknown>,
    event: 'insert' | 'update' | 'sync' = 'sync'
  ): Promise<ERPClientResponse> {
    if (!this.config.enabled) {
      return { ok: true, skipped: true };
    }

    if (this.config.mock) {
      console.log(`[ERP Mock] ${event} ${table}:`, data);
      return { ok: true, mock: true };
    }

    if (!this.config.baseUrl || !this.config.signingSecret) {
      return { ok: false, error: 'Integração ERP não configurada (URL base ou signing secret ausente)' };
    }

    const body = JSON.stringify({
      event,
      table,
      data,
      timestamp: new Date().toISOString(),
      source_system: SOURCE_SYSTEM,
    });
    const signature = await signBody(body, this.config.signingSecret);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.config.baseUrl}${SYNC_ENDPOINT}`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-source-system': SOURCE_SYSTEM,
          'x-webhook-signature': `sha256=${signature}`,
        },
        body,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.text();
        console.error(`[ERP] Erro ao sincronizar ${table}:`, error);
        return { ok: false, error: `ERP Error: ${error}` };
      }

      const responseData = await response.json().catch(() => undefined);
      return { ok: true, data: responseData };
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[ERP] Erro ao sincronizar ${table}:`, error);
      return { ok: false, error: message };
    }
  }

  async upsertClientByCPF(data: ERPClientData): Promise<ERPClientResponse> {
    if (!this.config.events.clientUpsert) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }
    return this.sendSyncEvent('clientes', { ...data });
  }

  async createReceivable(data: CreateReceivableInput): Promise<ERPClientResponse> {
    if (!this.config.events.receivableCreated) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }
    return this.sendSyncEvent('contas_receber', {
      numero_documento: data.numeroDocumento,
      valor_original: data.valorOriginal,
      data_vencimento: data.dataVencimento,
      situacao: data.situacao || 'ABERTA',
      observacoes: data.observacoes,
      cliente_cpf_cnpj: data.clienteCpfCnpj,
      recorrente: data.recorrente,
      periodicidade: data.periodicidade,
    });
  }

  async testConnection(): Promise<ERPClientResponse> {
    if (!this.config.enabled) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }

    if (this.config.mock) {
      return { ok: true, mock: true };
    }

    if (!this.config.baseUrl) {
      return { ok: false, error: 'URL base do ERP não configurada' };
    }

    try {
      // Não existe endpoint de health dedicado no ERP; um OPTIONS no endpoint
      // real (sync-webhook) só confirma alcançabilidade, não valida a assinatura.
      const response = await fetch(`${this.config.baseUrl}${SYNC_ENDPOINT}`, { method: 'OPTIONS' });
      if (!response.ok) {
        return { ok: false, error: `Endpoint respondeu com status ${response.status}` };
      }
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { ok: false, error: message };
    }
  }
}

export const erpClient = {
  upsertClientByCPF: async (orgId: string, data: ERPClientData): Promise<ERPClientResponse> => {
    const config = await getERPConfig(orgId);
    return new ERPClient(config).upsertClientByCPF(data);
  },
  createReceivable: async (orgId: string, data: CreateReceivableInput): Promise<ERPClientResponse> => {
    const config = await getERPConfig(orgId);
    return new ERPClient(config).createReceivable(data);
  },
  testConnection: async (orgId: string): Promise<ERPClientResponse> => {
    const config = await getERPConfig(orgId);
    return new ERPClient(config).testConnection();
  },
};

export type { ERPClientData, CreateReceivableInput, ERPClientResponse };
