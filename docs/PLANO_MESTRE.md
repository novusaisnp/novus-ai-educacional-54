# NOVUS.AI Educacional — Plano Mestre (prontidão e app mobile)

> Documento único — funde `docs/ROADMAP.md` (painel de prontidão) e `docs/MOBILE_PLAN.md`
> (arquitetura do app mobile), consolidados em 2026-08-19 a pedido do usuário (documentação
> espalhada demais pelo ecossistema). Os dois arquivos originais foram removidos; o conteúdo
> vive aqui.
>
> **O que NÃO está aqui:** checkpoint de sessão (o que aconteceu, quando) continua em
> [`STATUS.md`](./STATUS.md); regras e arquitetura estáveis do repo em
> [`../CLAUDE.md`](../CLAUDE.md).

---

# Parte 1 — Painel de prontidão para produção

*(ex-`ROADMAP.md`)* **Painel vivo.** Este documento responde "quanto falta para entregar o
sistema a uma escola cliente".

**Nota global: 92/100** (média ponderada pelos pesos da tabela de módulos) — medido em
2026-08-13, F1–F11 aplicadas/checadas (F8 e F9 parciais).

## Rubrica

Cada módulo soma 5 eixos de 20 pontos. A nota mede prontidão para produção, não cobertura de escopo: um módulo pequeno e completo vale 100; um módulo ambicioso e meio-pronto, não.

| Eixo | Vale 20 quando |
|---|---|
| **Funcional** | Fluxo completo (criar/listar/editar/remover onde faz sentido), sem botão sem `onClick`, sem handler no-op |
| **Dado real** | Zero mock/hardcode exibido como se fosse real; lê e grava no Supabase |
| **RLS** | Tabelas do módulo com RLS ligado *e* policy real (`pg_policies`), não só RLS ligado |
| **UX** | Loading, empty e erro tratados; validação; sem bug conhecido de data/`defaultValue` |
| **Verificado** | Testado ao vivo com dado real (browser, login real), registrado em `STATUS.md` |

Estado do eixo RLS em 2026-08-12 (verificado por query direta): **todas** as tabelas de `public` têm RLS ligado e só `entidade_id_map` está sem policy — é tabela de trabalho da migração de entidades, sem consumidor no app. O padrão "RLS sem policy" que assombrou este schema está, hoje, resolvido.

## Placar por módulo

