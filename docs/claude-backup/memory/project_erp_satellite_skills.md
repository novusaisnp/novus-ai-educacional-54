---
name: project-erp-satellite-skills
description: "Usuário quer skills globais dedicadas para conhecimento de integração ERP↔satélite, criadas proativamente sempre que um padrão reutilizável for descoberto — já existem 2, restauradas nesta sessão."
metadata: 
  node_type: memory
  type: project
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:44.382Z
---

O usuário pediu (2026-08-04, durante o planejamento do contrato/assinatura eletrônica da Fase 1) a criação de **skills** — pacotes de instrução reutilizáveis — que capturem como se comunicar com o hub NOVUS.AI ERP (`novusai-erp`), para que qualquer satélite futuro (este repo, e futuros como PDV/frente de caixa/CRM) não precise redescobrir o modelo de integração do zero.

**Extensão do pedido**: não tratar como tarefa única — sempre que um padrão reutilizável relacionado a troca de informação ERP↔satélite for detectado (em qualquer sessão, qualquer repo), criar uma skill proativamente. É um comportamento permanente, não algo para esperar ser pedido de novo.

**Skills já criadas** (globais, em `~/.claude/skills/`, restauradas nesta máquina em 2026-08-06 depois de um reset de ambiente — ver [[machine_reset_2026-08]]):
- `erp-satellite-integration` — modelo de 3 portas (Título/Liquidação/Autorização), payloads reais verificados em código (`clientes`/`contas_receber`/`contratos`), convenção de assinatura HMAC, `webhook_configs`/`empresa_representada_id`, e os bugs conhecidos do lado do ERP (`syncContrato`/`syncFinanceiro`/`gera_financeiro`).
- `novus-ecosystem-cli` — mecânica de troca de conta do Supabase CLI entre os projetos do ecossistema (login é exclusivo, não por-projeto).

**Como aplicar**: continuar esse padrão — sempre que uma investigação cross-repo render conhecimento reutilizável (não só contexto desta sessão), empacotar como skill nova ou atualizar uma existente em `~/.claude/skills/`, em vez de só anotar em `docs/STATUS.md` ou memória. Memória é para contexto do usuário entre sessões; skills são para o "como fazer X" reutilizável em si.
