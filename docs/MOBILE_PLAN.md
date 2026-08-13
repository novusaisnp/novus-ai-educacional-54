# App mobile NOVUS.AI Educacional — `/m/*` + Capacitor

> Plano escrito em 2026-08-13. Escopo fechado com o usuário, **ainda não iniciado**.
> Painel de maturidade do sistema web: [`ROADMAP.md`](./ROADMAP.md). Histórico de sessões: [`STATUS.md`](./STATUS.md).

## Contexto

O sistema web está em 92/100 no [`ROADMAP.md`](./ROADMAP.md), mas **não existia escopo formal de app
mobile** — só ideias soltas (`MVP de ideias.MD` fala em "app para pais e alunos", push, mobile-first;
`STATUS.md` cita "app próprio da escola" no contexto do CRM v2). O que existe de concreto hoje:
PWA instalável (educacional e ERP), responsividade corretiva da área staff (checkpoint 2026-08-10,
declaradamente "responder razoavelmente", não experiência principal), e um mockup HTML estático de
Portal Família mobile em `novus_edu_mockups.html` (~linhas 481-570).

**Premissa acordada com o usuário**: embrulhar o `/app/*` atual no Capacitor entregaria um APK com
cara de site numa caixa (sidebar, `<Table>` com scroll horizontal, `ModalMestre` de 13 abas). Não é
isso. Responsividade faz o desktop caber; app mobile se desenha pro polegar desde o início.

**Pesquisa de mercado feita na sessão de 2026-08-13** (fontes no fim). Concorrentes BR: Agenda Edu
(3 mil escolas, 4 mi de usuários), ClassApp, Sponte Agenda Plus. Internacionais: ClassDojo, Seesaw,
ParentSquare. Dois achados mudaram o escopo:
1. **Chat família↔escola é o coração da categoria no Brasil** — ClassApp e Agenda Edu nasceram disso.
2. **Chamada offline com sync é pré-requisito, não diferencial** — Sponte Gov Prof, Gestão Presente na
   Escola (MEC) e Toth anunciam isso como básico.

Onde já saímos na frente e nenhum concorrente pesquisado tem: PEI/educação inclusiva, prontuário de
saúde, camada de IA.

## Decisões fechadas (não re-discutir)

| Decisão | Valor |
|---|---|
| Arquitetura | Rotas `/m/*` no mesmo repo, UI mobile própria, **zero** reuso de layout desktop, **100%** de reuso da camada de dados |
| Empacotamento | Capacitor (APK/IPA). Casca de entrega, não o produto |
| Público | Um app, duas peles por papel (família / staff), decidido no login |
| Push | Entra na v1 (FCM; FCM entrega iOS via proxy APNs — um caminho de envio só) |
| Chat | Entra na v1, 4ª aba da família |
| Offline | Chamada offline com sync entra na v1 |
| Extras do mercado | Autorização digital assinada, enquete/formulário, mural de fotos/diário — todos na v1 |

## Arquitetura

**Insight que barateia 3 features de uma vez**: autorização, enquete e fotos/diário **não são 3 telas**.
São **tipos de card no mesmo feed** — é exatamente o modelo do Agenda Edu. `announcements` (já existe,
testada em produção) ganha `type` + `payload jsonb`, e uma única tabela nova `announcement_responses`
serve autorização *e* enquete (a família responde a um post). Fotos reusam `documents`, que já é
polimórfico (`owner_type`/`owner_id`, sem FK — confirmado na F7).

**Bottom nav, 5 abas por papel:**
- Família: `Início` · `Acadêmico` · `Mural` · `Mensagens` · `Mais`
- Staff: `Chamada` · `Alunos` · `Publicar` · `Mensagens` · `Mais`

`Mais` guarda Financeiro, Documentos, Perfil, Sair — não vira aba própria.

**Convivência com a web**: um único `<Route path="/m/*">` em `src/App.tsx`, antes do `path="*"`.
Nada de `/app` e `/portal` muda. Duas subárvores dentro de `/m`, reusando os guards que já existem
(`PortalProtectedRoute` para família, `ProtectedRoute`+`OrgGate` para staff) — não criar guard novo.

