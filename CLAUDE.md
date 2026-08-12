# CLAUDE.md

Leia isto antes de qualquer mudança. Para saber **o que está pendente agora**, vá direto a [`docs/STATUS.md`](./docs/STATUS.md) — este arquivo é sobre padrões e regras estáveis, aquele é o checkpoint do momento.

## O que é

NOVUS.AI Educacional — SPA React + Vite + shadcn/ui + Supabase. É o **primeiro módulo satélite** do ecossistema NOVUS.AI, cujo hub é o ERP em `../novusai-erp` (pasta irmã, mesmo nível). Satélite cuida da jornada acadêmica (matrícula, notas, frequência, prontuário do aluno); o ERP cuida do dinheiro (contas a receber, cobrança, fiscal). A ponte entre os dois é o contrato canônico documentado em `novusai-erp/docs/CONTRATOS_CANONICOS_ERP.md` (modelo de 3 "portas": Título e Liquidação via push, Autorização via pull síncrono).

## Stack e arquitetura

- **Frontend**: React 18 + Vite 5 + TypeScript (`strict: false`) + Tailwind + shadcn/ui (`components.json`: style `default`, base color `slate`, CSS variables).
- **Package manager**: **Bun** (padronizado nesta sessão, mesmo do `novusai-erp`). Não reintroduza `pnpm`/`package-lock.json`.
- **Backend**: Supabase (Postgres + Auth + Edge Functions Deno + Storage). Projeto real e ativo: **`ixnpotaccbpcbritxlud`** (região `sa-east-1`, criado 2026-07-30). Não confie em nenhum ref de projeto guardado de memória — confirme em `supabase/config.toml` ou rodando `supabase projects list` com o CLI logado na conta certa.
- **Multi-tenant**: isolamento por `organization_id` via RLS em quase todas as tabelas. Usuário sem `organization_id` em `profiles` não consegue usar o app — ver seção de armadilhas abaixo.
- **Fronteira de serviço com o ERP**: é **HTTP**, não banco compartilhado — são dois projetos Supabase diferentes (`ixnpotaccbpcbritxlud` aqui, `reksodqzemboaeqxnxyy` no ERP, migração concluída 2026-08-08). Webhooks assinados por HMAC (`supabase/functions/edu-erp-webhook`), config por-organização em `src/lib/featureFlags.ts` (`getERPConfig`/`setERPConfig`).

## Comandos essenciais

```bash
bun install
bun run dev         # localhost:8080
bun run typecheck
bun run test
bun run lint
bun run build
```

Antes de qualquer commit: `typecheck` limpo e `test` passando (47/47 no momento em que este arquivo foi escrito). `lint` tem dívida técnica pré-existente (ver STATUS.md) — não é gate de commit ainda.

## Pontos cegos conhecidos (importante)

- **Edge Functions não são cobertas** por `typecheck`/`test` local — só se valida rodando `supabase functions deploy` de verdade e testando o endpoint. Um `bun run build` verde não significa que as functions funcionam.
- **Secrets do projeto Supabase novo não estão configurados**: `ADMIN_SEED_TOKEN`, `OPENAI_API_KEY`, `ERP_SIGNING_SECRET`, `RESEND_API_KEY`, `WHATSAPP_API_*` etc. não existem em `supabase secrets list` (só os injetados pela plataforma). Isso quebra silenciosamente `create_admin_user`, as 3 functions de IA, e o modo real (não-demo) do `edu-erp-webhook`.
- **`supabase/migrations/` só reflete o que foi commitado** — o schema real também pode ter mudanças aplicadas manualmente pelo Dashboard (aconteceu antes, ver `docs/SECURITY_NOTES.md`). Se algo no banco não bater com uma migração, não assuma que a migração está errada sem checar o Dashboard.
- **RLS habilitado sem nenhuma política é um padrão recorrente neste schema** — não é exceção isolada. Já foram encontradas e corrigidas em `classes`, `enrollments`, `student_guardians`, `documents`, `assessments`, `attendance`, `consents`, `grades`, `interactions`, `subjects` (todas, ao longo de 2026-08-03/04) — não há mais tabela conhecida quebrada, mas o padrão pode se repetir em qualquer tabela nova. O sintoma é enganoso: `SELECT` retorna vazio silenciosamente (sem erro), só `INSERT`/`UPDATE`/`DELETE` falham explicitamente com "violates row-level security policy". Antes de debugar "dado não aparece"/"insert falha" numa tabela, rode `SELECT policyname FROM pg_policies WHERE tablename = 'X'` — não assuma que RLS ligado implica policy presente, e não confie nas migrations pra saber isso (algumas tabelas têm 2-3 migrations distintas tentando criar policy pra ela, sem nenhuma efetivamente ativa no banco real).
- **`.upsert(..., { onConflict: '...' })` com lista de colunas que não bate com nenhuma UNIQUE constraint real falha com 400 (42P10)**, e o toast que aparece pro usuário pode ser totalmente genérico ("Tente novamente") escondendo a causa real — já apareceu em `chamada.tsx`/`useGrades.ts` (upsert com colunas erradas, corrigido ajustando a lista) e em `uploadAvatar` (`src/lib/storage.ts`, corrigido 2026-08-07 trocando o upsert por `SELECT`+`INSERT`/`UPDATE` explícito, já que `documents` não tem — e não pode ganhar — uma UNIQUE constraint pra essas colunas sem quebrar `uploadDoc`, que depende de títulos poderem se repetir). Antes de confiar num `onConflict`, rode `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.<tabela>'::regclass` e confirme que a lista de colunas bate exatamente com uma constraint UNIQUE existente — se não bater e não for seguro criar uma (por exemplo, porque outra função já depende de duplicatas), prefira resolver explícito (select + insert/update) a inventar um índice parcial, que o cliente Supabase-JS não consegue expressar no `onConflict`.
- **CLI do Supabase só fica logado numa conta por vez — trocar de projeto entre `novus-educacional` e `novusai-erp` exige re-login**: os dois projetos (`ixnpotaccbpcbritxlud` e `reksodqzemboaeqxnxyy`) pertencem à mesma conta/organização Supabase (ecossistema: gcywjpnkhxnbbqqpyblg) desde a migração 2026-08-08. `supabase login --token <x>` substitui a sessão inteira; trocar entre projetos agora só precisa de `supabase link --project-ref <id>`, não re-login. Sintoma enganoso anterior (comando falhava com 403): já não acontece pós-migração, mas documentado aqui pra referência histórica. Ver skill `~/.claude/skills/novus-ecosystem-cli/SKILL.md` pro protocolo completo antes de qualquer trabalho cross-repo.
- **CLI do Supabase pode estar logado numa conta errada** — já aconteceu nesta máquina de `supabase login` estar autenticado numa conta sem acesso a `ixnpotaccbpcbritxlud` (só via um projeto irrelevante em `supabase projects list`, e `link`/`db query --linked` falhavam com erro de privilégio). Se um comando `supabase` contra o projeto real falhar de forma estranha, confirme com `supabase projects list` que `ixnpotaccbpcbritxlud` aparece com `"linked":true` antes de investigar mais fundo — não é sempre problema de código/config.

