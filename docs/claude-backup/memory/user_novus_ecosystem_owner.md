---
name: user-novus-ecosystem-owner
description: Usuário é o dono de produto construindo o ecossistema NOVUS.AI (ERP + satélite educacional) via roadmap colaborativo de longo prazo.
metadata: 
  node_type: memory
  type: user
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:03:31.970Z
---

O usuário (novusaisnp@gmail.com) é dono de produto e conduz a estratégia do ecossistema NOVUS.AI: `novusai-erp` (hub — dinheiro/fiscal/RH) e `novus-educacional` (primeiro satélite — jornada acadêmica). Pensa e planeja no nível de "fazer a melhor plataforma de gestão escolar do Brasil", não só tickets isolados.

Estilo de trabalho:
- Conduz um roadmap de várias fases (Fase 0 a 7 + Transversal, documentado em `docs/STATUS.md`) ao longo de muitas sessões. Espera que cada sessão retome o roadmap de onde parou, sem precisar reexplicar contexto.
- Participa ativamente do escopo: quando uma "Fase" nomeada agrupa várias frentes distintas, espera ser perguntado (via AskUserQuestion) qual fatia atacar antes do assistente supor ou tentar fazer tudo de uma vez. Ver [[feedback_roadmap_phase_slicing]].
- Fornece material de referência/inspiração (pesquisas de mercado, mockups HTML, PDFs de mapa mental) em `docs/` no meio da conversa e espera que sejam garimpados por ideias, não tratados como mandato de implementação. Ver [[feedback_reference_docs_cherry_pick]] e [[reference_novus_educacional_idea_docs]].
- Às vezes gerencia o `git push` pessoalmente — confortável deixando o assistente commitar localmente, mas às vezes assume o push.
- Dá feedback de UX/produto concreto e específico durante a construção de uma feature (não só na revisão final) — ex.: objetou uma tabela de exceções com uma linha por dia e pediu agrupamento por intervalo de datas enquanto testava o calendário ao vivo no navegador. Espera que esse tipo de feedback seja incorporado imediatamente, na mesma sessão.
- Exige comunicação em pt-BR, sempre, em toda sessão — ver [[feedback_reports_in_ptbr]].

Como aplicar: por padrão, planejamento colaborativo fase a fase (Plan Mode + AskUserQuestion para escopo), tratar docs suplementares como fonte de ideias opcionais, e ficar receptivo a feedback de UX em tempo real durante verificação no navegador em vez de tratar um plano como congelado assim que a implementação começa.
