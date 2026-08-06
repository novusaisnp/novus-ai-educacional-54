---
name: project-erp-contract-owner-is-guardian
description: "Na integração financeira com o ERP, o \"cliente\" do contrato/mensalidade é sempre o responsável legal do aluno, nunca o aluno — regra de negócio confirmada, já aplicada no código."
metadata: 
  node_type: memory
  type: project
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:28.013Z
---

Quando `novus-educacional` envia dado financeiro pro ERP (Porta 1 — Título, via `createReceivable`/criação de contrato), o **cliente** no ERP é sempre o **responsável** (`guardians`) do aluno, nunca o aluno em si. O contrato/mensalidade é criado em nome do responsável; o nome do aluno aparece só como referência descritiva na linha (ex.: "mensalidade ref. ao contrato do aluno FULANO DE TAL").

**Por quê**: regra de domínio explícita do usuário (2026-08-03) — menores não podem ser parte de um contrato financeiro, quem paga/responde legalmente é sempre o responsável.

**Como aplicar**: já implementado e consistente — `createGuardianForStudent.ts` sincroniza o **guardian** (não o aluno) com o ERP via `erpEmit.upsertClient`, e o fluxo de assinatura de contrato (`signEnrollmentContract.ts`, Fase 1, fechado em 2026-08-05) resolve `clienteCpfCnpj` a partir do CPF do responsável. Essa regra já está construída — só relevante lembrar se algum fluxo financeiro novo for adicionado depois (ex.: extensão de contratos formais no ERP, quando os bugs `syncContrato`/`syncFinanceiro` do lado do ERP forem corrigidos — ver `docs/STATUS.md` → Backlog).
