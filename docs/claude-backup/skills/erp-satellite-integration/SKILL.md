---
name: erp-satellite-integration
description: Como qualquer satélite NOVUS.AI (educacional, PDV, frente de caixa, CRM de receita/relacionamento, ou outro futuro) deve se conectar ao ERP (novusai-erp) — modelo de 3 portas, payloads reais verificados em código, assinatura HMAC, e bugs conhecidos do lado do ERP. Use antes de implementar ou depurar qualquer integração push/pull entre um satélite e o ERP.
---

# Integração satélite ↔ NOVUS.AI ERP

O ERP (`novusai-erp`) é o hub administrativo/financeiro/fiscal do ecossistema NOVUS.AI. Qualquer satélite (app vertical de nicho — educacional, PDV, frente de caixa, CRM de receita/relacionamento etc.) não recria financeiro/fiscal/RH: só consome o ERP como back-office via um modelo de **3 portas**. Esta skill documenta o que foi verificado direto no código do ERP (`supabase/functions/sync-webhook/index.ts` e migrations), não só a documentação — quando os dois divergem, **o código manda** (regra explícita do próprio `CLAUDE.md` do ERP).

## As 3 portas

1. **Porta 1 — Título** (push satélite → ERP): documento financeiro genérico, `contas_receber`/`contas_pagar`. O "gerador" (Venda ou Contrato) é metadado opcional, nunca pré-requisito.
2. **Porta 2 — Liquidação** (push ERP → satélite, via webhook de entrada no satélite): evento de pagamento. Tabela real no ERP: `liquidacoes_titulos`.
3. **Porta 3 — Consulta/Autorização** (pull síncrono, satélite pergunta ao ERP antes de agir): formato `preflightResponseSchema` (`supabase/functions/_shared/canonical/preflight.ts` no ERP) — `{ autorizado, bloqueios: [{ codigo, motivo, pode_ser_superado, permissao_necessaria }] }`. Hoje só implementada para `validar_saldo_estoque` e `verificar_autorizacao_venda`/`autorizar_excecao_venda`. Um satélite novo que precise de uma autorização diferente (ex: "pode emitir este contrato?") precisa propor um novo caso seguindo esse mesmo formato — não existe genérico.

## Endpoint real de ingestão (Porta 1)

Não existe função dedicada por entidade — tudo entra por **`supabase/functions/sync-webhook/index.ts`** no ERP, dispatch por `payload.table`:

```
POST {erp_base_url}/functions/v1/sync-webhook
Headers:
  Content-Type: application/json
  x-source-system: <nome do satélite, ex: "novus-educacional">
  x-webhook-signature: sha256=<hex HMAC-SHA256 do corpo bruto>
Body:
  { event: "insert"|"update"|"sync", table: "<nome>", data: {...}, timestamp, source_system }
```

Assinatura: HMAC-SHA256 sobre o **corpo bruto** (string do JSON já serializado, antes de qualquer parse), usando o `secret_token` cadastrado em `webhook_configs` (ver abaixo). Implementação de referência já pronta e testada em produção: `novus-educacional/src/integrations/erp/client.ts` (`signBody`, `sendSyncEvent`) — **copie esse arquivo como ponto de partida pra qualquer satélite novo**, é o cliente HTTP+HMAC já validado ponta a ponta.

### Pré-requisito: `webhook_configs`

Toda origem precisa de uma linha em `webhook_configs` no ERP (`empresa_representada_id`, `nome` = valor de `x-source-system`, `secret_token`, `ativo=true`) — sem isso o `sync-webhook` rejeita com 401/403 antes mesmo de processar. Isso é cadastrado do lado do ERP, não do satélite — coordenar com quem administra o projeto Supabase do ERP.

### `empresa_representada_id`

Identificador multi-tenant do ERP — toda tabela do ERP tem essa coluna com RLS aplicada sobre ela. É o UUID do tenant (empresa/cliente do ERP) ao qual pertence cada registro enviado pelo satélite. Cada organização do satélite precisa mapear pra um `empresa_representada_id` real (config manual, um campo por organização — ver `erp_integration_config` em `novus-educacional` como exemplo de onde guardar isso).

## Payloads reais por entidade (verificado em código, `sync-webhook/index.ts`)

### `clientes` (upsert de cliente/responsável financeiro)
Função `mapClienteData` — aceita `nome`/`razao_social`, `cpf_cnpj`/`cpf`/`cnpj`, `email`, `telefone`, `rg`, `data_nascimento`, resolve `tipo` (`F`/`J`) a partir de ter `cpf` ou não. **Regra de negócio importante**: o cliente do ERP é sempre quem responde financeiramente — no satélite educacional, é sempre o responsável/guardião, nunca o aluno menor (menor não pode ser parte de contrato financeiro).