**Regra de ouro do bundle**: tudo dentro de `src/routes/mobile.tsx` via `React.lazy`. O chunk principal
hoje tem **2.235.492 bytes** porque `src/App.tsx` importa ~50 páginas de forma eager. Se a árvore mobile
entrar estática, o app nativo baixa o sistema inteiro pra mostrar um anel de frequência.

## Fases

### Fase 0 — Fundação
Criar: `src/pages/m/index.tsx` (dispatcher por papel), `src/components/mobile/MobileShell.tsx`,
`MobileTabBar.tsx` (um componente, duas listas de itens por prop), `MobileHeader.tsx`,
`StudentSwitcher.tsx` (troca de filho, sobre `useLinkedStudents`), `src/routes/mobile.tsx`.
Reusar: `useSession`, `useOrganization` (já faz fallback `profiles`→`entidades`, é a peça que permite
um shell só), `usePortalAuth`, `useUserRole`.
Regra de desempate no dispatcher: **staff ganha** se `useUserRole()` retornar não-nulo (pai que
trabalha na escola). Documentar.

### Fase 1 — Família: Início + Acadêmico
`src/pages/m/familia/{inicio,academico}.tsx` + `src/components/mobile/AttendanceRing.tsx`.
Anel de frequência em **SVG puro** (`stroke-dasharray`, ~15 linhas) — não puxar `recharts` pro chunk
mobile (8KB vs 400KB). Reusar `useLinkedStudents`/`useStudentGrades`/`useStudentAttendance` de
`src/hooks/usePortalAcademic.ts`; `src/pages/portal/academico.tsx` como referência de shape.
Justificar falta: `useCreateAttendanceJustification` já existe — só um `Drawer` (vaul, já instalado,
nunca usado) e `<input type="file" capture="environment">` nativo, sem lib de câmera.

### Fase 2 — Feed do Mural (avisos + fotos + autorização + enquete)
Migration: `announcements` ganha `type text check in ('aviso','foto','autorizacao','enquete')` default
`'aviso'` e `payload jsonb`; tabela nova `announcement_responses` (announcement_id, guardian_id,
student_id, response jsonb, signed_at, created_at) com **RLS + policies explícitas** e UNIQUE
(announcement_id, guardian_id) — a UNIQUE é obrigatória pro upsert (armadilha 42P10 do repo).
Assinatura da autorização: reusar o mecanismo já construído em
`src/features/secretaria/lib/signEnrollmentContract.ts`.
Fotos: `documents` com `owner_type='announcement'`.
Extrair `src/hooks/useAnnouncements.ts` — a mesma query está duplicada inline em
`src/pages/app/mural.tsx` e `src/pages/portal/dashboard.tsx`; o hook serve as 3 telas e mata a
duplicação de graça.
Telas: `src/pages/m/familia/mural.tsx` e `src/pages/m/staff/publicar.tsx`.

### Fase 3 — Chat família↔escola
Migration: `interactions` ganha `read_at timestamptz` (badge de não-lidas). O resto da tabela já serve:
`entity_type='guardian'`, `entity_id`=guardian, `direction` diz quem falou, `summary` é o texto,
`performed_by` é o staff.
Telas: `src/pages/m/familia/mensagens.tsx` (thread única com a escola) e
`src/pages/m/staff/mensagens.tsx` (lista de conversas por responsável → thread).
Reusar `usePortalData` (`createInteractionMutation`) e `useInteractions` de `src/hooks/useCRM.ts`.

