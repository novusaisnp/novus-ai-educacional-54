# STATUS — novus-educacional

**Última atualização: 2026-08-02.** Este arquivo deve ser atualizado ao final de cada sessão de trabalho relevante, junto do commit da própria mudança — se estiver desatualizado, ele apodrece como aconteceu com documentos "foto única" no repo irmão `novusai-erp`. Ver [`CLAUDE.md`](../CLAUDE.md) para regras e arquitetura estáveis; este arquivo é só o estado do momento.

## 🔖 Checkpoint de sessão (2026-08-02, leia isto primeiro)

- **GitHub**: `novusaisnp/novus-ai-educacional-54`, branch `main`. Autenticado como `novusaisnp` (não `lignumfleet`, que não tem acesso a este repo). Remoto está em `c614374` (o restyle `d53e5b7` já tinha sido pushado). Histórico local à frente do remoto por 2 commits novos desta sessão (`f6fb0c6` remoção de tooling de dev/admin, `7e062d0` doc) — **ainda não pushados**, aguardando confirmação do usuário.

## ✅ Remoção de tooling de criação de admin da tela de login (2026-08-02)

**Contexto**: encontrado, ao retomar a sessão, um conjunto de mudanças já feitas na working tree mas nunca commitadas nem documentadas. `DevUserCreator` era um botão renderizado na **página pública de login** (`src/pages/auth/login.tsx`) que chamava `createAdminUser()` pra criar um usuário admin diretamente do client — exatamente o tipo de superfície de risco que a seção de Segurança deste projeto já sinalizava (credenciais de admin expostas no histórico do git, `ADMIN_SEED_TOKEN`).

**O que mudou**:
- Removidos: `src/components/DevUserCreator.tsx`, `src/utils/createAdminUser.ts`, `src/utils/createDevUser.ts`, `src/utils/runDiagnostics.ts`, `supabase/functions/dev_diagnostics/index.ts`.
- `src/pages/auth/login.tsx`: removidos os imports e o bloco de UI ("Seção de desenvolvimento") que renderizava o `DevUserCreator` e o botão de diagnóstico.
- `supabase/config.toml`: `project_id` corrigido de `nkcadmwydfnzrnauzeyz` (projeto morto) pra `ixnpotaccbpcbritxlud` (projeto real) — fecha a mesma inconsistência já documentada na sessão de reconciliação de 2026-07-31.

**Verificação**: `grep` confirmou nenhuma referência remanescente aos arquivos removidos. 47/47 testes, `typecheck` limpo. Commit `f6fb0c6`.

**Gaps conhecidos**: nenhum introduzido por esta mudança. Os itens de backlog relacionados (rotação de credenciais, secrets do projeto novo) continuam em aberto — ver Backlog abaixo.
- **Supabase**: projeto `ixnpotaccbpcbritxlud` ("Novus Educacional", `sa-east-1`, criado 2026-07-30). CLI linkado neste ambiente. As 25 migrações locais foram confirmadas como aplicadas de verdade no banco (spot-check via REST). **12 Edge Functions deployadas** (as 11 originais + `onboarding-create-org`, nova).
- **Saúde técnica**: 47/47 testes, `typecheck` e `build` limpos.
- **Decisões em aberto** (perguntadas ao usuário, sem resposta ainda ou adiadas):
  1. Rotacionar a senha do admin/`ADMIN_SEED_TOKEN` expostos no histórico do git (`create_admin_script.md`) — recomendado, não feito.
  2. Configurar os secrets do projeto novo (`ADMIN_SEED_TOKEN`, `OPENAI_API_KEY`, `ERP_SIGNING_SECRET` etc.) — nenhum está setado hoje.
  3. Restyle visual do Portal dos Responsáveis (`/portal`) — usuário decidiu explicitamente deixar para depois; só `/app` foi feito.
  4. Roadmap dos dois PDFs em `docs/` (gestão desktop + engajamento mobile) — ainda não discutido/formalizado em plano; usuário pediu pra considerar o que o ERP já tem pronto e evitar mudanças de grande monta que exijam parada técnica.
  5. Existe uma organização de teste órfã no banco (tentativa de onboarding que falhou antes do fix de `upsert`) — cosmético, não limpo.
- **Regra nova do usuário nesta sessão**: manter este arquivo (`docs/STATUS.md`) e `CLAUDE.md` atualizados ao final de cada atividade, pra qualquer agente ou dev novo entender o projeto sem depender de memória de conversa.

## ✅ Restyle visual de `/app` (2026-07-31)

