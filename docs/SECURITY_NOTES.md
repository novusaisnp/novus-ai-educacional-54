# Notas de Segurança - NOVUS.AI Educacional

## Segurança & LGPD v1 - Implementada em 21/08/2025

### Endurecimento de Autenticação Supabase

**Configurações aplicadas manualmente no Dashboard > Authentication > Settings:**

- ✅ **OTP TTL**: Reduzido para 10 minutos (padrão era 60 min)
- ✅ **Pwned Password Check**: Habilitado para verificar senhas comprometidas
- ✅ **Rate Limiting**: 
  - Sign-in: 5 tentativas por minuto
  - Reset password: 3 tentativas por minuto
- ✅ **Email Confirmation**: Obrigatória para sign-in

### Views Seguras e Políticas RLS

**Views criadas:**
- `public.v_guardians_safe`: Mascara PII (phone/email) por role
- `public.v_profiles_safe`: Dados essenciais de perfis isolados por organização

**Políticas RLS reforçadas:**
- `students`: SELECT isolado por organização + autenticação obrigatória
- `guardians`: Políticas explícitas por operação (SELECT/INSERT/UPDATE/DELETE)
- `profiles`: SELECT isolado por organização + autenticação obrigatória

**Regras de acesso a PII:**
- **Admin/Coordenacao/Secretario**: Acesso completo a dados sensíveis
- **Professor**: Acesso limitado (apenas email de responsáveis)
- **Outros roles**: Dados mascarados/ocultos

### Auditoria de Acesso a PII

**Função implementada:** `public.audit_pii_access()`
- Registra acessos a colunas sensíveis em `audit_logs`
- Acionada automaticamente quando usuários privilegiados visualizam dados completos
- Inclui: entidade acessada, colunas visualizadas, role do usuário, timestamp

### Diagnósticos de Segurança

**Testes disponíveis em `/app/dev/diagnostics`:**
- Teste SELECT students (isolamento por org)
- Teste SELECT v_guardians_safe (mascaramento PII)
- Teste auditoria PII (registro em audit_logs)

### Critérios de Validação

- ✅ Auth endurecida conforme especificação
- ✅ RLS isolando dados por `current_org_id()` + `auth.uid()` obrigatório
- ✅ Views seguras ativas e frontend migrado
- ✅ PII mascarada para roles não autorizadas
- ✅ Auditoria de PII funcionando
- ✅ Diagnostics implementados

### Pontos de Atenção

1. **Não quebrar fluxos existentes**: Frontend migrado para views seguras mantendo UX
2. **Sem dados fake**: UI exibe `-` para campos nulos/mascarados
3. **Multi-tenant**: Todas as queries respeitam `current_org_id()`
4. **Compatibilidade**: Mantida com `useStudents` que já usa `v_students_safe`

---
**Data**: 21 de agosto de 2025  
**Versão**: v1.0