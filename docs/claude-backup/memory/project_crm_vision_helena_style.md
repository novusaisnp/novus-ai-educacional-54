---
name: project-crm-vision-helena-style
description: "Usuário quer o CRM do novus-educacional reconstruído do zero como produto bem mais amplo — WhatsApp API, app próprio, agentes de IA \"na pegada do Helena\" — conversa futura dedicada, não mexer no CRM atual até lá."
metadata: 
  node_type: memory
  type: project
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:21.411Z
---

O módulo de CRM atual (`src/pages/app/crm/*`, `src/hooks/useCRM.ts`) é um rastreador básico de leads/interações/demandas/campanhas. Em 2026-08-04, ao corrigir o RLS da tabela `interactions`, o usuário disse que o botão "Nova Interação" do CRM (sem `onClick`, mesma classe de bug de outros botões mortos já documentados) não precisa de correção agora porque ele quer repensar o CRM inteiro como algo bem maior: integração com WhatsApp API, app próprio da escola, e agentes de IA de atendimento/vendas — citando explicitamente querer algo "na pegada do Helena" (produto de CRM/vendas via WhatsApp orientado a IA).

**Por quê**: o usuário não quer investir em correções incrementais de UI no formato atual do CRM se ele vai ser redesenhado substancialmente em breve — disse explicitamente "precisamos conversar sobre CRM depois".

**Como aplicar**: não investir esforço corrigindo ou estendendo a UI/UX do módulo de CRM atual em tarefas isoladas (não corrigir o botão morto "Nova Interação", não construir features de leads/campanhas) a menos que o usuário peça especificamente. Quando o usuário estiver pronto pra discutir CRM, tratar como conversa de produto do zero — integração com WhatsApp Business API, design de agente de atendimento/vendas por IA, como isso se relaciona com o schema `interactions`/`leads` existente e com as ferramentas de contato/comunicação do ERP se houver — em vez de supor que as páginas de CRM existentes são o ponto de partida. Ver também [[feedback_roadmap_phase_slicing]] (provavelmente vira sua própria fase de roadmap, não fatia de uma existente). **Ainda não iniciado.**
