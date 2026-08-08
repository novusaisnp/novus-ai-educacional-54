-- Corrige typo na CHECK constraint original de profiles.role: a migration
-- 20250812134534/20250812134552 criou a constraint com 'secretaria', mas
-- todo o resto do sistema desde então (RLS, useUserRole.ts, AppShell.tsx)
-- usa 'secretario'. Nunca disparou porque só existe perfil 'admin' em uso
-- real hoje. Sem dado a migrar (confirmado via SELECT DISTINCT role).
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'coordenacao'::text, 'professor'::text, 'secretario'::text, 'responsavel'::text]));
