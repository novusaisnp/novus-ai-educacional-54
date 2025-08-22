
import { supabase } from '@/integrations/supabase/client';

export async function createDevUser() {
  try {
    console.log('Iniciando criação do usuário desenvolvedor...');

    // Primeiro, verificar se já existe uma organização ou criar uma
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError) {
      console.error('Erro ao buscar organizações:', orgError);
      throw orgError;
    }

    let organizationId = organizations?.[0]?.id;

    if (!organizationId) {
      // Criar organização se não existir
      const { data: newOrg, error: createOrgError } = await supabase
        .from('organizations')
        .insert([{ name: 'NOVUS DEV ORG' }])
        .select('id')
        .single();

      if (createOrgError) {
        console.error('Erro ao criar organização:', createOrgError);
        throw createOrgError;
      }

      organizationId = newOrg.id;
      console.log('Organização criada:', organizationId);
    }

    // Verificar se o usuário já existe tentando fazer login
    const { data: existingAuth } = await supabase.auth.signInWithPassword({
      email: 'selftnt@gmail.com',
      password: '388030'
    });

    if (existingAuth.user) {
      console.log('Usuário desenvolvedor já existe e pode fazer login');
      
      // Verificar se o perfil existe e está correto
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', existingAuth.user.id)
        .single();

      if (!profile && !profileError) {
        // Criar perfil se não existir
        await supabase
          .from('profiles')
          .insert([{
            id: existingAuth.user.id,
            organization_id: organizationId,
            full_name: 'Dev Admin',
            role: 'admin'
          }]);
      }

      return { 
        success: true, 
        message: 'Usuário desenvolvedor já existe e está configurado',
        userId: existingAuth.user.id,
        organizationId 
      };
    }

    // Se chegou aqui, o usuário não existe, então vamos criá-lo
    console.log('Usuário não existe, criando...');

    // Criar usuário usando signUp com confirmação automática
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'selftnt@gmail.com',
      password: '388030',
      options: {
        data: {
          full_name: 'Dev Admin'
        },
        emailRedirectTo: `${window.location.origin}/app/dashboard`
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário auth:', authError);
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Usuário não foi criado');
    }

    console.log('Usuário auth criado:', authData.user.id);

    // Aguardar um pouco para garantir que o usuário foi criado
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Criar perfil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        organization_id: organizationId,
        full_name: 'Dev Admin',
        role: 'admin'
      }])
      .select()
      .single();

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Tentar buscar perfil existente (pode ter sido criado por trigger)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (existingProfile) {
        // Atualizar o perfil existente
        await supabase
          .from('profiles')
          .update({
            organization_id: organizationId,
            role: 'admin',
            full_name: 'Dev Admin'
          })
          .eq('id', authData.user.id);

        console.log('Perfil atualizado com sucesso');
      } else {
        throw profileError;
      }
    } else {
      console.log('Perfil criado:', profile);
    }

    return {
      success: true,
      message: 'Usuário desenvolvedor criado com sucesso! Você pode fazer login agora.',
      userId: authData.user.id,
      organizationId
    };

  } catch (error) {
    console.error('Erro geral na criação do usuário:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      error
    };
  }
}
