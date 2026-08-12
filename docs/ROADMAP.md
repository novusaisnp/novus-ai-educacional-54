# ROADMAP — NOVUS.AI Educacional

**Painel vivo de prontidão para produção.** Este arquivo responde "quanto falta para entregar o sistema a
uma escola cliente". Para o histórico do que foi feito em cada sessão, veja [`STATUS.md`](./STATUS.md);
para regras e arquitetura estáveis, [`../CLAUDE.md`](../CLAUDE.md).

**Nota global: 82/100** (média ponderada pelos pesos da tabela de módulos) — medido em 2026-08-12, F1+F2+F3+F4+F5 aplicadas.

## Rubrica

Cada módulo soma 5 eixos de 20 pontos. A nota mede prontidão para produção, não cobertura de escopo:
um módulo pequeno e completo vale 100; um módulo ambicioso e meio-pronto, não.

| Eixo | Vale 20 quando |
|---|---|
| **Funcional** | Fluxo completo (criar/listar/editar/remover onde faz sentido), sem botão sem `onClick`, sem handler no-op |
| **Dado real** | Zero mock/hardcode exibido como se fosse real; lê e grava no Supabase |
| **RLS** | Tabelas do módulo com RLS ligado *e* policy real (`pg_policies`), não só RLS ligado |
| **UX** | Loading, empty e erro tratados; validação; sem bug conhecido de data/`defaultValue` |
| **Verificado** | Testado ao vivo com dado real (browser, login real), registrado em `STATUS.md` |

Estado do eixo RLS em 2026-08-12 (verificado por query direta): **todas** as tabelas de `public` têm RLS
ligado e só `entidade_id_map` está sem policy — é tabela de trabalho da migração de entidades, sem consumidor
no app. O padrão "RLS sem policy" que assombrou este schema está, hoje, resolvido.

## Placar por módulo

