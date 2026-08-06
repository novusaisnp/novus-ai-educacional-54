---
name: reference-novus-educacional-idea-docs
description: "A pasta docs/ deste repo guarda fontes de ideias/inspiração para o roadmap, não mencionadas no CLAUDE.md — conferir manualmente ao planejar uma fase/UI nova."
metadata: 
  node_type: memory
  type: reference
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:35.610Z
---

`novus-educacional/docs/` contém vários arquivos que o usuário adicionou especificamente como inspiração de roadmap/UX (não cobertos em `CLAUDE.md`, vale conferir manualmente ao planejar uma fase nova ou UI nova):

- `docs/MVP de ideias.MD` — comparação estilo pesquisa de mercado contra concorrentes (TOTVS Educacional, Sponte). Fonte de várias adições ao roadmap: recuperação/progressão parcial/dependência, ata de conselho de classe digital, calendário letivo, transferência escolar, exportação SAEB, justificativa de falta online, pesquisas NPS, interop com LMS, controle de acesso físico/cardápio/transporte.
- `docs/novus_edu_mockups.html` — mockup HTML navegável de 5 telas (Visão Geral, Acadêmico, Secretaria, Portal Família mobile, Integração ERP). Fonte de padrões de UI concretos reutilizáveis por fase: stepper de matrícula (dados→documentos→responsáveis→financeiro→confirmação), dots de frequência + inputs de nota inline, tags de habilidade BNCC por aula, card de conselho de classe com atas pendentes, card de PEI ativo, ring chart de frequência mobile + fluxo "justificar falta", diagrama de arquitetura de integração ERP com status de webhook/API, painel multi-unidade. O card-resumo "Calendário letivo" (dias letivos cumpridos, próximo recesso, reposições pendentes) já foi reaproveitado na feature de calendário da Fase 1.
- `docs/mapa_mental_gestao_novus.pdf` e `docs/mapa_mental_novus.pdf` — PDFs de mapa mental (ideias de gestão desktop/backoffice e engajamento mobile, respectivamente) que originalmente semearam o roadmap de 7 fases em `docs/STATUS.md`.

Ver também [[feedback_reference_docs_cherry_pick]] para como tratar esses docs (garimpar, não implementar por completo).
