
-- Função para vincular usuário a responsável existente baseado no email
CREATE OR REPLACE FUNCTION public.link_user_to_guardian()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
BEGIN
  -- Verificar se existe um responsável com o mesmo email do usuário
  UPDATE public.guardians 
  SET user_id = NEW.id,
      updated_at = now()
  WHERE email = NEW.email 
    AND user_id IS NULL
    AND organization_id IS NOT NULL;
    
  -- Se não encontrou responsável por email, criar um novo baseado nos metadados
  IF NOT FOUND AND NEW.raw_user_meta_data IS NOT NULL THEN
    INSERT INTO public.guardians (
      user_id,
      name,
      email,
      phone,
      organization_id
    )
    SELECT 
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      -- Usar a primeira organização disponível se não especificada
      -- Em produção, isso deveria ser definido de forma mais específica
      (SELECT id FROM public.organizations LIMIT 1)
    WHERE NEW.raw_user_meta_data->>'role' = 'guardian';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para executar a função após inserção de usuário
DROP TRIGGER IF EXISTS on_auth_user_created_link_guardian ON auth.users;

CREATE TRIGGER on_auth_user_created_link_guardian
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.link_user_to_guardian();

-- Corrigir o vínculo do usuário existente (MAXWELL ROGER DE OLIVEIRA)
UPDATE public.guardians 
SET user_id = '08705190-d799-446b-9f62-3d2baf32039b',
    updated_at = now()
WHERE email = 'selftnt@gmail.com' 
  AND name = 'MAXWELL ROGER DE OLIVEIRA'
  AND user_id IS NULL;
