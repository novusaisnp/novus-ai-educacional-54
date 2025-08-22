-- Add user_id and cpf to guardians table for portal authentication
ALTER TABLE public.guardians 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN cpf TEXT;

-- Create index for performance
CREATE INDEX idx_guardians_user_id ON public.guardians(user_id);
CREATE INDEX idx_guardians_cpf ON public.guardians(cpf);

-- Create function to get current guardian ID
CREATE OR REPLACE FUNCTION public.current_guardian_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
  SELECT g.id
  FROM auth.users au
  JOIN public.guardians g ON g.user_id = au.id
  WHERE au.id = auth.uid()
  LIMIT 1;
$function$;

-- Update RLS policies for guardians - guardians can only see themselves
DROP POLICY IF EXISTS "guardians_select_isolated" ON public.guardians;
CREATE POLICY "guardians_select_portal" 
ON public.guardians 
FOR SELECT 
USING (
  is_authenticated() AND 
  organization_id = current_org_id() AND 
  (
    get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) OR
    user_id = auth.uid()
  )
);

-- Update interactions RLS for guardians
CREATE POLICY "guardians_can_view_own_interactions" 
ON public.interactions 
FOR SELECT 
USING (
  is_authenticated() AND 
  organization_id = current_org_id() AND 
  (
    get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario', 'professor']) OR
    (entity_type = 'guardian' AND entity_id = current_guardian_id())
  )
);

CREATE POLICY "guardians_can_create_interactions" 
ON public.interactions 
FOR INSERT 
WITH CHECK (
  organization_id = current_org_id() AND 
  entity_type = 'guardian' AND 
  entity_id = current_guardian_id()
);

-- Update requests RLS for guardians
CREATE POLICY "guardians_can_view_own_requests" 
ON public.requests 
FOR SELECT 
USING (
  is_authenticated() AND 
  organization_id = current_org_id() AND 
  (
    get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) OR
    (requester_type = 'guardian' AND requester_id = current_guardian_id())
  )
);

CREATE POLICY "guardians_can_create_requests" 
ON public.requests 
FOR INSERT 
WITH CHECK (
  organization_id = current_org_id() AND 
  requester_type = 'guardian' AND 
  requester_id = current_guardian_id()
);

-- Update documents RLS for guardians
CREATE POLICY "guardians_can_view_own_documents" 
ON public.documents 
FOR SELECT 
USING (
  is_authenticated() AND 
  organization_id = current_org_id() AND 
  (
    get_current_user_role() = ANY(ARRAY['admin', 'coordenacao', 'secretario']) OR
    (owner_type = 'guardian' AND owner_id = current_guardian_id())
  )
);

CREATE POLICY "guardians_can_upload_documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (
  organization_id = current_org_id() AND 
  owner_type = 'guardian' AND 
  owner_id = current_guardian_id()
);