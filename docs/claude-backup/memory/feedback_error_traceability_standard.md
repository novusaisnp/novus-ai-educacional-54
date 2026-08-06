---
name: feedback-error-traceability-standard
description: "Usuário quer um padrão NOVUS-wide de erros inteligíveis e rastreáveis (novus-educacional + novusai-erp), não toasts genéricos — iniciativa ainda não desenhada."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:14.586Z
---

O usuário quer que todo produto NOVUS (este repo e o `novusai-erp`) exiba erros que permitam identificar exatamente de onde vieram — não mensagens genéricas tipo "Erro ao salvar presença. Tente novamente." Disparado quando esse toast genérico exato apareceu durante teste de RLS em 2026-08-04 (falha ao salvar em `chamada.tsx`) e escondeu a causa real (uma cláusula `ON CONFLICT` incompatível com a constraint UNIQUE real de `attendance`) até inspecionar a network do navegador.

**Por quê**: toasts genéricos catch-all espalhados pelas mutations do app (padrão `onError`, repetido provavelmente na maioria dos `useMutation`) forçam quem estiver debugando — dev ou suporte — a vasculhar a aba de network do navegador ou os logs do Supabase manualmente toda vez, em vez da própria mensagem de erro apontar a causa.

**Como aplicar**: essa é uma iniciativa transversal, cross-repo (taxonomia/códigos de erro, quanto do erro bruto do Postgres/Supabase expor sem vazar detalhes de schema pro usuário final, se adicionar IDs de correlação ou logging estruturado) — não implementar aos poucos dentro de uma tarefa não relacionada. Ao pegar trabalho relacionado a tratamento de erro, ou ao começar uma nova fase/fatia do roadmap, levantar isso como iniciativa candidata e perguntar ao usuário como ele quer escopar (só conteúdo do toast? códigos de erro estruturados? error boundary/logging centralizado? vale pros dois repos ou começa só num?) em vez de supor um design. Ver também [[feedback_roadmap_phase_slicing]]. **Ainda não iniciado** — ver Backlog em `docs/STATUS.md`.
