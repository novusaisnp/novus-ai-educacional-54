---
name: feedback-test-data-cleanup-timing
description: "Em builds longos e iterativos, não inserir/apagar dado de teste após cada rodada de verificação — deixar até o fim da feature e limpar uma vez só."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:06.537Z
---

Durante desenvolvimento ativo de feature multi-etapa (ex.: construir um fluxo inteiro passando por migrations, hooks, UI, verificação ao vivo no navegador), não limpar dado de teste (alunos, turmas, contratos de teste etc.) depois de cada etapa individual de verificação. Criar uma vez, deixar no banco, reutilizar/inspecionar ao longo das várias rodadas de verificação que a construção de uma feature exige, e só apagar no final — quando a feature inteira estiver completa e totalmente testada.

**Por quê**: o usuário disse explicitamente (2026-08-05, durante a construção da feature de contrato de matrícula) que inserir e apagar dado de teste repetidamente após cada checagem é "contraproducente, gerador de consumo desnecessário de tokens" — cada rodada de limpeza custa uma ida-e-volta que não precisa acontecer no meio da construção. Isso contrasta com o padrão da sessão anterior de correção de RLS, onde limpar dado de teste após cada verificação curta e isolada era apropriado — a diferença é o formato da sessão: uma checagem rápida e pontual ainda deve se limpar sozinha, mas uma sessão de construção longa e iterativa não.

**Como aplicar**: no início de uma construção multi-etapa, não planejar limpeza por-etapa. Só apagar linhas de teste uma vez: pouco antes de declarar a feature pronta (depois que typecheck/testes/verificação no navegador final passarem todos), ou se o usuário pedir antes. Para tarefas de verificação curtas e pontuais (como checagens de política RLS), o padrão antigo de limpar-conforme-vai ainda vale — essa preferência é especificamente sobre builds iterativos mais longos.
