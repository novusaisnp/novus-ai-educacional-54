---
name: feedback-date-range-ux
description: "Em UIs de calendário/agenda, agrupar entradas consecutivas do mesmo tipo numa única linha em vez de listar cada dia."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:03:59.745Z
---

Ao construir qualquer lista de UI apoiada em linhas por-dia (exceções de calendário, registros de presença, sobreposições de horário etc.), não renderizar uma linha de tabela por data individual se uma sequência contígua de datas compartilha o mesmo tipo/descrição. Agrupar entradas contíguas numa única linha mostrando o intervalo (ex.: "13/07/2026 a 31/07/2026 — Recesso") com ação em lote (editar/excluir) aplicada ao grupo inteiro.

**Por quê**: testando a feature `calendar_exceptions` em `novus-educacional`, o usuário objetou ao vivo: "não acho legal listar esse tanto de dias, ocupa UIX sem necessidade, poderia colocar o periodo em uma unica linha com a descrição correta dos dias." Um recesso de 19 dias tinha sido armazenado e exibido como 19 linhas separadas — modelo de dados correto, apresentação ruim. A correção foi puramente de exibição/agrupamento (agrupar num `useMemo` por data contígua + tipo/descrição igual, exclusão em lote pela lista de ids do grupo), não uma mudança em como o dado é armazenado (armazenamento por-dia continua necessário para lookups tipo `isSchoolDay`).

**Como aplicar**: sempre que o armazenamento subjacente for intencionalmente por-dia/por-unidade para correção de consulta, mas a contagem de linhas puder ficar grande num uso real (intervalos de semanas, entradas idênticas repetidas), adicionar uma etapa de agrupamento/colapso antes de renderizar a lista, e fazer as ações em lote operarem sobre o grupo. Não esperar o usuário notar — esse padrão vale para qualquer feature futura com linhas contíguas de mesmo valor (ex.: frequência, períodos de validade de preço).
