# ROADMAP — NOVUS.AI Educacional

**Painel vivo de prontidão para produção.** Este arquivo responde "quanto falta para entregar o sistema a
uma escola cliente". Para o histórico do que foi feito em cada sessão, veja [`STATUS.md`](./STATUS.md);
para regras e arquitetura estáveis, [`../CLAUDE.md`](../CLAUDE.md).

**Nota global: 92/100** (média ponderada pelos pesos da tabela de módulos) — medido em 2026-08-13, F1–F11 aplicadas/checadas (F8 e F9 parciais).

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
| [Secretaria](#secretaria-9010) | 20 | **90** | Verificado | — |
| Dashboard (`app/dashboard.tsx`) | 5 | **90** | UX (loading parcial) | — |
| Mural (`app/mural.tsx`) | 3 | **100** | — | — |
| Auth/Onboarding (`auth/*`, `OrgGate`) | 8 | **95** | Captcha desligado (ação do usuário no Cloudflare) | F8 (parcial) |
| [Config/Integrações](#configintegrações-9010) | 4 | **90** | UX (loading no submit da tela) | — |
| [Portal da Família](#portal-da-família-9210) | 12 | **92** | — | — |
| [BI](#bi-9810) | 8 | **98** | Funcional (BI Financeiro depende de F10) | F9, F10 |
| [Integração ERP](#integração-erp-9210) | 10 | **92** | — | — |
| [CRM](#crm-7410) | 8 | **74** | Campanhas fora do escopo v1 | F9 (em andamento) |
| Pedagógico (`app/pedagogico.tsx`) | 1 | **90** | delete não testado no browser (`confirm()` trava automação, mesmo mecanismo do Eventos) | — |
| Eventos (`app/eventos.tsx`) | 1 | **90** | sem repetição/recorrência de evento (por design, não pedido) | — |
| [App mobile (`/m/*`)](#app-mobile-m-4010) | 0 | **88** | UX (layout considerado fraco pelo usuário — "funilaria" adiada); iOS não iniciado (exige Mac + conta Apple) | polimento visual do app |

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

### Secretaria — 90/100

**F6 checada (2026-08-12), sem código mudado**: os 7 submodais listados abaixo já tinham
`isSubmitting`/`isPending` desabilitando o botão de submit — achado do inventário original estava
desatualizado (fix de sessão anterior a este ROADMAP). `Unidades/Segmentos/Séries/Períodos` sobem
de nota; nenhum arquivo tocado.

**F4 feita (2026-08-12)**: os 4 botões mortos de Solicitações resolvidos (Download real via signed URL,
Editar/Anexar abrem edição real, "Ver" removido por ser redundante com Editar — mesma ação, dois botões).
Submodal ganhou upload de anexo em modo edição (só existia pra solicitação nova). `console.log` de debug
removido do submit de Alunos.

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

**F7 feita (2026-08-12)**: primeiro live-test real do portal desde que o app existe — guardian de teste
criado (`teste.portal.f7@novusai.local`, entidade + `student_guardians` vinculados ao aluno ativo real,
limpos ao final da sessão), login completo testado no browser (Chrome via extensão). Achado e corrigido
**um bug real que quebrava `Documentos` para 100% dos responsáveis**: `portal/documentos.tsx` fazia um
embed PostgREST (`.select('..., students(...)')`) numa coluna sem FK real (`documents.owner_type/owner_id`
é polimórfico) — 400 sempre, mascarado atrás de ~7s de retry do React Query antes de cair no estado de
erro. Não era falta de dado de teste, era código quebrado — só ninguém tinha logado pra descobrir. Fix
reusa `useLinkedStudents` (FK real via `student_guardians`) e resolve o nome do aluno no client.

| Submódulo | Nota | O que falta |
|---|---|---|
| Login / Dashboard | 95 | sem loading state explícito no dashboard (cosmético) |
| Acadêmico (notas/frequência + justificar falta) | 95 | testado, vazio honesto (aluno real ainda sem nota/chamada lançada) |
| Financeiro | 85 | query extraída pra `usePortalFinance` e filtro de período passou a ser aplicado de verdade (2026-08-12); ainda depende de ERP configurado |
| Documentos | 90 | bug de embed corrigido nesta fatia — testado, vazio honesto |
| Interações / Demandas | 95 | testado, formulário de nova mensagem/demanda funcional |
| Configuração do portal (`usePortalConfig.ts`) | 100 | persistido desde F1 |

### BI — 98/100

| Submódulo | Nota | O que falta |
|---|---|---|
| BI Acadêmico (`bi/academico.tsx`) | 100 | — (bug de data corrigido na F3) |
| BI CRM (`bi/crm.tsx`) | 100 | — (dado real desde F2, bug de data corrigido na F3) |
| BI Financeiro (`bi/financeiro.tsx`) | 10 | tela inteira é EmptyState "ERP não configurado" |
| Hub BI (`bi.tsx`) | 90 | hub de navegação, por design |

### CRM — 74/100

**F9 fatia 2 (feita, 2026-08-12)**: "Nova Interação" ganhou dialog real (picker de lead reusando
`useLeads`, canal/direção/resumo, grava via `useCreateInteraction` que já existia mas nunca era
chamado) — testado ao vivo, funciona ponta a ponta. De brinde: a coluna "Entidade" da tabela sempre
mostrava vazio (`entity_name` hardcoded `''`, nunca preenchido); resolvida no client comparando
`entity_id` com os leads já carregados. Picker limitado a leads (visitor) — guardian/student ainda sem
picker, gap registrado, não bloqueia o uso real do CRM hoje (única origem de interação é lead).

**F9 iniciada (2026-08-12)**: decisão de produto tomada — CRM redesenhado como produto "de ponta estilo
Helena" (referência: helena.run, agente de vendas via WhatsApp por IA), no mesmo repo, sem WhatsApp API
ainda (entra quando a conta Business for aprovada — fora do controle direto da equipe), IA v1 só sugere
rascunho pro atendente revisar e mandar (nunca responde sozinha). Campanhas e Interações seguem como
estavam — não fazem parte da fatia 1.

**Fatia 1 (feita, 2026-08-12)**: Leads virou kanban (4 colunas: ativo/morno/frio/convertido, drag nativo
HTML5, sem lib nova) com cards reais (totem de iniciais, links `tel:`/`wa.me`/`mailto:` de verdade).
Bug achado no caminho: `status` do lead estava **hardcoded em `'ativo'`** em `useLeads`/`useLead` — o
board não tinha onde persistir nada. Corrigido: `status` agora vive em `entidade_papeis.dados_papel`
(mesmo padrão jsonb já usado pra `relation`/`visit_date`/`purpose`), `useUpdateLeadStatus` novo grava
via fetch+merge. **Verificado ao vivo** (usuário abriu sessão de staff durante a sessão, login real admin
Allegra): board carrega, drag entre colunas persiste de verdade (confirmado por SQL), navegação pro
detalhe funciona. O live-test achou 2 bugs em `leads/[id].tsx` (fora da fatia 1 original, corrigidos na
hora): mesmo padrão de data UTC-3 do F3 em `visit_date` (a função `formatDate` também formatava
`created_at`/`updated_at`, timestamptz completo — separada em `formatDate`/`formatDateTime`) e os 3
botões mortos (Ligar/WhatsApp/E-mail) viraram links reais `tel:`/`wa.me`/`mailto:`.

**F2 feita (2026-08-12)**: mocks exibidos como dado real, eliminados. `useInadimplencia` (`useCRM.ts`)
consulta `financial_transactions` de verdade; `erpDisabledOrMock` em `demandas.tsx` lê a config real do
ERP; `tempoMedioResolucao` é calculado das demandas concluídas. `usePendenciasDoc` segue honestamente
não-implementado (EmptyState em vez de mentir "nenhuma pendência"). `assistente.tsx` perdeu os 3 KPIs
fixos (sem histórico de conversa persistido, não existe número real pra mostrar).

| Submódulo | Nota | O que falta |
|---|---|---|
| Leads (`crm/leads.tsx`, `leads/[id].tsx`) | 95 | testado ao vivo ponta a ponta, sem exclusão (por design — visitante vira lead permanente) |
| Interações (`crm/interacoes.tsx`) | 90 | picker de "Nova Interação" só cobre leads (visitor), sem guardian/student |
| Demandas (`crm/demandas.tsx`) | 75 | botão "Ver Documentos" morto (dentro de aba ainda não implementada) |
| Assistente IA (`crm/assistente.tsx`) | 70 | sem histórico de conversa persistido — v2 do CRM (agente assistido) vai precisar disso |
| Campanhas (`crm/campanhas.tsx`) | 5 | "Campanhas em Breve" — fora do escopo da visão nova, decidir manter/remover numa próxima fatia |
| Hooks (`useCRM.ts`) | 80 | `usePendenciasDoc` honestamente não-implementado; leads/inadimplência reais |

### Integração ERP — 92/100

**F10 residual feita (2026-08-12)**: saída Educacional→ERP testada contra o `sync-webhook` real (não
mock) — achado que os dois lados já estavam configurados de verdade pra Allegra (`erp_integration_config.
mock=false` + `webhook_configs` ativo com secret no ERP, nenhum dos dois documentado antes). Criado um
responsável de teste (CPF sintético) via `/app/secretaria/entidades`, confirmado nos dois bancos: apareceu
na Allegra em 00:01:07, no ERP em 00:01:10 com `origem_sistema='novus-educacional'` e papel `CLIENTE`
ativo. `createReceivable` não testado isoladamente — usa o mesmo `sendSyncEvent` já provado e o
`syncFinanceiro` do lado ERP já foi confirmado por código/trigger na F10 original. Dado de teste limpo
dos dois lados ao final.

**F10 checada (2026-08-12), nenhum código mudado**: os 2 bugs bloqueantes reportados em 2026-08-05 já
tinham sido corrigidos numa sessão do `novusai-erp` em 2026-08-09 (migration `20260809233000_recorrencia_
cron_e_gera_financeiro.sql`), só não tinha voltado pra este ROADMAP. Confirmado no banco real (`db query
--linked` no projeto `reksodqzemboaeqxnxyy`): `syncContrato` já popula `titulo` com fallback (linha 601
de `sync-webhook/index.ts`); `syncFinanceiro` já mapeia `recorrente`/`periodicidade`/`total_parcelas`
(linhas 701-703); trigger `trg_gerar_titulo_inicial_contrato` ativa (`tgenabled='O'`) cria o primeiro
título recorrente quando um Contrato tem `gera_financeiro=true`; cron `job_materializar_recorrencias`
ativo, rodando `0 4 * * *`. Contrato formal ligado à matrícula e mensalidade recorrente automática **não
estão mais bloqueados** do lado do ERP.

Único gap real restante: **saída (Educacional → ERP) nunca foi testada contra o `sync-webhook` real** —
só com `mock=true`. `erpEmit` ainda tem um método que responde "não implementado" (`emit.ts:38`).

### Config/Integrações — 90/100

**F1 feita (2026-08-12)**: `usePortalConfig`/`useNotificationsConfig`/`usePWAConfig` agora persistem em
`organizations.settings` (jsonb, migration `20260812000000_organizations_settings.sql`) via hook
`useOrgSettings` novo — mesma policy `organizations_update` já existente (admin/coordenacao). Falta só
`isSaving`/loading no botão de submit da tela (`config/integracoes.tsx`), não corrigido nesta fatia.

### App mobile (`/m/*`) — 88/100

**Peso 0 de propósito**: é produto novo, ainda não entregue a nenhuma escola — não deve puxar a nota
global do sistema web pra baixo. Vira peso real quando a v1 (Fases 0–7 do [`MOBILE_PLAN.md`](./MOBILE_PLAN.md))
fechar. Fases 0–7 fechadas em 2026-08-13: roda como APK Android (Capacitor 8), com push real do FCM chegando no aparelho e live-test das duas peles com login real.

| Eixo | Nota | Por quê |
|---|---|---|
| Funcional | 20/20 | Fases 0–7 completas: família (início/acadêmico/mural/mensagens/financeiro), staff (chamada offline/publicar/mensagens/alunos), casca Capacitor e push FCM |
| Dado real | 20/20 | Nenhum mock — tudo lê e grava no Supabase, reusando os hooks do portal |
| RLS | 20/20 | `announcement_responses` e `push_tokens` criadas já com policy explícita, conferidas em `pg_policies` |
| UX | 12/20 | Safe areas e teclado conferidos no device; **layout considerado fraco pelo usuário** — polimento visual é a próxima fatia, adiada de propósito |
| Verificado | 16/20 | Duas peles abertas com login real (emulador Android + navegador); push e chamada gravando conferidos no banco. Falta iOS, que exige Mac + conta Apple paga |

Dívida específica: `/app/academico/chamada` ainda não consome o `useAttendanceSheet`, então existem duas
cópias do mesmo upsert — exatamente o que o plano queria evitar.

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
| ~~**F6**~~ | ~~`isPending` nos 7 submodais~~ — checado em 2026-08-12: já estava feito, achado do inventário original ficou desatualizado | — | Secretaria 87→90 |
| ~~**F7**~~ | ~~Live-test completo do Portal + Mural~~ — feito em 2026-08-12, achou e corrigiu bug real em Documentos | `portal/documentos.tsx` | Portal 69→92, Mural 90→100 |
| **F8 (parcial)** | ~~Rota `*` cair em `NotFound`~~ feito em 2026-08-12. Captcha continua desligado — depende do usuário adicionar o domínio de produção na allowlist do Cloudflare Turnstile; quando fizer, reativar `security_captcha_enabled` via Supabase Auth API nos dois projetos (educacional + ERP) | painel Cloudflare (ação do usuário) | Auth 90→95, falta captcha pra 100 |
| **F9 (em andamento)** | CRM v1 "estilo Helena" — escopo fechado (sem WhatsApp/IA autônoma ainda). Fatia 1 (kanban de Leads) feita. Fatia 2 sugerida: mesma UX rica na tela de detalhe do lead (`leads/[id].tsx`) + Interações real | `crm/leads/[id].tsx`, `crm/interacoes.tsx` | CRM 62→? |
| ~~**F10**~~ | ~~Corrigir bugs + testar saída contra sync-webhook real~~ — feito em 2026-08-12 (bugs já corrigidos em sessão anterior do ERP; `upsertClientByCPF` testado ao vivo end-to-end) | repo irmão | ERP 66→92 |
| ~~**F11**~~ | ~~Pedagógico e Eventos~~ — ambos feitos em 2026-08-13. Eventos: CRUD real (tabela `events`). Pedagógico: construído por completo a pedido explícito do usuário (4 CRUDs: Planos de Aula, Acompanhamento, Projetos, Objetivos), mesmo sem uso hoje pela Allegra | `pedagogico.tsx`, `eventos.tsx`, migrations novas | Pedagógico 0→90, Eventos 0→90 |

| **F12** | **Funilaria do app mobile** — próxima fatia acordada com o usuário (2026-08-13): a mecânica está pronta e testada, o layout é que foi considerado fraco. Resolve-se no navegador, sem device | `src/pages/m/**`, `src/components/mobile/**`, skill `novus-satellite-visual-identity` | App mobile 88→? |
| **F13 (na gaveta, ponta de fora)** | **iOS** — decidido em 2026-08-13 **adiar, não cancelar**. Nada foi feito: não existe `ios/`, o Capacitor só tem a plataforma Android. Emular iOS em Windows é impossível (o Simulator faz parte do Xcode, que só roda em macOS; VM de macOS em hardware não-Apple viola a licença da Apple). Caminhos, quando for a hora: (a) Mac na nuvem por hora — MacinCloud/Scaleway/EC2 Mac, ~US$ 1–3/h; (b) runner `macos-latest` no GitHub Actions só pra garantir que compila, sem interação; (c) um Mac Apple Silicon qualquer. **Push no iOS não se testa nem no Simulator** — exige iPhone real, conta Apple paga (US$ 99/ano) e a APNs Auth Key subida no Firebase. Enquanto isso, a UI se confere no Safari de um iPhone real apontando pro dev server, que é WebView do mesmo jeito | `capacitor.config.ts`, `ios/` (não existe), conta Apple Developer | iOS 0→? |

Fora desta fila, já registrado em `STATUS.md` como backlog e não pontuado aqui: dívida de lint (~234 erros,
majoritariamente em Edge Functions), rotação de credenciais, secrets do Supabase (`OPENAI_API_KEY`,
`RESEND_API_KEY`), Fase 0-E (importação/ETL de dados legados) e as fases de escopo novo (Censo/Inep,
Copiloto do Professor, Engajamento).

## Manutenção

Atualize a nota do módulo **na mesma sessão** em que o código dele mudar, junto do checkpoint no
`STATUS.md`. Nota sem data de medição apodrece — é exatamente o que aconteceu com a seção "Roadmap
formalizado (2026-08-02)" que este arquivo substitui.
