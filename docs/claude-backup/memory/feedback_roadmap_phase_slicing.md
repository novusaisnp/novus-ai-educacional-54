---
name: feedback-roadmap-phase-slicing
description: "Fases nomeadas do roadmap (Fase 0-7) agrupam várias frentes distintas — perguntar ao usuário qual fatia construir a seguir, não adivinhar."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:03:46.208Z
---

O roadmap de `novus-educacional` (`docs/STATUS.md`) é organizado em fases amplas nomeadas como "Fase 1 — Secretaria Digital", cada uma agrupando várias frentes não relacionadas entre si (ex.: Fase 1 sozinha cobre: funil de admissão/rematrícula, assinatura eletrônica + gatilho ERP, GED do aluno com validação por IA, calendário letivo, ata de conselho de classe, modelo de progressão parcial, documentos de transferência escolar). Tratar uma "Fase" inteira como uma tarefa única a planejar e construir de uma vez é grande demais e arrisca construir a fatia errada primeiro.

**Por quê**: esse padrão já foi confirmado funcionando bem — quando o usuário disse "próxima fase" após a Fase 0 terminar, o assistente usou AskUserQuestion pra oferecer 4 fatias concretas da Fase 1 (calendário, funil de admissão, assinatura eletrônica/gatilho ERP, GED+IA) com trade-offs, e o usuário escolheu "Calendário letivo (Recomendado)" — um ponto de partida bem definido, de baixo risco, que também desbloqueava a Fase 3. Isso produziu uma unidade de trabalho focada e entregável em vez de um sprint ambíguo.

**Como aplicar**: quando o usuário disser para avançar pra uma nova "Fase" (ou pedir genericamente para continuar o roadmap), não começar implementando a primeira coisa que vier à mente da lista da fase. Ler a descrição da fase em `docs/STATUS.md`, identificar suas frentes distintas, e usar AskUserQuestion para o usuário escolher qual atacar a seguir — apresentando um default recomendado quando uma fatia for claramente mais fundamental/de menor risco pras outras.