**Contexto**: usuário achou que o painel tinha "cara de ERP" e pediu uma reformulação puramente estética (cores, ícones, cards, tipografia), sem mudar funcionalidade. Direção definida a partir de uma referência visual fornecida (`docs/Gemini_Generated_Image_e8l053e8l053e8l0.png`) e de decisões explícitas do usuário: só `/app` nesta rodada (Portal fica pra depois), extrair só o estilo da referência (as ideias de trilha gamificada/radar de IA nela são conteúdo de roadmap, não UI a implementar agora).

**O que mudou**:
- `src/index.css` / `tailwind.config.ts` / `index.html`: nova paleta teal (primária) + coral (`--accent-warm`, destaque), `--radius` maior (cards mais arredondados), sidebar com fundo teal escuro, fonte Nunito via Google Fonts.
- `src/components/IconBadge.tsx` (novo): ícone em badge circular colorido, 6 tons (`primary`/`warm`/`success`/`info`/`purple`/`danger`), substituindo blocos ad hoc duplicados (`academico.tsx`, `chamada.tsx`, `pedagogico.tsx`, `eventos.tsx`, `bi/*.tsx`).
- `src/components/bi/BICard.tsx` restilizado pra usar `IconBadge`; `src/pages/app/dashboard.tsx` consolidado pra usar `BICard` em vez de 4 cards de KPI reimplementados inline.
- ~20 arquivos com cores Tailwind hardcoded (status de presença/matrícula, gráficos Recharts, feedback de IA, contador de alertas) realinhados pra família da nova paleta, mesma semântica.
- `auth/login.tsx` e `NotFound.tsx` migrados de cinza/azul cru pros tokens do tema.
- Ícone de "Secretaria" na sidebar: `Building2` → `School`.

**Verificação**: 47/47 testes, typecheck e build limpos. Percorrido ao vivo no navegador (dashboard, sidebar expandida, `/app/eventos`, `/app/bi/academico`, tela de login) sem erro no console.

**Gaps conhecidos**: Portal (`/portal`) não foi tocado — mesma paleta antiga, ainda "cara de ERP". Se for restilizado depois, reaproveitar `IconBadge`/`BICard` de lá.

## ✅ Onboarding de organização + deploy das Edge Functions (2026-07-31)

**Contexto**: ao testar o app de verdade no navegador (login real, não só build), descobri que **nenhuma das 12 Edge Functions estava deployada** no projeto Supabase (`ixnpotaccbpcbritxlud` — projeto novo, criado um dia antes). Isso significa que `edu-erp-webhook` (o receptor real de eventos do ERP) nunca poderia ter funcionado. Descobri também que contas criadas via `/auth/register` ficam sem `organization_id` — sem organização, o app inteiro trava em "Organização não selecionada", e não havia nenhum fluxo na UI pra resolver isso.

**O que mudou**:
- `supabase functions deploy` das 12 functions (autorizado explicitamente pelo usuário — é escrita em produção).
- `supabase/functions/onboarding-create-org` (nova): dado o JWT do usuário autenticado, cria uma organização e vincula o `profiles` dele como admin. Espelha o padrão já existente em `create_admin_user`, mas self-service (não precisa de `ADMIN_SEED_TOKEN`).
- `src/pages/app/onboarding.tsx` (nova) + rota `/app/onboarding`, linkada no empty-state do dashboard.
- **Dois bugs encontrados testando de verdade contra o banco real** (corrigidos no commit seguinte, `18abe28`): a function usava `.update()` em vez de `.upsert()` (não existe trigger que crie a linha em `profiles` no signup comum — só existe pra `guardians`, no portal), e faltava `full_name` (coluna `NOT NULL`) no upsert.

**Verificação**: testado ponta a ponta contra o projeto real — login com `novusaisnp@gmail.com`, criação de organização via `onboarding-create-org`, confirmado por REST que `profiles.organization_id`/`role`/`full_name` ficaram corretos, dashboard passou a renderizar dados reais (zeros de uma org vazia, não mais tela travada).

**Gaps conhecidos**: existe uma organização de teste órfã (tentativa anterior ao fix do `upsert`) — sem limpeza. Secrets do projeto (`ADMIN_SEED_TOKEN` etc.) continuam não configurados, então `create_admin_user` ainda não funciona.

## ✅ Correções encontradas testando em navegador: audit log, form aninhado, feedback do "Testar Conexão" (2026-07-31)

**Contexto**: parte da verificação "roda de verdade, não só compila" pedida pelo usuário. Ao logar e navegar pelo app real, o console acumulava erros repetidos.

