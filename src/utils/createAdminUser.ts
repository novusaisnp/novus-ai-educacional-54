import { SUPABASE_URL } from '@/integrations/supabase/client';

export async function createAdminUser() {
  try {
    console.log('Iniciando criação do usuário admin via Edge Function...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create_admin_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': 'seed-setup-1'
      },
      body: JSON.stringify({
        email: 'selftnt@gmail.com',
        password: '388030',
        full_name: 'Dev Admin',
        organization_name: 'NOVUS.AI - Escola Teste'
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Erro na criação do usuário');
    }

    console.log('Usuário admin criado com sucesso:', result);
    return {
      success: true,
      message: 'Usuário admin criado com sucesso! Você pode fazer login agora.',
      ...result
    };

  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      error
    };
  }
}