| Módulo | Peso | Nota | Eixos que faltam | Fatia que fecha |
|---|---|---|---|---|
| [Acadêmico](#acadêmico--97100) | 20 | **97** | — | — |
| [Secretaria](#secretaria--90100) | 20 | **90** | Verificado | — |
| Dashboard (`app/dashboard.tsx`) | 5 | **90** | UX (loading parcial) | — |
| Mural (`app/mural.tsx`) | 3 | **100** | — | — |
| Auth/Onboarding (`auth/*`, `OrgGate`) | 8 | **95** | Captcha desligado (ação do usuário no Cloudflare) | F8 (parcial) |
| [Config/Integrações](#configintegrações--90100) | 4 | **90** | UX (loading no submit da tela) | — |
| [Portal da Família](#portal-da-família--92100) | 12 | **92** | — | — |
| [BI](#bi--98100) | 8 | **98** | Funcional (BI Financeiro depende de F10) | F9, F10 |
| [Integração ERP](#integração-erp--92100) | 10 | **92** | — | — |
| [CRM](#crm--74100) | 8 | **74** | Campanhas fora do escopo v1 | F9 (em andamento) |
| Pedagógico (`app/pedagogico.tsx`) | 1 | **90** | delete não testado no browser (`confirm()` trava automação, mesmo mecanismo do Eventos) | — |
| Eventos (`app/eventos.tsx`) | 1 | **90** | sem repetição/recorrência de evento (por design, não pedido) | — |
| [App mobile (`/m/*`)](#app-mobile-m--88100) | 0 | **88** | UX (layout considerado fraco pelo usuário — "funilaria" adiada); iOS não iniciado (exige Mac + conta Apple) | polimento visual do app |

### Acadêmico — 97/100

**F3 feita (2026-08-12)**: bug de data UTC-3 corrigido em todos os pontos confirmados deste módulo.
**F5 feita (2026-08-12)**: hub fechado — "Competências" (sem schema, feature nova) removido em vez de mentir "Em desenvolvimento"; "Relatórios" trocou a fachada por links reais pro BI Acadêmico e pro Relatório de Chamada, que já existiam e só não estavam linkados a partir do hub.

| Submódulo | Nota | O que falta |
|---|---|---|
| Chamada (`academico/chamada.tsx`, `chamada/relatorio.tsx`) | 100 | — |
| Avaliações (`academico/avaliacoes.tsx`) | 100 | — |
| Notas (`academico/notas.tsx`, `GradesFilters.tsx`, `GradesGrid.tsx`, `AssessmentsPicker.tsx`) | 100 | — |
| Currículo (`academico/curriculo.tsx`) | 100 | — |
| Boletins (`academico/boletins.tsx`) | 95 | — (leitura + emissão, por design) |
| Resultados do período / Conselho de classe | 90 | leitura + ação pontual, sem criar/excluir (por design) |
| PEI coordenação (`academico/pei-coordenacao.tsx`) | 85 | painel só-leitura, sem ação a partir dele |
| Justificativas de falta | 90 | — |
| Hub Acadêmico (`academico.tsx`) | 100 | — |

### Secretaria — 90/100

**F6 checada (2026-08-12), sem código mudado**: os 7 submodais listados abaixo já tinham `isSubmitting`/`isPending` desabilitando o botão de submit — achado do inventário original estava desatualizado. `Unidades/Segmentos/Séries/Períodos` sobem de nota; nenhum arquivo tocado.

**F4 feita (2026-08-12)**: os 4 botões mortos de Solicitações resolvidos (Download real via signed URL, Editar/Anexar abrem edição real, "Ver" removido por ser redundante com Editar). Submodal ganhou upload de anexo em modo edição. `console.log` de debug removido do submit de Alunos.

| Submódulo | Nota | O que falta |
|---|---|---|
| Alunos, Turmas, Disciplinas, Matrículas | 95 | `alunos.tsx` sem exclusão (só inativação, por design) |
| Unidades / Segmentos / Séries / Períodos | 95 | — |
| Solicitações (`secretaria/solicitacoes.tsx`) | 90 | sem live-test do fluxo novo (Download/Editar/Anexar) |
| Reservas, Visitantes, Documentos, Ex-Alunos, Rematrícula | 85 | falta empty state; `SubmodalRematricula` não edita, só cria |
| Entidades (`secretaria/entidades.tsx` + `FormEntidade.tsx`) | 75 | sem exclusão, e **nunca testado ao vivo** (Cadastro Unificado Fases 5-8) |
| Equipe / Salas / Horários / Transferências | 80 | Equipe sem editar/excluir; Salas sem excluir; Horários sem editar |
| Períodos: calendário, termos, contrato modelo | 95 | — |

### Portal da Família — 92/100

**F7 feita (2026-08-12)**: primeiro live-test real do portal desde que o app existe. Achado e corrigido **um bug real que quebrava `Documentos` para 100% dos responsáveis**: `portal/documentos.tsx` fazia um embed PostgREST numa coluna sem FK real (`documents.owner_type/owner_id` é polimórfico) — 400 sempre, mascarado atrás de ~7s de retry do React Query. Fix reusa `useLinkedStudents` (FK real via `student_guardians`) e resolve o nome do aluno no client.

| Submódulo | Nota | O que falta |
|---|---|---|
| Login / Dashboard | 95 | sem loading state explícito no dashboard (cosmético) |
| Acadêmico (notas/frequência + justificar falta) | 95 | testado, vazio honesto |
| Financeiro | 85 | query extraída pra `usePortalFinance`, filtro de período real; ainda depende de ERP configurado |
| Documentos | 90 | bug de embed corrigido nesta fatia — testado, vazio honesto |
| Interações / Demandas | 95 | testado, formulário de nova mensagem/demanda funcional |
| Configuração do portal (`usePortalConfig.ts`) | 100 | persistido desde F1 |

### BI — 98/100

| Submódulo | Nota | O que falta |
|---|---|---|
| BI Acadêmico (`bi/academico.tsx`) | 100 | — |
| BI CRM (`bi/crm.tsx`) | 100 | — |
| BI Financeiro (`bi/financeiro.tsx`) | 10 | tela inteira é EmptyState "ERP não configurado" |
| Hub BI (`bi.tsx`) | 90 | hub de navegação, por design |

### CRM — 76/100

**F9 fatia 2 — redesign visual de `leads/[id].tsx` (feita, 2026-08-29)**: tela de detalhe
do lead trocou o admin-panel genérico (`Badge` padrão, cards com borda) pelo mesmo sistema
visual já validado em `leads.tsx` (badges "totem" via `IconBadge`, cards sem borda com
sombra em camada, botões de ação em pill, timeline de interações com indicador de canal
colorido). Interações já eram reais desde a fatia de 2026-08-12 abaixo — não precisou de
mudança funcional, só visual.

**F9 fatia 2 (feita, 2026-08-12)**: "Nova Interação" ganhou dialog real (picker de lead reusando `useLeads`, canal/direção/resumo, grava via `useCreateInteraction`). De brinde: a coluna "Entidade" da tabela sempre mostrava vazio (`entity_name` hardcoded `''`); resolvida no client comparando `entity_id` com os leads já carregados. Picker limitado a leads (visitor) — guardian/student ainda sem picker, gap registrado.

**F9 iniciada (2026-08-12)**: decisão de produto tomada — CRM redesenhado como produto "de ponta estilo Helena" (referência: helena.run), sem WhatsApp API ainda (entra quando a conta Business for aprovada), IA v1 só sugere rascunho pro atendente revisar. Campanhas e Interações seguem como estavam.

**Fatia 1 (feita, 2026-08-12)**: Leads virou kanban (4 colunas, drag nativo HTML5). Bug achado: `status` do lead estava hardcoded em `'ativo'` — corrigido, agora vive em `entidade_papeis.dados_papel`. **Verificado ao vivo**: board carrega, drag entre colunas persiste (confirmado por SQL). 2 bugs achados e corrigidos em `leads/[id].tsx`: mesmo padrão de data UTC-3 do F3, e 3 botões mortos (Ligar/WhatsApp/E-mail) viraram links reais.

**F2 feita (2026-08-12)**: mocks exibidos como dado real, eliminados (`useInadimplencia`, `erpDisabledOrMock`, `tempoMedioResolucao`). `usePendenciasDoc` segue honestamente não-implementado.

| Submódulo | Nota | O que falta |
|---|---|---|
| Leads (`crm/leads.tsx`, `leads/[id].tsx`) | 97 | testado ao vivo ponta a ponta, sem exclusão (por design); as duas telas já no mesmo padrão visual |
| Interações (`crm/interacoes.tsx`) | 90 | picker de "Nova Interação" só cobre leads, sem guardian/student |
| Demandas (`crm/demandas.tsx`) | 75 | botão "Ver Documentos" morto (aba ainda não implementada) |
| Assistente IA (`crm/assistente.tsx`) | 70 | sem histórico de conversa persistido — v2 do CRM vai precisar disso |
| Campanhas (`crm/campanhas.tsx`) | 5 | "Campanhas em Breve" — fora do escopo da visão nova |
| Hooks (`useCRM.ts`) | 80 | `usePendenciasDoc` honestamente não-implementado; leads/inadimplência reais |

### Integração ERP — 92/100

**F10 residual feita (2026-08-12)**: saída Educacional→ERP testada contra o `sync-webhook` real. Responsável de teste criado via `/app/secretaria/entidades`, confirmado nos dois bancos em ~3s de latência com `origem_sistema='novus-educacional'`. Dado de teste limpo dos dois lados ao final.

**F10 checada (2026-08-12), nenhum código mudado**: os 2 bugs bloqueantes reportados em 2026-08-05 já tinham sido corrigidos numa sessão do `novusai-erp` em 2026-08-09 (migration `20260809233000`). Contrato formal ligado à matrícula e mensalidade recorrente automática **não estão mais bloqueados** do lado do ERP.

Único gap real restante: **saída (Educacional → ERP) nunca foi testada contra o `sync-webhook` real com `mock=false` em outro cenário além do teste acima**. `erpEmit` ainda tem um método que responde "não implementado" (`emit.ts:38`).

### Config/Integrações — 90/100

**F1 feita (2026-08-12)**: `usePortalConfig`/`useNotificationsConfig`/`usePWAConfig` agora persistem em `organizations.settings` (jsonb) via hook `useOrgSettings` novo. Falta só `isSaving`/loading no botão de submit da tela (`config/integracoes.tsx`).

### App mobile (`/m/*`) — 88/100

**Peso 0 de propósito**: é produto novo, ainda não entregue a nenhuma escola — não deve puxar a nota global do sistema web pra baixo. Vira peso real quando a v1 (Fases 0–7 da Parte 2 abaixo) fechar. **Fases 0–7 fechadas em 2026-08-13**: roda como APK Android (Capacitor 8), com push real do FCM chegando no aparelho e live-test das duas peles com login real. Arquitetura completa, decisões e o que falta (F12/F13): Parte 2 deste documento.

| Eixo | Nota | Por quê |
|---|---|---|
| Funcional | 20/20 | Fases 0–7 completas: família (início/acadêmico/mural/mensagens/financeiro), staff (chamada offline/publicar/mensagens/alunos), casca Capacitor e push FCM |
| Dado real | 20/20 | Nenhum mock — tudo lê e grava no Supabase, reusando os hooks do portal |
| RLS | 20/20 | `announcement_responses` e `push_tokens` criadas já com policy explícita, conferidas em `pg_policies` |
| UX | 12/20 | Safe areas e teclado conferidos no device; **layout considerado fraco pelo usuário** — polimento visual é a próxima fatia, adiada de propósito |
| Verificado | 16/20 | Duas peles abertas com login real (emulador Android + navegador); push e chamada gravando conferidos no banco. Falta iOS, que exige Mac + conta Apple paga |

Dívida específica: `/app/academico/chamada` ainda não consome o `useAttendanceSheet`, então existem duas cópias do mesmo upsert — exatamente o que o plano queria evitar.

## Fila de fatias

Ordenada por pontos ganhos ÷ esforço. Bloqueadores de produção primeiro — critério: **dado mock exibido como real** e **botão morto em CTA principal** bloqueiam; tela que se declara "Em desenvolvimento" não.

| # | Fatia | Arquivos | Ganho |
|---|---|---|---|
| ~~**F1**~~ | ~~Persistir as configs do app~~ — feito em 2026-08-12 | `usePortalConfig.ts`, `useNotificationsConfig.ts`, `usePWAConfig.ts`, migration `20260812000000` | Config 70→90 |
| ~~**F2**~~ | ~~Matar os mocks do CRM~~ — feito em 2026-08-12 | `useCRM.ts`, `crm/demandas.tsx`, `crm/assistente.tsx`, `crm.tsx` | CRM 47→56 |
| ~~**F3**~~ | ~~Varredura do bug de data UTC-3~~ — feito em 2026-08-12, 15 pontos em 10 arquivos | `avaliacoes.tsx`, `chamada/relatorio.tsx`, `bi/{academico,crm}.tsx`, `portal/academico.tsx`, `Grades{Filters,Grid}.tsx`, `AssessmentsPicker.tsx`, `Submodal{Alunos,Reservas}.tsx` | Acadêmico 87→93, BI 68→98 |
| ~~**F4**~~ | ~~Ligar os 4 botões mortos de Solicitações~~ — feito em 2026-08-12 | `secretaria/solicitacoes.tsx`, `SubmodalSolicitacoes.tsx`, `SubmodalAlunos.tsx` | Secretaria 82→87 |
| ~~**F5**~~ | ~~Fechar o hub Acadêmico~~ — feito em 2026-08-12 | `academico.tsx` | Acadêmico 93→97 |
| ~~**F6**~~ | ~~`isPending` nos 7 submodais~~ — checado em 2026-08-12: já estava feito | — | Secretaria 87→90 |
| ~~**F7**~~ | ~~Live-test completo do Portal + Mural~~ — feito em 2026-08-12, achou e corrigiu bug real em Documentos | `portal/documentos.tsx` | Portal 69→92, Mural 90→100 |
| **F8 (parcial)** | ~~Rota `*` cair em `NotFound`~~ feito em 2026-08-12. Captcha continua desligado — depende do usuário adicionar o domínio de produção na allowlist do Cloudflare Turnstile; quando fizer, reativar `security_captcha_enabled` via Supabase Auth API nos dois projetos (educacional + ERP) | painel Cloudflare (ação do usuário) | Auth 90→95, falta captcha pra 100 |
| ~~**F9**~~ | ~~CRM v1 "estilo Helena"~~ — Fatia 1 (kanban de Leads) feita 2026-08-12, Fatia 2 (redesign visual de `leads/[id].tsx`) feita 2026-08-29. WhatsApp/IA autônoma seguem fora do escopo original — e agora deliberadamente despriorizados (ver F14) | `crm/leads/[id].tsx`, `crm/interacoes.tsx` | CRM 62→76 |
| ~~**F14 fase 1**~~ | ~~Duas PWAs instaláveis (equipe/família)~~ — feito e no ar 2026-08-29. Decisão de produto: investir no Educacional de ponta a ponta, WhatsApp vira acessório, mobile ganha duas peles instaláveis separadas (interna + comunicação com a família). `VITE_APP_TARGET` (split de rota/manifest), 2 projetos Vercel novos + DNS na Porkbun, verificado ao vivo (staff→`/auth/login`, família→`/portal/login`, isolamento de rota confirmado por 404 cruzado). `educacional.novusai.app` (combinado) intocado. Addendum de casca nativa (Capacitor duplicado por alvo) ainda não iniciado — Android de hoje já funciona como app único, iOS segue na gaveta (F13). Plano: `C:\Users\maxwe\.claude\plans\fancy-painting-mochi.md` | `vite.config.ts`, `src/App.tsx`, `src/routes/mobile.tsx`, `src/lib/appTarget.ts`, `src/pages/Index.tsx` | App mobile 88→? |
| ~~**F10**~~ | ~~Corrigir bugs + testar saída contra sync-webhook real~~ — feito em 2026-08-12 | repo irmão | ERP 66→92 |
| ~~**F11**~~ | ~~Pedagógico e Eventos~~ — ambos feitos em 2026-08-13. Eventos: CRUD real (tabela `events`). Pedagógico: construído por completo (4 CRUDs) | `pedagogico.tsx`, `eventos.tsx`, migrations novas | Pedagógico 0→90, Eventos 0→90 |
| ~~**F0-F7 mobile**~~ | ~~App mobile v1 completo~~ — fechado em 2026-08-13 (ver Parte 2) | `src/pages/m/**`, `src/components/mobile/**`, `capacitor.config.ts`, `android/` | App mobile 0→88 |
| **F12** | **Funilaria do app mobile** — próxima fatia acordada com o usuário (2026-08-13): a mecânica está pronta e testada, o layout é que foi considerado fraco. Resolve-se no navegador, sem device | `src/pages/m/**`, `src/components/mobile/**`, skill `novus-satellite-visual-identity` | App mobile 88→? |
| **F13 (na gaveta, ponta de fora)** | **iOS** — decidido em 2026-08-13 **adiar, não cancelar**. Nada foi feito: não existe `ios/`, o Capacitor só tem a plataforma Android. Emular iOS em Windows é impossível (Simulator é parte do Xcode, só roda em macOS). Caminhos, quando for a hora: (a) Mac na nuvem por hora (MacinCloud/Scaleway/EC2 Mac, ~US$1-3/h); (b) runner `macos-latest` no GitHub Actions só pra compilar; (c) Mac Apple Silicon próprio. Push no iOS exige iPhone real + conta Apple paga + APNs Auth Key. Enquanto isso, a UI se confere no Safari de um iPhone real apontando pro dev server | `capacitor.config.ts`, `ios/` (não existe), conta Apple Developer | iOS 0→? |

Fora desta fila, já registrado em `STATUS.md` como backlog e não pontuado aqui: dívida de lint (~234 erros, majoritariamente em Edge Functions), rotação de credenciais, secrets do Supabase (`OPENAI_API_KEY`, `RESEND_API_KEY`), Fase 0-E (importação/ETL de dados legados) e as fases de escopo novo (Censo/Inep, Copiloto do Professor, Engajamento).

## Manutenção

Atualize a nota do módulo **na mesma sessão** em que o código dele mudar, junto do checkpoint no `STATUS.md`. Nota sem data de medição apodrece.

---

# Parte 2 — App mobile: arquitetura e decisões

*(ex-`MOBILE_PLAN.md`, escrito em 2026-08-13. **Fases 0-7 (v1 completa) fechadas em
2026-08-13** — ver Parte 1, seção "App mobile". O que resta é só F12 (funilaria visual) e
F13 (iOS, na gaveta) — fila de fatias acima. O conteúdo abaixo é mantido como referência de
arquitetura e das decisões já tomadas, não como plano em aberto.)*

## Contexto

Antes desta fatia não existia escopo formal de app mobile — só ideias soltas. O que existia de concreto: PWA instalável (educacional e ERP), responsividade corretiva da área staff, e um mockup HTML estático de Portal Família mobile em `novus_edu_mockups.html`.

**Premissa acordada com o usuário**: embrulhar o `/app/*` atual no Capacitor entregaria um APK com cara de site numa caixa (sidebar, `<Table>` com scroll horizontal, `ModalMestre` de 13 abas). Não é isso. Responsividade faz o desktop caber; app mobile se desenha pro polegar desde o início.

**Pesquisa de mercado (fontes no fim)**: concorrentes BR — Agenda Edu (3 mil escolas, 4 mi de usuários), ClassApp, Sponte Agenda Plus. Internacionais: ClassDojo, Seesaw, ParentSquare. Dois achados que moldaram o escopo:
1. **Chat família↔escola é o coração da categoria no Brasil** — ClassApp e Agenda Edu nasceram disso.
2. **Chamada offline com sync é pré-requisito, não diferencial** — Sponte Gov Prof, Gestão Presente na Escola (MEC) e Toth anunciam isso como básico.

Onde o NOVUS.AI já saía na frente e nenhum concorrente pesquisado tinha: PEI/educação inclusiva, prontuário de saúde, camada de IA.

## Decisões fechadas (implementadas, não re-discutir)

| Decisão | Valor |
|---|---|
| Arquitetura | Rotas `/m/*` no mesmo repo, UI mobile própria, **zero** reuso de layout desktop, **100%** de reuso da camada de dados |
| Empacotamento | Capacitor (APK/IPA). Casca de entrega, não o produto |
| Público | Um app, duas peles por papel (família / staff), decidido no login |
| Push | FCM (entrega iOS via proxy APNs — um caminho de envio só) |
| Chat | 4ª aba da família |
| Offline | Chamada offline com sync |
| Extras do mercado | Autorização digital assinada, enquete/formulário, mural de fotos/diário — todos na v1 |

## Arquitetura

**Insight que baratou 3 features de uma vez**: autorização, enquete e fotos/diário **não são 3 telas** — são **tipos de card no mesmo feed** (modelo Agenda Edu). `announcements` ganhou `type` + `payload jsonb`, e a tabela `announcement_responses` serve autorização *e* enquete. Fotos reusam `documents` (polimórfico, `owner_type`/`owner_id`).

**Bottom nav, 5 abas por papel:**
- Família: `Início` · `Acadêmico` · `Mural` · `Mensagens` · `Mais`
- Staff: `Chamada` · `Alunos` · `Publicar` · `Mensagens` · `Mais`

`Mais` guarda Financeiro, Documentos, Perfil, Sair — não é aba própria.

**Convivência com a web**: um único `<Route path="/m/*">` em `src/App.tsx`, antes do `path="*"`. Nada de `/app` e `/portal` mudou. Duas subárvores dentro de `/m`, reusando os guards já existentes (`PortalProtectedRoute` para família, `ProtectedRoute`+`OrgGate` para staff).

**Regra de ouro do bundle**: tudo dentro de `src/routes/mobile.tsx` via `React.lazy`. O chunk principal tinha 2.235.492 bytes por imports eager em `src/App.tsx` — a árvore mobile entrando lazy evita o app nativo baixar o sistema inteiro pra mostrar um anel de frequência.

## Skills usadas para desenhar as telas

| Skill | Onde | Para quê |
|---|---|---|
| `mobile-app-ui-design` | `~/.claude/skills/mobile-app-ui-design/` | Padrões de UI/UX mobile de apps de referência (Airbnb, Duolingo, Spotify, Revolut): hierarquia visual, espaçamento, navegação, onboarding, componentes. |
| `novus-satellite-visual-identity` | `~/.claude/skills/novus-satellite-visual-identity/` | Paleta e tratamento do NOVUS.AI: marfim quente + teal + coral + gold, tipografia Sora/Nunito, cards sem borda com sombra em camadas, badges totem. |

Ordem de uso: `mobile-app-ui-design` decide **a estrutura** da tela; `novus-satellite-visual-identity` decide **a pele**. Ambas seguem valendo para a fatia F12 (funilaria) e para qualquer tela nova do app mobile.

## Fases (todas fechadas em 2026-08-13, exceto onde indicado)

### Fase 0 — Fundação ✅
`src/pages/m/index.tsx` (dispatcher por papel), `src/components/mobile/{MobileShell,MobileTabBar,MobileHeader,StudentSwitcher}.tsx`, `src/routes/mobile.tsx`. Reusa `useSession`, `useOrganization`, `usePortalAuth`, `useUserRole`. Regra de desempate no dispatcher: staff ganha se `useUserRole()` retornar não-nulo.

### Fase 1 — Família: Início + Acadêmico ✅
`src/pages/m/familia/{inicio,academico}.tsx` + `AttendanceRing.tsx` (SVG puro, sem `recharts` no chunk mobile). Reusa `useLinkedStudents`/`useStudentGrades`/`useStudentAttendance`.

### Fase 2 — Feed do Mural (avisos + fotos + autorização + enquete) ✅
`announcements.type`/`payload jsonb`; tabela `announcement_responses` (RLS + UNIQUE `(announcement_id, guardian_id)`). Assinatura reusa `signEnrollmentContract.ts`. `src/hooks/useAnnouncements.ts` extraído (matou duplicação entre `app/mural.tsx` e `portal/dashboard.tsx`).

### Fase 3 — Chat família↔escola ✅
`interactions.read_at` (badge de não-lidas). `src/pages/m/familia/mensagens.tsx` (thread única) e `src/pages/m/staff/mensagens.tsx` (lista de conversas). Reusa `usePortalData`/`useCRM.ts`.

### Fase 4 — Staff: Chamada com offline ✅
`src/pages/m/staff/chamada.tsx` + `useAttendanceSheet.ts` extraído (evita a duplicação de upsert que já causou bug de fuso antes). Preserva `onConflict: 'class_id,subject_id,student_id,date'`. Offline via persistência de mutation do `@tanstack/react-query` (`onlineManager`+`setMutationDefaults`), com indicador visível de "pendente de sincronização".
**Dívida conhecida**: `/app/academico/chamada` (desktop) ainda não migrou para `useAttendanceSheet` — duas cópias do mesmo upsert coexistem.

### Fase 5 — Família: Financeiro · Staff: Consulta de aluno ✅
`usePortalFinance.ts` extraído, respeita gate `hasERP`. Não gera boleto (quem emite é o ERP). `src/pages/m/staff/alunos.tsx`: busca `ilike` com debounce → Drawer com ficha resumida; não porta `StudentHealthSection`/`StudentPeiSection` (link "abrir ficha completa" resolve).

### Fase 6 — Push (FCM) ✅
`push_tokens` (UNIQUE em `token`, RLS+policies), `'push'` nos CHECK de `notification_queue`/`notification_templates`/`contact_consents`, `notify-dispatch` ganhou `sendPush()` via FCM HTTP v1. Ação humana já feita: projeto Firebase criado, `google-services.json`, service account cadastrado como secret. Android testado ponta a ponta. iOS depende de conta Apple Developer paga — não feito (F13).

### Fase 7 — Capacitor ✅
`capacitor.config.ts` (`webDir: 'dist'`, `appId: 'ai.novus.educacional'`, sem `server.url`). Redirect nativo `/`→`/m`. `android/` commitado. Build testado no emulador Android com Google Play — push de teste chegou.

## Riscos (ainda válidos para F12/F13 e telas mobile futuras)

1. **Bundle**: converter os imports eager de `App.tsx` pra lazy derruba o chunk pra todo mundo — mas é fase separada, não misturar com F12.
2. **Auth em WebView**: `supabase-js` usa `localStorage`; iOS pode limpar sob pressão de armazenamento. Aceito o re-login, sem storage nativo na v1.
3. **Fuso UTC-3**: toda coluna DATE precisa de `${date}T00:00:00` — o anel de frequência e o "vence hoje" erram por um dia se esquecer (mesmo padrão do bug F3, ver `feedback_date_range_ux` na memória de sessões antigas).
4. **Safe areas**: `env(safe-area-inset-bottom)` na tab bar e `viewport-fit=cover` — já aplicado, conferir em toda tela nova.
5. **Deep link de notificação**: payload FCM com `{ route: '/m/familia/mural' }` implementado. Universal/App Links (abrir do navegador) seguem fora do escopo — exigem verificação de domínio nas duas plataformas.
6. **Conflito offline**: dois professores lançando a mesma chamada — regra aplicada é último sync vence, com data/hora de captura visível no registro pendente.

## Verificação (padrão a repetir em qualquer trabalho novo de mobile, incluindo F12)

`bun run typecheck` + `bun run test` + `bun run build`, depois live-test no browser em 390×844 com login real, dado de teste criado e removido no fim.

## Escopo cortado da v1 (decisão registrada, revisitar só se o usuário pedir)

1. **iOS inteiro** — Android + PWA cobre a maior parte da base brasileira; ver F13 na Parte 1.
2. **Financeiro** — depende de ERP configurado por organização; hoje só a Allegra tem.
3. **Deep link avançado** (Universal/App Links) — push que abre o app na home já entrega a maior parte do valor.

Fora da v1 por decisão, considerar quando a v1 evoluir: matrícula digital com contrato assinado no app, pagamento in-app (PIX/cartão — hoje só exibimos 2ª via), tradução automática (ParentSquare), portfólio do aluno (Seesaw), gamificação.

## Fontes da pesquisa de mercado

[Sponte Agenda Plus](https://www.sponte.com.br/blog/sponte-agenda-plus-o-app-de-agenda-digital-escolar-do-sponte) · [Agenda Edu](https://www.agendaedu.com/) · [Agenda Edu Pagamentos](https://www.agendaedu.com/pagamentos-digitais) · [ClassApp](https://www.classapp.com.br/agenda-escolar-digital) · [ClassDojo vs Seesaw 2026](https://getshorthandapp.com/blog/classdojo-vs-seesaw-2026) · [Best Parent Communication Apps 2026](https://kiwibee.io/en/blog/best-parent-communication-apps-schools) · [Sponte Gov — professor offline](https://www.sponte.com.br/sponte-gov) · [Gestão Presente na Escola (MEC)](https://play.google.com/store/apps/details?id=br.gov.mec.frequenciagestaopresente&hl=pt_BR) · [Toth — App do Professor](https://sistematoth.com.br/pagina/aplicativo-professor)