| Módulo | Peso | Nota | Eixos que faltam | Fatia que fecha |
|---|---|---|---|---|
| [Acadêmico](#acadêmico-9710) | 20 | **97** | — | — |
| [Secretaria](#secretaria-8710) | 20 | **87** | UX, Verificado | F6 |
| Dashboard (`app/dashboard.tsx`) | 5 | **90** | UX (loading parcial) | — |
| Mural (`app/mural.tsx`) | 3 | **90** | Verificado (lado portal) | F7 |
| Auth/Onboarding (`auth/*`, `OrgGate`) | 8 | **90** | UX (catch-all cai no login, `NotFound` morto) | F8 |
| [Config/Integrações](#configintegrações-9010) | 4 | **90** | UX (loading no submit da tela) | — |
| [Portal da Família](#portal-da-família-6910) | 12 | **69** | Verificado, Dado real, UX | F1, F7 |
| [BI](#bi-9810) | 8 | **98** | Funcional (BI Financeiro depende de F10) | F9, F10 |
| [Integração ERP](#integração-erp-6610) | 10 | **66** | Verificado, Funcional | F10 (bloqueada fora do repo) |
| [CRM](#crm-5610) | 8 | **56** | Funcional, Verificado | F9 |
| Pedagógico (`app/pedagogico.tsx`) | 1 | **0** | tudo — 4 cards "Em desenvolvimento", zero query | F11 |
| Eventos (`app/eventos.tsx`) | 1 | **0** | tudo — idem | F11 |

### Acadêmico — 97/100

**F3 feita (2026-08-12)**: bug de data UTC-3 corrigido em todos os pontos confirmados deste módulo.
**F5 feita (2026-08-12)**: hub fechado — "Competências" (sem schema, feature nova) removido em vez de
mentir "Em desenvolvimento"; "Relatórios" trocou a fachada por links reais pro BI Acadêmico e pro
Relatório de Chamada, que já existiam e só não estavam linkados a partir do hub.

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

### Secretaria — 87/100

**F4 feita (2026-08-12)**: os 4 botões mortos de Solicitações resolvidos (Download real via signed URL,
Editar/Anexar abrem edição real, "Ver" removido por ser redundante com Editar — mesma ação, dois botões).
Submodal ganhou upload de anexo em modo edição (só existia pra solicitação nova). `console.log` de debug
removido do submit de Alunos.

| Submódulo | Nota | O que falta |
|---|---|---|
| Alunos, Turmas, Disciplinas, Matrículas | 95 | `alunos.tsx` sem exclusão (só inativação, por design) |
| Unidades / Segmentos / Séries / Períodos | 85 | submodais sem `isPending` no submit (duplo-clique cria duplicata) |
| Solicitações (`secretaria/solicitacoes.tsx`) | 90 | sem live-test do fluxo novo (Download/Editar/Anexar) |
| Reservas, Visitantes, Documentos, Ex-Alunos, Rematrícula | 85 | falta empty state; `SubmodalRematricula` não edita, só cria |
| Entidades (`secretaria/entidades.tsx` + `FormEntidade.tsx`) | 70 | sem exclusão, sem loading state, e **nunca testado ao vivo** (Cadastro Unificado Fases 5-8) |
| Equipe / Salas / Horários / Transferências | 80 | Equipe sem editar/excluir; Salas sem excluir; Horários sem editar |
| Períodos: calendário, termos, contrato modelo | 95 | — |

### Portal da Família — 69/100

Nota puxada para baixo por um único fato: **nenhum responsável em nenhuma organização tem `user_id`
vinculado**, ou seja, ninguém nunca logou no portal de verdade. Todo o módulo está sem o eixo Verificado.

| Submódulo | Nota | O que falta |
|---|---|---|
| Login / Dashboard | 70 | sem loading state no dashboard; nunca testado com guardian real |
| Acadêmico (notas/frequência + justificar falta) | 75 | idem |
| Financeiro | 60 | depende de ERP configurado; sem live-test |
| Documentos / Interações / Demandas | 70 | idem |
| Configuração do portal (`usePortalConfig.ts:23-32`) | 20 | `save()` só muda estado local — **não persiste no banco** |

### BI — 98/100

| Submódulo | Nota | O que falta |
|---|---|---|
| BI Acadêmico (`bi/academico.tsx`) | 100 | — (bug de data corrigido na F3) |
| BI CRM (`bi/crm.tsx`) | 100 | — (dado real desde F2, bug de data corrigido na F3) |
| BI Financeiro (`bi/financeiro.tsx`) | 10 | tela inteira é EmptyState "ERP não configurado" |
| Hub BI (`bi.tsx`) | 90 | hub de navegação, por design |

### CRM — 56/100

Decisão registrada em `STATUS.md`: o CRM será repensado como produto mais amplo (WhatsApp API, agentes
de IA) — por isso os botões mortos ficam para o redesenho (F9), não corrigidos ponto a ponto.

**F2 feita (2026-08-12)**: mocks exibidos como dado real, eliminados. `useInadimplencia` (`useCRM.ts`)
agora consulta `financial_transactions` de verdade (mesma tabela do Portal Financeiro, populada pelo
webhook ERP) em vez de retornar zeros com `is_mock_data`; `erpDisabledOrMock` em `demandas.tsx` lê a
config real do ERP; `tempoMedioResolucao` é calculado das demandas concluídas. `usePendenciasDoc` não
tinha (e continua sem) tabela/view de checklist documental — construir isso é feature nova, fora desta
fatia — mas a UI trocou "Nenhuma pendência encontrada" (mentira: nunca foi calculado) por um EmptyState
"em desenvolvimento" honesto. `assistente.tsx` perdeu os 3 KPIs fixos (23 conversas/2min/156 usuários) —
sem histórico de conversa persistido, não existe número real para mostrar.

| Submódulo | Nota | O que falta |
|---|---|---|
| Leads (`crm/leads.tsx`, `leads/[id].tsx`) | 60 | 4 botões mortos (Ligar/WhatsApp/Email/WhatsApp na linha) |
| Interações (`crm/interacoes.tsx`) | 40 | CTA principal "Nova Interação" sem `onClick` (`:79`) |
| Demandas (`crm/demandas.tsx`) | 75 | botão "Ver Documentos" morto (`:700`, dentro de aba ainda não implementada) |
| Assistente IA (`crm/assistente.tsx`) | 70 | sem histórico de conversa persistido (feature nova, não corrigido aqui) |
| Campanhas (`crm/campanhas.tsx`) | 5 | "Campanhas em Breve", roadmap estático com "Q2 2024" |
| Hooks (`useCRM.ts`) | 70 | `usePendenciasDoc` honestamente não-implementado; `useInadimplencia` real |

### Integração ERP — 66/100

Entrada (ERP → Educacional) testada ponta a ponta. **Saída (Educacional → ERP) nunca foi testada contra o
`sync-webhook` real** — só com `mock=true`. Dois bugs no repo `novusai-erp` (`syncContrato` não popula
`titulo` NOT NULL; `syncFinanceiro` não mapeia `recorrente`/`periodicidade`) bloqueiam contrato formal e
mensalidade recorrente. `erpEmit` ainda tem método que responde "não implementado" (`emit.ts:38`).

### Config/Integrações — 90/100

**F1 feita (2026-08-12)**: `usePortalConfig`/`useNotificationsConfig`/`usePWAConfig` agora persistem em
`organizations.settings` (jsonb, migration `20260812000000_organizations_settings.sql`) via hook
`useOrgSettings` novo — mesma policy `organizations_update` já existente (admin/coordenacao). Falta só
`isSaving`/loading no botão de submit da tela (`config/integracoes.tsx`), não corrigido nesta fatia.

## Fila de fatias

Ordenada por pontos ganhos ÷ esforço. Bloqueadores de produção primeiro — critério: **dado mock exibido
como real** e **botão morto em CTA principal** bloqueiam; tela que se declara "Em desenvolvimento" não.

| # | Fatia | Arquivos | Ganho |
|---|---|---|---|
| ~~**F1**~~ | ~~Persistir as configs do app~~ — feito em 2026-08-12, `organizations.settings` jsonb + `useOrgSettings.ts` | `usePortalConfig.ts`, `useNotificationsConfig.ts`, `usePWAConfig.ts`, migration `20260812000000` | Config 70→90 |
| ~~**F2**~~ | ~~Matar os mocks do CRM~~ — feito em 2026-08-12 | `useCRM.ts`, `crm/demandas.tsx`, `crm/assistente.tsx`, `crm.tsx` | CRM 47→56 |
| ~~**F3**~~ | ~~Varredura do bug de data UTC-3~~ — feito em 2026-08-12, 15 pontos em 10 arquivos | `avaliacoes.tsx`, `chamada/relatorio.tsx`, `bi/{academico,crm}.tsx`, `portal/academico.tsx`, `Grades{Filters,Grid}.tsx`, `AssessmentsPicker.tsx`, `Submodal{Alunos,Reservas}.tsx` | Acadêmico 87→93, BI 68→98 |
| ~~**F4**~~ | ~~Ligar os 4 botões mortos de Solicitações~~ — feito em 2026-08-12 | `secretaria/solicitacoes.tsx`, `SubmodalSolicitacoes.tsx`, `SubmodalAlunos.tsx` | Secretaria 82→87 |
| ~~**F5**~~ | ~~Fechar o hub Acadêmico~~ — feito em 2026-08-12 | `academico.tsx` | Acadêmico 93→97 |
| **F6** | `isPending` nos 7 submodais sem loading no submit (evita duplicata por duplo-clique) | `Submodal{Periodos,Reservas,Segmentos,Series,Solicitacoes,Unidades}.tsx`, `FormEntidade.tsx` | Secretaria +4 |
| **F7** | Criar um guardian de teste com conta de portal e rodar o live-test completo do Portal + lado família do Mural | dado de teste + browser | Portal 69→85, Mural 90→100 |
| **F8** | Rota `*` cair em `NotFound` (hoje cai no login) e reativar o captcha com a sitekey certa na allowlist do Cloudflare | `App.tsx:219`, painel Cloudflare + Supabase Auth | Auth 90→100 |
| **F9** | Decidir o redesenho do CRM como produto (WhatsApp API/agentes) antes de qualquer correção pontual; BI Financeiro sai do EmptyState quando F10 destravar | conversa + plano | CRM, BI |
| **F10** | Destravar a saída para o ERP: corrigir os 2 bugs em `novusai-erp` e testar `createReceivable`/`upsertClient` contra o `sync-webhook` real | repo irmão | ERP 66→90, BI Financeiro, Portal Financeiro |
| **F11** | Pedagógico e Eventos: definir escopo real ou remover a tela do menu (fachada visível ao cliente é pior que ausência) | `pedagogico.tsx`, `eventos.tsx`, `AppShell.tsx` | +2 global, ganho de percepção maior que o número |

Fora desta fila, já registrado em `STATUS.md` como backlog e não pontuado aqui: dívida de lint (~234 erros,
majoritariamente em Edge Functions), rotação de credenciais, secrets do Supabase (`OPENAI_API_KEY`,
`RESEND_API_KEY`), Fase 0-E (importação/ETL de dados legados) e as fases de escopo novo (Censo/Inep,
Copiloto do Professor, Engajamento).

## Manutenção

Atualize a nota do módulo **na mesma sessão** em que o código dele mudar, junto do checkpoint no
`STATUS.md`. Nota sem data de medição apodrece — é exatamente o que aconteceu com a seção "Roadmap
formalizado (2026-08-02)" que este arquivo substitui.
