# Script para Criar Usuário Admin

## Configuração dos Secrets

Primeiro, configure o token de admin nas variáveis de ambiente do Supabase:

```bash
# No terminal ou através do dashboard do Supabase
ADMIN_SEED_TOKEN=seed-setup-1
```

## Chamada para Criar o Usuário

Execute este comando para criar o usuário admin:

```bash
curl -X POST "https://nkcadmwydfnzrnauzeyz.supabase.co/functions/v1/create_admin_user" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: seed-setup-1" \
  -d '{
    "email": "selftnt@gmail.com",
    "password": "388030",
    "full_name": "Dev Admin",
    "organization_name": "NOVUS.AI - Escola Teste"
  }'
```

## Resposta Esperada

Sucesso (200):
```json
{
  "success": true,
  "userId": "uuid-do-usuario",
  "organization_id": "uuid-da-organizacao",
  "message": "Admin user created successfully"
}
```

## Pós-Criação

1. Teste o login com `selftnt@gmail.com` / `388030`
2. Acesse `/app/dashboard` para verificar se funciona
3. (Opcional) Remova ou rotacione o `ADMIN_SEED_TOKEN` por segurança

## Ajuste Manual no Dashboard

No Dashboard do Supabase → Authentication → Email Templates ou Settings:
- Reduza o **OTP expiry** para **10 minutos** (atualmente está muito alto)

## Validação de Segurança

Após criar o usuário, verifique:
- ✅ Login com selftnt@gmail.com funciona
- ✅ Acesso ao dashboard permitido
- ✅ Consultas anônimas nas tabelas sensíveis retornam 403/401
- ✅ Usuário logado só vê dados da própria organização
- ✅ Funções `current_org_id()` e `is_authenticated()` funcionando