### Fase 4 — Staff: Chamada com offline
`src/pages/m/staff/chamada.tsx`: seletor turma+disciplina+data no topo, alunos em linhas grandes com
toggle de 3 estados por toque, botão salvar fixo acima da tab bar.
`src/pages/app/academico/chamada.tsx` tem 728 linhas de `<Table>`/popover — **copiar a lógica, não o
layout**, e **extrair para `src/hooks/useAttendanceSheet.ts`** para as duas telas consumirem (duas
cópias do upsert é como o bug de fuso se espalhou antes). Preservar o
`onConflict: 'class_id,subject_id,student_id,date'` — a UNIQUE real **não** inclui `organization_id`,
está comentado lá; não "melhorar".
**Offline**: usar a persistência de mutation do `@tanstack/react-query` (já instalado) com
`onlineManager` + `setMutationDefaults`, não escrever fila do zero. Indicador visível de "pendente de
sincronização" na UI — o professor precisa saber.

### Fase 5 — Família: Financeiro · Staff: Consulta de aluno
Extrair `src/hooks/usePortalFinance.ts` da query de `src/pages/portal/financeiro.tsx` (agora com 2
consumidores). Respeitar o gate `hasERP` (`getERPConfig`): sem ERP, EmptyState, não some.
**Não** implementar geração de boleto — quem emite é o ERP (skill `erp-satellite-integration`).
Copiar linha digitável via `navigator.clipboard`.
`src/pages/m/staff/alunos.tsx`: busca `ilike` com debounce → Drawer com ficha resumida. Reusar
`useStudents` e `useStudentAvatars`. **Não** portar `StudentHealthSection`/`StudentPeiSection` — link
"abrir ficha completa" pro `/app/alunos` resolve.

### Fase 6 — Push (FCM)
**Código/schema (Claude faz)**: migration `push_tokens` (UNIQUE em `token`, **RLS + policies
explícitas** — RLS sem policy é o bug recorrente nº1 do repo, checar `pg_policies` depois); adicionar
`'push'` aos CHECK de `notification_queue.channel`, `notification_templates.channel`,
`contact_consents.channel`; `notify-dispatch/index.ts` ganha `sendPush()` via **FCM HTTP v1** reusando
`checkConsent`/`insertDelivery`/`updateQueueStatus` sem alteração (atenção: `item.recipient` passa a
ser `user_id`); token `UNREGISTERED` → deletar; `src/hooks/usePushRegistration.ts` (no-op fora de
nativo).

**Ação humana do usuário (bloqueante, só ele pode)**: criar projeto Firebase e baixar
`google-services.json`; gerar service account key e cadastrar como secret `FCM_SERVICE_ACCOUNT`;
**conta Apple Developer paga (US$ 99/ano)**; criar App ID com capability Push, gerar APNs Auth Key
(.p8) e subir no Firebase; `GoogleService-Info.plist`; nome/ícone de loja e **política de privacidade**
(obrigatória nas duas lojas).

**Recomendação**: fazer Android primeiro. iOS depende inteiramente de burocracia externa e não deve
bloquear o resto.

### Fase 7 — Capacitor
`bun add @capacitor/core @capacitor/push-notifications @capacitor/app @capacitor/status-bar`,
`bun add -d @capacitor/cli`, `bunx cap init`, `bun add @capacitor/android`.
`capacitor.config.ts`: `webDir: 'dist'`, `appId: 'ai.novus.educacional'`, **sem `server.url` em
produção**. Redirect: se `Capacitor.isNativePlatform()` → `Navigate to="/m"` (o WebView sempre boota
em `/`). Commitar `android/` (guarda config de push e ícones). `vite.config.ts` não muda — o VitePWA
continua servindo a web e é inofensivo dentro do WebView.
Build: `bun run build && bunx cap sync android && bunx cap open android`.
Teste sem device: Android Emulator com imagem **com Google Play** recebe push normalmente. iOS
Simulator **não recebe push** — exige iPhone real + Mac. 95% do app se testa no Chrome DevTools em
`/m/*`.

## Riscos

1. **Bundle** (maior risco): 2,2 MB hoje por imports eager em `App.tsx`. Tudo mobile via `lazy()`, e
   conferir o tamanho do chunk a cada fase. Converter os eager de `App.tsx` derruba o chunk pra todo
   mundo — mas é fase separada, não misturar.
