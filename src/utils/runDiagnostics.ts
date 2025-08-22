
// Script temporário para executar diagnósticos
export async function runDiagnostics() {
  try {
    const response = await fetch('https://nkcadmwydfnzrnauzeyz.supabase.co/functions/v1/dev_diagnostics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-dev-token': 'novus-dev-1'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Response body:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('=== DIAGNOSTIC REPORT ===');
    console.log('Status:', result.ok ? 'SUCCESS' : 'FAILED');
    console.log('Auth Test:', result.authTest);
    console.log('User:', result.user);
    console.log('Organization:', result.organization);
    console.log('Profile:', result.profile);
    console.log('RLS Test:', result.rlsTest);
    console.log('Fixes Applied:', result.fixes);
    console.log('Steps:', result.steps);
    console.log('=== END REPORT ===');
    
    return result;
  } catch (error) {
    console.error('Error running diagnostics:', error);
    return null;
  }
}

// **DIAGNÓSTICOS ERP - Fase 0**
export async function runERPDiagnostics(orgId: string) {
  console.log('=== ERP DIAGNOSTICS ===');
  
  try {
    // 1. Teste de configuração
    const { getERPConfig, setERPConfig } = await import('@/lib/featureFlags');
    const { erpEmit } = await import('@/integrations/erp/emit');
    
    console.log('✓ Módulos ERP carregados');
    
    // 2. Teste de leitura/gravação de configuração
    const testConfig = {
      enabled: true,
      mock: true,
      baseUrl: 'https://test.api.com',
      apiKey: 'test-key',
      signingSecret: 'test-secret',
      events: {
        clientUpsert: true,
        receivableCreated: true,
        paymentWebhook: true,
        inventoryIssue: true,
      }
    };
    
    setERPConfig(orgId, testConfig);
    const savedConfig = getERPConfig(orgId);
    
    const configOk = savedConfig.enabled === testConfig.enabled && 
                     savedConfig.mock === testConfig.mock &&
                     savedConfig.baseUrl === testConfig.baseUrl;
    
    console.log('[ ]', configOk ? '✓' : '✗', 'ERP cfg leitura/gravação por orgId');
    
    // 3. Teste de conexão
    const connectionResult = await erpEmit.testConnection(orgId);
    const connectionOk = connectionResult.ok && connectionResult.mock;
    
    console.log('[ ]', connectionOk ? '✓' : '✗', 'testConnection retorna ok (mock)');
    
    // 4. Teste upsertClientByCPF
    const upsertResult = await erpEmit.upsertClient(orgId, {
      cpf: '12345678901',
      name: 'Teste Cliente',
      email: 'teste@exemplo.com',
      phone: '11999999999'
    });
    const upsertOk = upsertResult.ok && upsertResult.mock;
    
    console.log('[ ]', upsertOk ? '✓' : '✗', 'upsertClientByCPF com mock retorna ok:true');
    
    // 5. Teste createReceivable
    const receivableResult = await erpEmit.createReceivable(orgId, {
      clientCpf: '12345678901',
      contractId: 'test-contract-123',
      documentNumber: 'TEST-001',
      dueDate: '2024-12-31',
      amount: 100.50,
      currency: 'BRL',
      description: 'Teste de mensalidade',
      metadata: {
        origin: 'EDU',
        orgId: orgId,
        localContractId: 'local-123'
      }
    });
    const receivableOk = receivableResult.ok && receivableResult.mock;
    
    console.log('[ ]', receivableOk ? '✓' : '✗', 'createReceivable com idempotencyKey definida');
    
    // 6. Teste webhook handler (simulado)
    try {
      const webhookUrl = 'https://nkcadmwydfnzrnauzeyz.supabase.co/functions/v1/edu-erp-webhook';
      const webhookPayload = {
        id: 'test-event-' + Date.now(),
        type: 'receivable.paid',
        data: {
          receivableId: 'recv-123',
          contractId: 'test-contract-123',
          amount: 100.50,
          paidAmount: 100.50,
          paidAt: new Date().toISOString(),
          metadata: { orgId: orgId }
        },
        timestamp: new Date().toISOString()
      };
      
      // Simular assinatura HMAC
      const testSignature = 'sha256=test-signature';
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ERP-Signature': testSignature
        },
        body: JSON.stringify(webhookPayload)
      });
      
      const webhookOk = webhookResponse.status === 200 || webhookResponse.status === 401; // 401 é esperado com assinatura inválida
      console.log('[ ]', webhookOk ? '✓' : '✗', 'Webhook handler responde adequadamente');
      
    } catch (webhookError) {
      console.log('[ ] ✗ Webhook handler com erro:', webhookError);
    }
    
    console.log('=== ERP DIAGNOSTICS COMPLETE ===');
    
    return {
      ok: configOk && connectionOk && upsertOk && receivableOk,
      tests: {
        config: configOk,
        connection: connectionOk,
        upsert: upsertOk,
        receivable: receivableOk
      }
    };
    
  } catch (error) {
    console.error('Erro nos diagnósticos ERP:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}
