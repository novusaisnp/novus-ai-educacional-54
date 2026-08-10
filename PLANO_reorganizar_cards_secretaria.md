# Reorganizar cards do hub Secretaria em grupos

## Contexto

Hub `/app/secretaria` (`SecretariaHub.tsx`) mostra 20 cards soltos, grid 1/2/3 colunas, sem
agrupamento por assunto — item pendente registrado no `docs/STATUS.md` (checkpoint
2026-08-10, "avaliar viabilidade de reorganizar cards em grupos"). Usuário confirmou:
accordion na mesma página (sem rota nova), 5 grupos por assunto. Plano é só design — execução
fica pra depois, a pedido do usuário.

## Decisões confirmadas com o usuário

- **Interação**: `Accordion` (shadcn, já existe em `src/components/ui/accordion.tsx` —
  reutilizar, não criar componente novo). Grupo abre/fecha in-place, subcards aparecem
  dentro do grupo expandido. Nenhuma rota nova, nenhuma mudança em `ModalMestre`/query params
  (`?modal=`) — cada card individual continua navegando exatamente como hoje
  (`getRouteForModule`/`getQuickAddRoute`, intocados).
- **5 grupos**, mapeando os 20 `id`s existentes no array `modules` (`SecretariaHub.tsx:50-71`):
  1. **Cadastros Acadêmicos**: `alunos`, `turmas`, `disciplinas`, `matriculas`
  2. **Estrutura Escolar**: `unidades`, `segmentos`, `series`, `periodos`, `salas`, `horarios`
  3. **Atendimento**: `responsaveis`, `documentos`, `visitantes`, `reservas`, `solicitacoes`
  4. **Ciclo do Aluno**: `ex-alunos`, `rematricula`, `transferencias`, `contratos`
  5. **Equipe**: `equipe` (grupo de 1 card só — mantém visível, não force-agrupar em outro
     grupo semanticamente errado)

## Arquivo tocado

Só **`src/features/secretaria/hub/SecretariaHub.tsx`** — nenhum outro arquivo precisa mudar.
`secretaria.tsx` (wrapper), `ModalMestre.tsx`, rotas em `App.tsx`, todos os `Submodal*.tsx` e
`ListPage.tsx` ficam exatamente como estão (confirmado na investigação: nenhum card hoje abre
modal direto do hub, todos usam `navigate(...)`, então a mudança é puramente visual/estrutural
no grid, zero impacto em lógica de navegação existente).

## Capricho visual (pedido do usuário: já que vai mexer, aproveitar)

Hoje os 20 cards usam o visual shadcn genérico puro: `<Card>` com borda fina, ícone em
tint pastel uniforme, grid uniforme — exatamente o padrão "admin panel" que a skill
`novus-satellite-visual-identity` existe pra evitar em telas de satélite. Reorganizar em
grupos é o momento certo de aplicar esse sistema no hub Secretaria, não só mudar a
estrutura de agrupamento:

- **Cards sem borda, sombra em camadas** em vez de `border` fino + `hover:shadow-md` atual —
  troca de classe, mesmo componente `<Card>`.
- **`AccordionTrigger` de cada grupo com identidade mais forte** que o texto padrão do
  Accordion shadcn — ícone do grupo (agregando os ícones dos módulos, ou 1 ícone
  representativo escolhido por grupo) + contagem em badge estilo "totem" (gradiente radial
  saturado) em vez de texto plano `(4)`.
- **Paleta**: os 20 `color` atuais (`bg-blue-50 text-blue-600 border-blue-200`, etc.) são
  tints pastel arbitrários por card, sem relação com a paleta marfim quente + teal + coral +
  gold da identidade do satélite — trocar por paleta consistente da skill, possivelmente 1
  cor-base por grupo (5 grupos = 5 acentos) em vez de 20 cores soltas sem padrão.
- **Layout bento assimétrico** dentro de cada grupo aberto é opcional/avaliar na execução —
  grid uniforme 1/2/3 colunas pode continuar se ficar limpo o suficiente com os outros
  ajustes; não forçar bento se a contagem de cards por grupo (4 a 6) não pedir variação de
  tamanho.
- Carregar a skill `novus-satellite-visual-identity` no início da sessão de execução (não
  reinventar tokens de cor/sombra na hora — a skill já define isso).

## Implementação (para a sessão de execução)

1. Adicionar campo `group: string` a cada entrada do array `modules` (`SecretariaHub.tsx:51-70`),
   valor = um dos 5 nomes de grupo acima. Não precisa de array de metadados separado — group é
   só mais uma propriedade do objeto que já existe.
2. Derivar a lista de grupos agrupando `modules` por `group` (ex. `Object.groupBy` ou
   `reduce`/`Map` — projeto usa TS moderno, checar se `Object.groupBy` (ES2024) está disponível
   no target antes de usar; senão `reduce` simples resolve em 3 linhas).
3. Trocar o `<div className="grid ...">` único (`SecretariaHub.tsx:82-122`) por um
   `<Accordion type="multiple">` (multiple, não single — usuário pode querer 2 grupos abertos
   ao mesmo tempo, ex. comparar Estrutura Escolar com Atendimento) com um `<AccordionItem>` por
   grupo. Dentro de cada `AccordionTrigger`: nome do grupo + contagem de cards (`(4)`, `(6)` etc,
   affordance barata). Dentro de cada `AccordionContent`: o mesmo grid `grid-cols-1
   md:grid-cols-2 lg:grid-cols-3 gap-6` de hoje, só com o subconjunto de `modules` daquele
   grupo — o `<Card>` de cada módulo (`SecretariaHub.tsx:86-119`) não muda nada por dentro.
4. Estado aberto/fechado: **não persistir** (nem localStorage nem query param) — abre do zero
   a cada visita à página, mesmo comportamento simples que o resto do app usa pra UI
   efêmera. Se o usuário pedir persistência depois, é acréscimo pontual, não faz parte deste
   escopo.
5. Grupo "Equipe" (1 card só): manter como `AccordionItem` igual aos outros, por consistência
   visual — não vale criar um caso especial de card solto fora do accordion só por ter 1 item.

## Fora de escopo (não pedido, não mexer)

- Migrar `onOpenModal`/dead code em `secretaria.tsx`/`SecretariaHub.tsx` (código morto já
  documentado, tarefa separada).
- Mudar `ModalMestre.tsx` pra aceitar `?modal=` de qualquer um dos 15 tabs a partir do hub
  genérico (limitação já documentada, tarefa separada).
- Bug "Object not found" em `secretaria/documentos` (já corrigido em sessão anterior, não
  relacionado).

## Verificação (quando for executar)

- `bun run typecheck && bun run test` (baseline atual: 46/46) — mudança é só estrutura de
  render, não deve quebrar nenhum teste existente.
- Teste visual ao vivo (Claude in Chrome): abrir `/app/secretaria`, confirmar 5 grupos
  fechados por padrão, expandir 2 ao mesmo tempo (confirma `type="multiple"`), clicar em
  "Abrir Lista"/"Cadastro Rápido" de 1-2 cards de grupos diferentes pra confirmar que a
  navegação existente não regrediu. Testar em mobile (390×844, mesma técnica de iframe
  injetado já usada nas sessões anteriores) — `Accordion` do shadcn já é acessível/responsivo
  por padrão, mas confirmar que os cards dentro do grupo aberto não estouram largura.
