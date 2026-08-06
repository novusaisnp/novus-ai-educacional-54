---
name: feedback-reference-docs-cherry-pick
description: "Docs de referência fornecidos pelo usuário (mockups, pesquisa de mercado) são fonte de ideias, não mandato de implementação."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:03:52.337Z
---

Quando o usuário solta um arquivo de referência em `docs/` no meio da conversa (pesquisa de mercado, mockup HTML de UI, PDF de mapa mental) e diz algo como "veja o que dá pra agregar" ou "aproveite as ideias", tratar estritamente como inspiração para garimpar — não como especificação para implementar por completo.

**Por quê**: o usuário repetiu essa instrução explicitamente duas vezes numa sessão ("lembre-se apenas ideias para usarmos o que da pra aproveitar no nosso projeto") depois de entregar `docs/MVP de ideias.MD` e de novo para `docs/novus_edu_mockups.html`. O risco que ele está prevenindo é explosão de escopo — puxar toda ideia de um doc de análise de concorrentes ou redesign completo de mockup em vez de escolher só as poucas peças que cabem na tarefa atual, bem mais restrita.

**Como aplicar**: quando um doc desses for fornecido, ler, extrair padrões reutilizáveis concretos (ex.: um layout de card específico, um stepper de fluxo específico), anotar contra a fase futura relevante do roadmap em `docs/STATUS.md`, e só puxar uma peça específica para a implementação atual quando ela servir diretamente à tarefa sendo construída agora (ver [[feedback_date_range_ux]] como exemplo — o card-resumo "Calendário letivo" do mockup foi reaproveitado, o resto do mockup não). Nunca tratar "leia este doc" como "construa tudo deste doc".