**O que mudou**:
- `src/utils/auditSafe.ts`: `logAuditSafe` mandava `organization_id: ''` pro Postgres quando não havia organização — coluna é `uuid NOT NULL`, então toda navegação de um usuário sem org gerava um erro no console. Agora pula o log em vez de tentar gravar um UUID inválido. Corrigido junto: o filtro de PII em `sanitizeAudit` usava `.includes()` (substring), descartando por engano `organizationId` (contém "rg") e `pathname` (contém "name") — trocado pra match exato.
- `src/pages/app/config/integracoes.tsx`: a seção "Recursos de IA" renderizava um `<form>` dentro do `<form>` principal da página (HTML inválido, warning do React). Movida pra fora, como seção irmã com form independente. Também: o botão "Testar Conexão" não fazia nada, sem feedback, quando não havia organização — agora mostra um toast de erro.
- `src/components/layout/AppShell.tsx`: erro de typecheck real (`error.message` em variável tipada `unknown` no fallback do error boundary) — só apareceu porque o script `typecheck` não existia antes desta sessão e nunca tinha rodado em CI.
- 2 testes pré-existentes quebrados em `pwa.provider.spec.tsx` (usavam `require()` dentro do ambiente ESM do Vitest) — trocados por import estático no topo do arquivo.

**Verificação**: 47/47 testes (incluindo os 2 corrigidos), confirmado ao vivo no console do navegador que os erros de auditoria pararam de aparecer.

## ✅ Reconciliação com GitHub + migrações Supabase restauradas + housekeeping (2026-07-31)

**Contexto**: pedido inicial da sessão — auditoria profunda da pasta, conectar com o repositório GitHub `novusaisnp/novus-ai-educacional-54`, e validar se as migrações Supabase já feitas estavam corretas.

**O que foi encontrado**: a pasta local nunca teve `.git`, mas o repositório remoto já existia, completo, com **25 arquivos de migração** (12–22/ago/2025) que faltavam na pasta local (`supabase/migrations/` estava vazia aqui). O `.env` local apontava pra um projeto Supabase morto (`nkcadmwydfnzrnauzeyz`, DNS não resolve mais) — o app só funcionava por causa de um fallback hardcoded em `client.ts` apontando pro projeto certo (`ixnpotaccbpcbritxlud`).

**O que mudou**:
- Git inicializado, histórico do GitHub puxado como base (restaurou as 25 migrações), housekeeping reaplicado por cima como novo commit.
- `.env` parou de ser rastreado (`.gitignore` + `.env.example` criado).
- Gerenciador de pacotes padronizado em **Bun** (igual ao `novusai-erp`) — removido `package-lock.json`, CI (`.github/workflows/ci.yml`) trocado de `pnpm` (sem lockfile, sempre falharia) pra Bun, scripts `test`/`typecheck` adicionados ao `package.json` (não existiam).
- Credenciais reais em texto puro removidas de `create_admin_script.md` (permanecem expostas no histórico do git — recomendação de rotação em aberto).
- Export duplicado `erpEmit` removido de `src/integrations/erp/client.ts` (o real, usado em todo o app, é `src/integrations/erp/emit.ts`).

**Verificação**: as 25 migrações batem estruturalmente com o schema real (spot-check via REST contra `ixnpotaccbpcbritxlud` — tabelas existem, sem nenhum `DROP` destrutivo nas migrações). 47/47 testes, typecheck e build limpos.

## Riscos conhecidos (não são bugs — decisões/lacunas conscientes)

- `financial_transactions` (esperada por `supabase/functions/ops-alerts`) não existe ainda — depende da integração real com o ERP.
- `edu-erp-webhook` só loga e faz dedupe em memória (não persiste em produção) — lógica de negócio real (atualizar registros locais ao receber pagamento) ainda não implementada.
- `useBIData.ts` (BI Financeiro) retorna dados mock/zerados — "ERP real não implementado ainda", conforme comentário no próprio código.
- 229 erros de lint pré-existentes (majoritariamente `no-explicit-any` em Edge Functions) — dívida técnica não tratada nesta sessão, CI vai falhar em `bun run lint` até isso ser resolvido.

## Backlog

- Rotacionar credenciais expostas (admin/`ADMIN_SEED_TOKEN`).
- Configurar secrets do projeto Supabase novo.
- Restyle visual do Portal dos Responsáveis.
- Resolver os 229 erros de lint (ou decidir excluir Edge Functions do lint gate).
- Limpar organização de teste órfã.

## Próxima frente (a decidir)

Formalizar em plano como as ideias de `docs/mapa_mental_gestao_novus.pdf` (gestão desktop/backoffice) e `docs/mapa_mental_novus.pdf` (engajamento mobile/família) entram no roadmap — considerando o que o `novusai-erp` já tem pronto (não redesenhar o que já existe) e priorizando ajustes incrementais que não exijam parada técnica pra voltar à produção.
