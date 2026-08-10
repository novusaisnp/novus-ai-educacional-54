
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
  status?: string;
  observacoes?: string;
  clienteCpfCnpj?: string;
  recorrente?: boolean;
  periodicidade?: string;
}

interface UpsertContractInput {
  numeroContrato: string;
  titulo: string;
  clienteCpfCnpj?: string;
  dataInicio: string; // YYYY-MM-DD
  dataFim?: string; // YYYY-MM-DD
  valorMensal?: number;
  valorTotal?: number;
  diaVencimento?: number;
  status?: string;
  /** Sempre false por padrão — o Contrato aqui é registro documental/jurídico
   * no ERP, não deve disparar o trigger `gerar_titulo_inicial_contrato` de lá
   * quando a cobrança já acontece por outro caminho (ex. título avulso
   * recorrente). Só passe true se NENHUM título já estiver sendo emitido
   * separadamente para este contrato — senão duplica a cobrança. */
  geraFinanceiro?: boolean;
  observacoes?: string;
  /** Estável, gerado pelo satélite — protege contra duplicar o Contrato em
   * retry de webhook. Sem isso o ERP usa um fallback derivado, menos robusto. */
  idempotencyKey?: string;
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
          'x-empresa-id': this.config.empresaRepresentadaId,
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
    // Nomes de coluna reais em `clientes` no ERP são em português (nome/telefone),
    // não os campos em inglês da interface local — traduzir na borda.
    return this.sendSyncEvent('clientes', {
      cpf: data.cpf,
      nome: data.name,
      email: data.email,
      telefone: data.phone,
    });
  }

  async createReceivable(data: CreateReceivableInput): Promise<ERPClientResponse> {
    if (!this.config.events.receivableCreated) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }
    return this.sendSyncEvent('contas_receber', {
      numero_documento: data.numeroDocumento,
      valor_original: data.valorOriginal,
      data_vencimento: data.dataVencimento,
      status: data.status || 'PENDENTE',
      observacoes: data.observacoes,
      cliente_cpf_cnpj: data.clienteCpfCnpj,
      recorrente: data.recorrente,
      periodicidade: data.periodicidade,
    });
  }

  async upsertContract(data: UpsertContractInput): Promise<ERPClientResponse> {
    if (!this.config.events.contractUpsert) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }
    return this.sendSyncEvent('contratos', {
      numero_contrato: data.numeroContrato,
      titulo: data.titulo,
      cliente_cpf_cnpj: data.clienteCpfCnpj,
      data_inicio: data.dataInicio,
      data_fim: data.dataFim,
      valor_mensal: data.valorMensal,
      valor_total: data.valorTotal,
      dia_vencimento: data.diaVencimento,
      status: data.status || 'ATIVO',
      gera_financeiro: data.geraFinanceiro ?? false,
      observacoes: data.observacoes,
      idempotency_key: data.idempotencyKey,
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
  upsertContract: async (orgId: string, data: UpsertContractInput): Promise<ERPClientResponse> => {
    const config = await getERPConfig(orgId);
    return new ERPClient(config).upsertContract(data);
  },
  testConnection: async (orgId: string): Promise<ERPClientResponse> => {
    const config = await getERPConfig(orgId);
    return new ERPClient(config).testConnection();
  },
};

export type { ERPClientData, CreateReceivableInput, UpsertContractInput, ERPClientResponse };