2. **Auth em WebView**: `supabase-js` usa `localStorage`, sobrevive em WKWebView, mas iOS pode limpar
   sob pressão de armazenamento e o refresh token expira se o app ficar semanas fechado. Aceitar o
   re-login; não construir storage nativo na v1.
3. **Fuso UTC-3**: toda coluna DATE (`attendance.date`, `assessments.date`,
   `financial_transactions.due_date`) precisa de `${date}T00:00:00`. O anel de frequência e o "vence
   hoje" erram por um dia se esquecer.
4. **Safe areas**: `env(safe-area-inset-bottom)` na tab bar e `viewport-fit=cover` no `index.html`.
5. **Deep link de notificação**: payload FCM com `{ route: '/m/familia/mural' }` + listener
   `pushNotificationActionPerformed`. Universal/App Links (abrir do navegador) ficam fora da v1 —
   exigem verificação de domínio nas duas plataformas.
6. **Conflito offline**: dois professores lançando a mesma chamada. Regra: último sync vence, e o
   registro pendente mostra data/hora de captura.

## Verificação

Padrão do repo, por fase: `bun run typecheck` + `bun run test` (baseline 46/46) + `bun run build`,
depois live-test no browser em 390×844 com login real, dado de teste criado e **removido no fim**.
Específico desta empreitada:
- Após Fase 0: chunk `mobile-*` separado no build e `index-*.js` **não cresceu**; `/portal` e `/app`
  intactos; guardian cai em `/m/familia/inicio`, staff em `/m/staff/chamada`.
- Após Fase 2 e 6: `select * from pg_policies where tablename in ('announcement_responses','push_tokens')`
  — confirmar policy real, não só RLS ligado.
- Após Fase 4: salvar chamada no mobile, abrir `/app/academico/chamada` na mesma turma/data/disciplina
  → mesmos status. Offline: modo avião no DevTools, lançar, voltar online, confirmar sync.
- Após Fase 7: APK no emulador com Google Play, push de teste chegando.

## Escopo cortado (nesta ordem, se apertar)

1. **iOS inteiro na v1** — Android + PWA cobre a maior parte da base brasileira e tira a Apple do
   caminho crítico.
2. **Financeiro** — depende de ERP configurado por organização; hoje só a Allegra tem.
3. **Consulta de aluno (staff)** — coordenador já tem desktop; a Chamada é que é insubstituível.
4. **Deep link** — push que abre o app na home entrega a maior parte do valor.
5. **Não cortar**: Fase 0, Chamada (com offline), Mural e Chat — sem eles o app não tem motivo de
   existir nem pra família nem pra staff.

Fora da v1 por decisão, registrar no ROADMAP quando a v1 fechar: matrícula digital com contrato
assinado no app, pagamento in-app (PIX/cartão — hoje só exibimos 2ª via), tradução automática
(ParentSquare), portfólio do aluno (Seesaw), gamificação.

## Fontes da pesquisa de mercado

[Sponte Agenda Plus](https://www.sponte.com.br/blog/sponte-agenda-plus-o-app-de-agenda-digital-escolar-do-sponte) ·
[Agenda Edu](https://www.agendaedu.com/) ·
[Agenda Edu Pagamentos](https://www.agendaedu.com/pagamentos-digitais) ·
[ClassApp](https://www.classapp.com.br/agenda-escolar-digital) ·
[ClassDojo vs Seesaw 2026](https://getshorthandapp.com/blog/classdojo-vs-seesaw-2026) ·
[Best Parent Communication Apps 2026](https://kiwibee.io/en/blog/best-parent-communication-apps-schools) ·
[Sponte Gov — professor offline](https://www.sponte.com.br/sponte-gov) ·
[Gestão Presente na Escola (MEC)](https://play.google.com/store/apps/details?id=br.gov.mec.frequenciagestaopresente&hl=pt_BR) ·
[Toth — App do Professor](https://sistematoth.com.br/pagina/aplicativo-professor)
