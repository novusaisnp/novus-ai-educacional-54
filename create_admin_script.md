# Script para Criar Usuário Admin

## Configuração dos Secrets

Primeiro, configure o token de admin nas variáveis de ambiente do Supabase:

```bash
# No terminal ou através do dashboard do Supabase
ADMIN_SEED_TOKEN=<gere-um-token-forte-e-mantenha-fora-do-git>
```

## Chamada para Criar o Usuário

Execute este comando para criar o usuário admin (substitua os placeholders pelos seus valores reais, sem commitá-los):

```bash
curl -X POST "https://ixnpotaccbpcbritxlud.supabase.co/functions/v1/create_admin_user" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: <ADMIN_SEED_TOKEN>" \
  -d '{
    "email": "<admin-email>",
    "password": "<admin-password>",
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

1. Teste o login com as credenciais que você definiu acima
2. Acesse `/app/dashboard` para verificar se funciona
3. Remova ou rotacione o `ADMIN_SEED_TOKEN` por segurança

> ⚠️ **Nota de segurança**: este arquivo continha anteriormente um e-mail, senha e `ADMIN_SEED_TOKEN` reais em texto puro, commitados no histórico do repositório desde o commit inicial. Se essas credenciais ainda estiverem ativas, rotacione-as no Supabase (troque a senha do usuário admin e gere um novo `ADMIN_SEED_TOKEN`).

## Ajuste Manual no Dashboard

No Dashboard do Supabase → Authentication → Email Templates ou Settings:
- Reduza o **OTP expiry** para **10 minutos** (atualmente está muito alto)

## Validação de Segurança

Após criar o usuário, verifique:
- ✅ Login com o e-mail admin criado funciona
- ✅ Acesso ao dashboard permitido
- ✅ Consultas anônimas nas tabelas sensíveis retornam 403/401
- ✅ Usuário logado só vê dados da própria organização
- ✅ Funções `current_org_id()` e `is_authenticated()` funcionando