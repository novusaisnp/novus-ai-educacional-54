---
name: feedback-visual-identity-reference-repo
description: "Usuário quer que repositórios de referência sejam estudados só por inspiração visual (cores, elementos, ícones) adaptada ao projeto — não estrutura/funcionalidade. Acha o projeto atual \"simplório\" e \"com cara de ERP\"."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T02:02:56.977Z
---

O usuário pediu explicitamente (em maiúsculas, sinal de ênfase forte) para eu estudar um repositório de referência **apenas para inspiração de aspectos visuais** — cores, elementos, ícones — e adaptar ao `novus-educacional`, não copiar estrutura ou funcionalidade. Contexto: ele ainda acha o visual atual do projeto "muito simplório e com cara de ERP", mesmo depois do restyle de 2026-07-31 (paleta teal/coral, `IconBadge`, `BICard` — ver `docs/STATUS.md`).

**Qual repositório**: confirmado na sequência (mesma interjeição) — https://github.com/hrshadhin/school-management-system. Ainda não explorado (chegou no meio da implementação da ata de conselho de classe, 2026-08-06; a exploração visual foi deliberadamente adiada para depois de fechar essa fatia em andamento, não descartada).

**Por quê**: mesmo padrão já visto no restyle anterior (memória `project_visual_identity_roadmap` do lado `novusai-erp`: "inspire-not-copy"). O usuário separa claramente "ideias de UI/UX a garimpar" de "espec a implementar por completo" — ver também [[feedback_reference_docs_cherry_pick]], que já documenta esse padrão para docs de mockup/pesquisa. Esta memória estende o mesmo princípio especificamente para repositórios de código usados como referência visual.

**Como aplicar**: quando o usuário indicar (aqui ou numa sessão futura) qual repositório é, ler/explorar só a camada visual — paleta de cores, tipografia, iconografia, densidade de espaçamento, estilo de card/badge — e trazer para este projeto adaptado à identidade NOVUS.AI já estabelecida (teal/coral, `IconBadge`, Nunito), não portar componentes/arquitetura/lógica de negócio do repo de referência.
