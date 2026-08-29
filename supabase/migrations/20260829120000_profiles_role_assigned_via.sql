-- Cargo do ERP -> role sugerida no satélite (retomada de
-- C:\Users\maxwe\.claude\plans\fancy-painting-mochi.md, passo 3). Registra a origem da
-- role atribuída no convite -- sugestão aceita, sobrescrita manual, ou sem sugestão do
-- ERP (organização sem integração real, ou colaborador sem cargo/categoria cadastrada).
-- Mesmo padrão aditivo de 20260811030000_senha_pendente_staff.sql.
ALTER TABLE public.profiles
  ADD COLUMN role_assigned_via text NOT NULL DEFAULT 'no_erp_suggestion'
    CHECK (role_assigned_via IN ('erp_suggestion', 'manual_override', 'no_erp_suggestion')),
  ADD COLUMN erp_suggested_role text NULL;
