# Backup de configuração do Claude Code

Esta pasta é um **seguro de vida**, não a configuração funcional. O Claude Code lê skills e memória de `~/.claude` (fora deste repositório) — nada aqui é lido automaticamente. Esta cópia existe só para não se perder de novo se a máquina/perfil local falhar, como aconteceu em 2026-08-06 (ver `docs/STATUS.md`, checkpoint daquela data): a máquina anterior foi perdida e as skills globais só foram recuperadas porque um diretório de config antigo (`C:\MaxDev\.claude`) ainda existia em disco por acaso.

## O que tem aqui

- **`skills/`** — cópia das skills globais do ecossistema NOVUS.AI (`erp-satellite-integration`, `novus-ecosystem-cli`). Aplicam-se tanto a este repo quanto ao `novusai-erp`.
- **`memory/`** — cópia da memória persistente do Claude Code específica deste projeto (preferências do usuário, decisões de negócio, padrões descobertos).

## Como restaurar numa máquina nova

```bash
# Skills (globais, valem para qualquer repo do ecossistema NOVUS.AI)
cp -r docs/claude-backup/skills/* ~/.claude/skills/

# Memória (específica deste projeto)
mkdir -p ~/.claude/projects/<pasta-sanitizada-do-caminho-do-repo>/memory
cp docs/claude-backup/memory/*.md ~/.claude/projects/<pasta-sanitizada-do-caminho-do-repo>/memory/
```

O nome da pasta em `~/.claude/projects/` é derivado do caminho absoluto do repo na máquina atual — confira o formato de outras pastas já existentes em `~/.claude/projects/` para replicar a convenção.

## Manutenção

Esta cópia **não se atualiza sozinha**. Se uma skill ou memória mudar de verdade (em `~/.claude`), regenerar este backup manualmente antes do próximo commit relevante — não é um espelho automático, é um instantâneo tirado quando alguém lembrar de atualizar.