### `contas_receber` (Título — Porta 1, único caso 100% funcional hoje)
Função `syncFinanceiro`. Campos realmente gravados: `numero_documento` (ou `id`), `cliente_id` (resolvido via `external_id`/`cpf_cnpj` — precisa que o cliente já exista), `venda_id`/`contrato_id` (resolvidos por `numero_venda`/`numero_contrato`, `null` se não achar — resolução usa `.single()`, então se você mandar um `venda_id`/`contrato_id` que não existe no ERP, a query solta erro em vez de seguir sem vínculo), `data_emissao`, `data_vencimento`, `data_pagamento`, `valor_original`, `valor_pago`, `valor_desconto`, **`situacao`** (não `status` — apesar do `CLAUDE.md` do próprio ERP dizer "contas_receber usa status, nunca situacao", o código de fato grava em `situacao`; documentação e código divergem, siga o código), `forma_pagamento`, `observacoes`.

**Ganchos pra recorrência** (campos que existem na tabela real e são lidos pelo job `job-recorrencias`, mas que `syncFinanceiro` **não mapeia** hoje — bug conhecido, ver seção de bugs abaixo): `recorrente boolean`, `periodicidade text`. Envie-os de qualquer forma no payload — são inofensivos até o bug ser corrigido (chave extra de JSON ignorada), e nenhuma mudança de código será necessária no satélite quando o ERP for corrigido.

### `contratos` (Contrato recorrente — **quebrado hoje, não usar até o bug ser corrigido**)
Função `syncContrato`. Ver bug crítico abaixo — não tente sincronizar Contrato via este endpoint até o ERP ser corrigido.

## 🚨 Bugs confirmados no `novusai-erp` (código lido diretamente, não é suposição)

1. **`syncContrato` nunca popula a coluna `titulo`**, que é `NOT NULL` na tabela `public.contratos` (migration `20260710181733`). Qualquer tentativa de criar um Contrato via `sync-webhook` falha sempre, não importa o payload enviado pelo satélite. Além disso, o default de `status` no código (`data.status || 'ativo'`, minúsculo) nunca bate com o CHECK constraint real (só aceita `RASCUNHO/ATIVO/SUSPENSO/ENCERRADO/CANCELADO`, maiúsculo) — então mesmo mandando `status` teria que ser explicitamente maiúsculo.
2. **Recorrência automática de mensalidade não funciona via satélite**: o job `job-recorrencias` (que gera as parcelas seguintes) só processa linhas de `contas_receber` já marcadas com `recorrente=true`+`periodicidade`, mas `syncFinanceiro` nunca escreve esses dois campos no insert, mesmo que o satélite os envie.
3. **`gera_financeiro` (campo do Contrato) é morto**: existe na tabela e no formulário do ERP, mas nenhuma função/RPC consome esse valor — não gera automaticamente nenhum título a partir de um Contrato.

**Se você (ou um agente futuro) for construir um satélite novo que precise de Contrato formal ou recorrência automática via sync**: esses 3 pontos precisam ser corrigidos **no repo `novusai-erp`** primeiro (`sync-webhook/index.ts`, funções `syncContrato`/`syncFinanceiro`) — não é algo que se contorna só do lado do satélite. Trate como um projeto à parte, coordenado com quem tem acesso de deploy ao projeto Supabase do ERP; não é uma mudança pra fazer de passagem dentro do trabalho de um satélite.

## Checklist pra um satélite novo se conectar ao ERP

1. Peça pra cadastrarem uma linha em `webhook_configs` no ERP (nome do satélite, `secret_token`, `empresa_representada_id`).
2. Copie `novus-educacional/src/integrations/erp/client.ts` + `emit.ts` como base do cliente HTTP+HMAC (já testado em produção).
3. Guarde a config por organização/tenant do satélite (base URL do ERP, secret, `empresa_representada_id`, feature flags por evento) — ver `erp_integration_config` em `novus-educacional` como schema de referência.
4. Antes de implementar sync de qualquer entidade nova, **leia `sync-webhook/index.ts` no `novusai-erp` direto**, não confie só na doc (`CONTRATOS_CANONICOS_ERP.md`) — ela diverge do código em pontos reais (ex: `situacao` vs `status`, campos `servicos`/`responsavel` do Contrato que não existem na tabela real).
5. Pra receber eventos do ERP (Porta 2, liquidação), replique o padrão de `novus-educacional/supabase/functions/edu-erp-webhook/index.ts` — verificação HMAC, idempotency key no formato `<nome-satelite>:<organization_id>:<numero_documento>`, `verify_jwt = false` no `config.toml` (senão o Supabase rejeita a chamada externa com 401 antes da validação HMAC).
