-- Cadastro de equipe (professor/coordenacao/secretario): profiles ganha cpf e email.
--
-- cpf: identidade da pessoa fisica, mesmo principio ja aplicado a guardians.cpf (nunca
-- fabricar valor fake) -- campo que resolvera o vinculo com o Colaborador do ERP quando
-- essa fatia (cross-repo) for construida futuramente. Nullable porque admin/responsavel
-- existentes nao tem CPF cadastrado hoje.
--
-- email: profiles nao tinha nenhuma coluna de email (mora so em auth.users, ilegivel pelo
-- client sem admin API). Denormalizado de proposito, mesmo padrao ja usado em
-- guardians.email (tabela propria com email duplicado do auth), para a tela de listagem
-- de equipe poder mostrar para quem foi o convite sem precisar de outra chamada admin.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;
