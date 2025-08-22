-- Fix search path security warnings by updating functions
DROP FUNCTION IF EXISTS public.current_org_id();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate current_org_id function with proper search path
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- Recreate update_updated_at_column function with proper search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;