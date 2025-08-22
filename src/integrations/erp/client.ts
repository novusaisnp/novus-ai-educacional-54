
import { getERPConfig, ERPConfig } from '@/lib/featureFlags';

interface ERPClientData {
  cpf: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface ERPClientResponse {
  ok: boolean;
  skipped?: boolean;
  mock?: boolean;
  error?: string;
}

class ERPClient {
  private config: ERPConfig;
  private orgId: string;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.config = getERPConfig(orgId);
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Implementar timeout usando AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async upsertClientByCPF(data: ERPClientData): Promise<ERPClientResponse> {
    if (!this.config.enabled || !this.config.events.clientUpsert) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }

    if (this.config.mock) {
      console.log('[ERP Mock] Upserting client:', data);
      return { ok: true, mock: true };
    }

    try {
      const response = await this.makeRequest('/clients', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[ERP] Error upserting client:', error);
        return { ok: false, error: `ERP Error: ${error}` };
      }

      return { ok: true };
    } catch (error: any) {
      console.error('[ERP] Error upserting client:', error);
      return { ok: false, error: error.message };
    }
  }

  async createReceivable(data: any): Promise<ERPClientResponse> {
    if (!this.config.enabled || !this.config.events.receivableCreated) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }

    if (this.config.mock) {
      console.log('[ERP Mock] Creating receivable:', data);
      return { ok: true, mock: true };
    }

    try {
      const response = await this.makeRequest('/receivables', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[ERP] Error creating receivable:', error);
        return { ok: false, error: `ERP Error: ${error}` };
      }

      return { ok: true };
    } catch (error: any) {
      console.error('[ERP] Error creating receivable:', error);
      return { ok: false, error: error.message };
    }
  }

  async inventoryIssue(data: any): Promise<ERPClientResponse> {
    if (!this.config.enabled || !this.config.events.inventoryIssue) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }

    if (this.config.mock) {
      console.log('[ERP Mock] Inventory issue:', data);
      return { ok: true, mock: true };
    }

    try {
      const response = await this.makeRequest('/inventory/issue', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[ERP] Error with inventory issue:', error);
        return { ok: false, error: `ERP Error: ${error}` };
      }

      return { ok: true };
    } catch (error: any) {
      console.error('[ERP] Error with inventory issue:', error);
      return { ok: false, error: error.message };
    }
  }

  async testConnection(): Promise<ERPClientResponse> {
    if (!this.config.enabled) {
      return { ok: true, skipped: true, mock: this.config.mock };
    }

    if (this.config.mock) {
      console.log('[ERP Mock] Testing connection');
      return { ok: true, mock: true };
    }

    try {
      const response = await this.makeRequest('/health');

      if (!response.ok) {
        const error = await response.text();
        console.error('[ERP] Connection test failed:', error);
        return { ok: false, error: `ERP Error: ${error}` };
      }

      return { ok: true };
    } catch (error: any) {
      console.error('[ERP] Connection test failed:', error);
      return { ok: false, error: error.message };
    }
  }
}

// Exportar instância singleton
export const erpClient = {
  upsertClientByCPF: async (orgId: string, data: ERPClientData): Promise<ERPClientResponse> => {
    const client = new ERPClient(orgId);
    return client.upsertClientByCPF(data);
  },
  createReceivable: async (orgId: string, data: any): Promise<ERPClientResponse> => {
    const client = new ERPClient(orgId);
    return client.createReceivable(data);
  },
  inventoryIssue: async (orgId: string, data: any): Promise<ERPClientResponse> => {
    const client = new ERPClient(orgId);
    return client.inventoryIssue(data);
  },
  testConnection: async (orgId: string): Promise<ERPClientResponse> => {
    const client = new ERPClient(orgId);
    return client.testConnection();
  },
};

// Manter compatibilidade com export anterior
export const erpEmit = {
  upsertClient: async (orgId: string, data: ERPClientData): Promise<ERPClientResponse> => {
    return erpClient.upsertClientByCPF(orgId, data);
  },
};