## Padrões e armadilhas já resolvidos (não redescubra)

- **`organization_id` vazio quebra `audit_logs`**: é coluna `uuid NOT NULL`. `src/utils/auditSafe.ts` já foi corrigido pra pular o log (não gravar) quando não há organização, em vez de mandar `''`. Se você adicionar um novo call site de auditoria, não gere esse bug de novo.
- **`sanitizeAudit` usa match exato de campo, não substring**: antes usava `.includes()`, o que descartava por engano campos como `organizationId` (contém "rg") e `pathname` (contém "name"). Se for adicionar um novo campo à lista de PII, adicione o nome exato em `PII_FIELDS`, não um fragmento.
- **Onboarding de organização precisa de `upsert`, não `update`**: não existe trigger que crie a linha em `profiles` no signup comum (só existe pra `guardians`, no fluxo do portal). `supabase/functions/onboarding-create-org` faz `upsert` com `id`, `organization_id`, `role` **e `full_name`** (coluna `NOT NULL` — pegue de `user_metadata.full_name`, cai pro prefixo do e-mail se não tiver).
- **Havia dois `erpEmit` e dois `logAudit`**: `src/integrations/erp/client.ts` tinha um `erpEmit` morto (nada importava dele) — removido. O real é `src/integrations/erp/emit.ts`. Da mesma forma, `src/lib/audit.ts` e `src/lib/audit/logAudit.ts` são dois arquivos distintos com a mesma função — ambos em uso por caminhos diferentes; não são duplicata acidental, mas confira qual está sendo importado antes de mexer.
- **`.env` não é a fonte de verdade sozinho**: `src/integrations/supabase/client.ts` tem fallback hardcoded pro projeto certo. Se o app "funcionar mesmo com `.env` errado", é por causa desse fallback — corrija o `.env` mesmo assim, não confie no fallback pra sempre.
- **Windows/PowerShell**: cuidado com edição de arquivos com acentuação — prefira o `Edit`/`Write` tool a heredocs/echo via shell quando o conteúdo tiver português com acentos.
- **No ERP, o cliente do contrato/mensalidade é sempre o responsável, nunca o aluno** — menor não pode ser parte de um contrato financeiro; o nome do aluno entra só como referência descritiva na cobrança (ex.: "mensalidade ref. ao contrato do aluno Fulano de Tal"). Já é assim em `createGuardianForStudent` (`src/features/secretaria/lib/createGuardianForStudent.ts`), que sincroniza o **guardian** com o ERP via `erpEmit.upsertClient`, não o student. Ao implementar `createReceivable`/assinatura eletrônica de contrato (Fase 1, ainda não construído), o `clienteCpfCnpj` deve resolver pro CPF do responsável.

## Segurança

- `create_admin_script.md` continha credenciais reais em texto puro no histórico do git (commit inicial). Foram removidas do conteúdo atual, mas **rotacione** a senha do admin e o `ADMIN_SEED_TOKEN` se ainda estiverem ativos — o histórico do git continua exposto pra quem tiver acesso ao repo.
- `.env` está no `.gitignore` a partir desta sessão; use `.env.example` como referência de quais variáveis são esperadas.

## Onde ler mais

- **Prontidão para produção (nota x/100 por módulo) e fila de fatias até concluir**: [`docs/ROADMAP.md`](./docs/ROADMAP.md).
- **Estado atual, pendências e próxima ação**: [`docs/STATUS.md`](./docs/STATUS.md).
- **Notas de segurança/LGPD**: [`docs/SECURITY_NOTES.md`](./docs/SECURITY_NOTES.md).
- **Contrato de integração com o ERP**: `novusai-erp/docs/CONTRATOS_CANONICOS_ERP.md` (repo irmão).
- **Ideias de roadmap** (ainda não formalizadas em plano): `docs/mapa_mental_gestao_novus.pdf` (desktop/backoffice) e `docs/mapa_mental_novus.pdf` (mobile/engajamento), mais a referência visual `docs/Gemini_Generated_Image_e8l053e8l053e8l0.png` usada como base do restyle.
