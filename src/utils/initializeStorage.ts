
import { supabase } from '@/integrations/supabase/client';

const REQUIRED_BUCKETS = [
  {
    id: 'avatars',
    name: 'avatars',
    public: false,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    id: 'docs',
    name: 'docs', 
    public: false,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
];

export const initializeStorageBuckets = async () => {
  try {
    // Verificar se o usuário está autenticado antes de tentar criar buckets
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('Usuario não autenticado, pulando inicialização de buckets');
      return;
    }

    console.log('Verificando buckets existentes...');
    const { data: existingBuckets } = await supabase.storage.listBuckets();
    
    for (const bucketConfig of REQUIRED_BUCKETS) {
      const bucketExists = existingBuckets?.some(bucket => bucket.id === bucketConfig.id);
      
      if (!bucketExists) {
        console.log(`Criando bucket: ${bucketConfig.id}`);
        const { error } = await supabase.storage.createBucket(bucketConfig.id, {
          public: bucketConfig.public,
          fileSizeLimit: bucketConfig.fileSizeLimit,
          allowedMimeTypes: bucketConfig.allowedMimeTypes
        });
        
        if (error) {
          console.error(`Erro ao criar bucket ${bucketConfig.id}:`, error);
        } else {
          console.log(`Bucket ${bucketConfig.id} criado com sucesso`);
        }
      } else {
        console.log(`Bucket ${bucketConfig.id} já existe`);
      }
    }
  } catch (error) {
    console.error('Erro ao inicializar buckets:', error);
  }
};

// Função para inicializar buckets quando necessário (ex: após login)
export const ensureStorageBuckets = async () => {
  await initializeStorageBuckets();
};
