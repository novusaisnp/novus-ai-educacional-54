---
name: machine-reset-2026-08
description: Máquina/VSCode anterior foi perdida — ambiente local recriado do zero a partir do clone do GitHub em 2026-08-06.
metadata: 
  node_type: memory
  type: project
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:05:23.901Z
---

O usuário perdeu o acesso ao VSCode/máquina anterior que tinha o ambiente local todo configurado, e reclonou `novus-ai-educacional-54` do GitHub do zero. O código em si estava 100% commitado e pushado (nada perdido no repo — inclusive o trabalho de Fase 1 de contrato de matrícula de 2026-08-05 estava lá, só com mensagens de commit genéricas "SALVAMENTO 04/08/2026 21:06", autosave).

**O que foi recriado nesta sessão (2026-08-06)**:
- `.env`: recriado a partir do fallback hardcoded em `src/integrations/supabase/client.ts` (projeto `ixnpotaccbpcbritxlud`, publishable/anon key já embutida no código-fonte — não é segredo, é a chave pública). Não foi preciso pedir nada ao usuário.
- Supabase CLI: não estava instalado nesta máquina. Instalado via `scoop install supabase` (v2.111.0). **Ainda não logado** — precisa que o usuário rode `supabase login` interativamente (fluxo de browser), não dá pra automatizar.
- `bun install`: node_modules já estava presente e íntegro (485 installs, sem mudanças) — não precisou reinstalar nada.

**Atualização 2026-08-06**: o usuário apontou que `C:\MaxDev\.claude` continha o diretório de config completo da máquina/VSCode anterior (era o `CLAUDE_CONFIG_DIR` de quando o repo vivia em `C:\Users\Lignum Biomassa\novus-educacional`). De lá foram restaurados nesta máquina: as duas skills globais `~/.claude/skills/erp-satellite-integration/SKILL.md` e `~/.claude/skills/novus-ecosystem-cli/SKILL.md`, e as regras de `autoMode.allow` cross-repo em `~/.claude/settings.json`. Toda a memória antiga de `novus-educacional` e `novusai-erp` também foi lida de lá e reconstituída nos arquivos deste diretório (ver `MEMORY.md`). `C:\MaxDev\.claude` continua existindo como arquivo morto — não foi apagado, só lido; pode ter mais sessões/tool-results históricos não explorados a fundo (é grande, ~350KB só de listagem de arquivos).

**Verificação**: `bun run typecheck` limpo, `bun run test` 47/47 passando — baseline saudável imediatamente após o reclone, sem precisar corrigir nada de código.

**How to apply**: antes de assumir que ferramentas/skills documentadas no CLAUDE.md existem nesta máquina, confirme (CLI instalado? logado? skill file existe?) — a documentação do repo pode referenciar tooling que vivia só na máquina anterior, perdida.
