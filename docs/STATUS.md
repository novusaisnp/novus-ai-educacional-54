# STATUS — novus-educacional

**Última atualização: 2026-08-04.** Este arquivo deve ser atualizado ao final de cada sessão de trabalho relevante, junto do commit da própria mudança — se estiver desatualizado, ele apodrece como aconteceu com documentos "foto única" no repo irmão `novusai-erp`. Ver [`CLAUDE.md`](../CLAUDE.md) para regras e arquitetura estáveis; este arquivo é só o estado do momento.

## 🔖 Checkpoint de sessão (2026-08-04, leia isto primeiro)

- **GitHub**: `novusaisnp/novus-ai-educacional-54`, branch `main`. Autenticado como `novusaisnp` (não `lignumfleet`, que não tem acesso a este repo).
- **RLS sem política: as 6 tabelas restantes foram corrigidas nesta sessão** — `assessments`, `attendance`, `consents`, `grades`, `interactions`, `subjects` (migration `20260804120000_add_missing_rls_policies_academic_tables.sql`). Com isso, **não há mais tabelas conhecidas com RLS habilitado e zero política** neste schema (mas confirme via `pg_policies` antes de assumir isso pra uma tabela nova).
- **2 bugs reais de `onConflict` descobertos e corrigidos nesta sessão** (só apareceram ao testar de ponta a ponta o registro de chamada/notas pela primeira vez): `chamada.tsx` e `useGrades.ts` faziam upsert com `onConflict` incluindo `organization_id`, mas a constraint UNIQUE real no banco não inclui essa coluna — Postgres rejeitava com 400 (42P10). Também havia divergência entre os valores de `attendance.status` no front (`'ausente'`/`'justificado'`) e o CHECK constraint real (`'falta'`/`'justificada'`). Ver Fase 1 abaixo e Backlog para o 3º caso (`uploadAvatar`/`documents`), encontrado mas não corrigido.
- **`OPENAI_API_KEY` não está configurada** nos secrets do projeto (`supabase secrets list` confirmado) — bloqueia testar de ponta a ponta qualquer function de IA nova (ex.: `ai-document-validation`, criada em sessão anterior mas não verificada contra a OpenAI de verdade).
- Bloqueio antigo (ainda válido): a integração de **saída** ERP (educacional → ERP) segue não testada contra o projeto real do ERP — ver Fase 0-B.

## ✅ RLS sem política: últimas 6 tabelas corrigidas + 2 bugs de onConflict (2026-08-04)

**Contexto**: retomando o roadmap, o usuário priorizou fechar o backlog de segurança/funcionalidade já conhecido (ver checkpoints anteriores) em vez de avançar pra uma nova fatia de feature — `assessments`, `attendance`, `consents`, `grades`, `interactions` e `subjects` tinham RLS habilitado sem nenhuma política real no banco (confirmado via `SELECT * FROM pg_policies WHERE tablename IN (...)`, zero linhas), apesar da migration inicial (`20250812134534`) conter `CREATE POLICY "Organization isolation"` pra essas mesmas tabelas — mesmo padrão de "arquivo de migration não é garantia do que rodou de fato" já documentado.

**O que mudou**:
- Migration `20260804120000_add_missing_rls_policies_academic_tables.sql`: políticas `_manage`/`_select` nas 6 tabelas, replicando o padrão já usado em `classes`/`enrollments`/`student_guardians`/`documents`. Split de papéis: `subjects`/`interactions`/`consents` geridos por `admin`/`coordenacao`/`secretario` (mesmo grupo administrativo); `assessments`/`attendance`/`grades` incluem `professor` no `_manage` em vez de `secretario`, porque essas telas (`avaliacoes.tsx`/`chamada.tsx`/`notas.tsx`) só aparecem no menu pra `admin`/`coordenacao`/`professor` e `useCanEditGrades` (`useUserRole.ts`) já confirmava `professor` como role habilitada a editar notas.
- **2 bugs de `onConflict` corrigidos**, achados testando o salvamento de chamada/notas pela primeira vez de ponta a ponta: `chamada.tsx` (`saveAttendanceMutation`) e `useGrades.ts` (`useUpsertGrade`) faziam upsert com `onConflict` incluindo `organization_id`, mas a constraint UNIQUE real em `attendance` é `(class_id, subject_id, student_id, date)` e em `grades` é `(assessment_id, student_id)` — nenhuma das duas inclui `organization_id`. Postgres rejeitava com 400 (42P10, "no unique or exclusion constraint matching the ON CONFLICT specification"), e em `chamada.tsx` isso aparecia só como um toast genérico "Erro ao salvar presença. Tente novamente" (só foi possível diagnosticar checando a network request direto). Corrigido em ambos os arquivos + `chamada.tsx` também tinha os valores de `AttendanceStatus` divergentes do CHECK constraint real (`'ausente'`/`'justificado'` no front vs. `'falta'`/`'justificada'` no banco) — corrigido também em `chamada/relatorio.tsx`, que compartilha o mesmo tipo.
- **3º caso do mesmo padrão de bug encontrado, não corrigido**: `uploadAvatar` em `src/lib/storage.ts` faz upsert em `documents` com `onConflict: 'organization_id,owner_type,owner_id,title'`, mas essa tabela **não tem nenhuma constraint UNIQUE** além da PK — vai falhar do mesmo jeito na primeira vez que alguém trocar a foto de um aluno. Diferente dos outros 2, esse exige migration nova (criar a constraint), não só ajustar a lista de colunas do `onConflict` — ver Backlog.

**Verificação**: 47/47 testes, `typecheck` limpo. Testado ao vivo no navegador contra o projeto real, ponta a ponta, pra cada uma das 6 tabelas: criada disciplina/turma/aluno/matrícula de teste; `subjects` (criar disciplina), `assessments` (criar avaliação em Acadêmico → Avaliações), `attendance` (registrar chamada, incluindo reproduzir e corrigir o erro 400 do onConflict), `grades` (lançar nota em Acadêmico → Notas, mesmo tipo de erro reproduzido e corrigido) confirmados via UI real; `interactions` e `consents` (sem tela de criação alcançável — `interactions` porque o botão "Nova Interação" em `crm/interacoes.tsx` não tem `onClick`, `consents` porque não há nenhum call site no app ainda) confirmados via chamada REST autenticada direta usando a sessão real do navegador (mesma técnica já usada na Fase 1 — GED do Aluno pra testar upload). Dados de teste limpos do banco ao final.

**Gaps conhecidos aceitos conscientemente**:
- `uploadAvatar`/`documents` com o mesmo bug de `onConflict` (ver acima) — não corrigido, precisa de migration nova.
- Botão "Nova Interação" em `crm/interacoes.tsx` sem `onClick` (mesmo padrão de botão morto já documentado em outras telas) — **não corrigido por pedido explícito do usuário**: o CRM atual vai ser redesenhado como um produto bem mais amplo (WhatsApp API, app próprio, agentes de IA de atendimento/vendas "na pegada do Helena"), então não vale investir em ajustes pontuais na UI atual antes dessa conversa.
- Regra pré-existente e não relacionada a esta sessão, mas descoberta ao investigar: o CHECK constraint de `profiles.role` só permite `'secretaria'`, enquanto todas as migrations de RLS e o front inteiro (`useUserRole.ts`, `AppShell.tsx` etc.) usam `'secretario'` — nunca disparou porque só existe perfil `admin` no banco real hoje, mas é uma bomba-relógio pro dia em que alguém criar um usuário com esse papel.

## ✅ Fase 1 — Calendário Letivo (2026-08-02)

**Contexto**: primeira fatia da Fase 1 — Secretaria Digital, escolhida por ser pré-requisito de dados pra Fase 3 (grade horária). Investigando o schema, descobri que o conceito de "ano/período letivo" **já existia** — tabela `public.periods` (`name`, `year`, `date_start`, `date_end`, `active`), com CRUD completo em `src/features/secretaria/periodos/SubmodalPeriodos.tsx`. Faltava só a camada de exceções (feriados/recessos/reposições), que não existia em lugar nenhum do schema.

**O que mudou**:
- Migration `20260802190000_create_calendar_exceptions.sql`: tabela `calendar_exceptions` (`organization_id`, `date`, `type` CHECK IN `feriado/recesso/reposicao`, `description`), `UNIQUE(organization_id, date)` — **escopada por organização+data, não por período**, pra não duplicar o mesmo feriado em múltiplos períodos que se sobrepõem na mesma data. RLS + índice no padrão já estabelecido.
- `src/lib/schoolCalendar.ts` (novo): `isSchoolDay(date, periods, exceptions)` — helper puro, sem I/O, reaproveitável pela Fase 3. Lógica: dentro do intervalo de algum período ativo + dia útil, a menos que haja exceção (`reposicao` inverte fim de semana pra letivo; `feriado`/`recesso` invertem dia útil pra não-letivo).
- **Corrigida a mesma duplicação de refactor abandonado da Fase 0-A, desta vez em `periodos`**: apagada `secretaria/periodos/ListPage.tsx` (rota `/list` morta), `periodos.tsx` ganhou `editingId` real (botão "Edit" que nunca teve `onClick`), `EmptyState`, e um botão "Calendário" por linha.
- **Bug real encontrado e corrigido em `SubmodalPeriodos.tsx`**: o `form.reset()` de edição rodava direto no corpo do componente (fora de `useEffect`), causando "Too many re-renders" — só nunca tinha sido notado porque o botão Edit estava morto e `editingId` nunca era truthy antes desta sessão. Corrigido com o mesmo padrão já usado em `SubmodalUnidades.tsx` (reset dentro de `useEffect`).
- Nova página `src/pages/app/secretaria/periodos/calendario.tsx` (rota `secretaria/periodos/:periodId/calendario`): card de resumo (dias letivos cumpridos, próximo feriado/recesso, reposições pendentes — ideia adaptada do card "Calendário letivo" em `docs/novus_edu_mockups.html`), `Calendar` do shadcn com dias coloridos por tipo de exceção, clique-no-dia abre diálogo pra marcar exceção pontual, e **"Marcar período"** — um segundo diálogo (data início/fim + tipo) que marca/limpa um intervalo inteiro de uma vez (essencial pra recesso/férias de semanas — marcar dia a dia seria péssima UX, feedback do usuário durante a sessão). Lista de exceções abaixo **agrupa dias consecutivos do mesmo tipo+descrição numa única linha** (ex.: "13/07/2026 a 31/07/2026 — Recesso"), com exclusão em lote do grupo inteiro — evita listar 19 linhas individuais pra um recesso de um mês.
- `src/pages/app/academico/chamada.tsx`: aviso não-bloqueante (`Alert`) quando a data selecionada não é letiva segundo o calendário cadastrado — não impede o registro da chamada, só avisa.

**Verificação**: 47/47 testes, `typecheck` limpo. Testado ao vivo no navegador contra o projeto real: criado período de teste, editado via botão Edit (confirmado que o "Too many re-renders" acontecia antes do fix e parou de acontecer depois), marcado feriado pontual (dia a dia) e um recesso de 19 dias via "Marcar período" — confirmado agrupamento em 1 linha, contagem de dias letivos recalculada corretamente (250→235, 15 dias úteis de julho descontados), exclusão em lote do grupo restaurando a contagem original. Testado o aviso em `chamada.tsx` selecionando uma data dentro do recesso. Dados de teste (período + exceções) limpos do banco ao final.

**Gaps conhecidos aceitos conscientemente**: `classes.year` continua um `INTEGER` solto, sem FK pra `periods` — não migrado nesta fase (mudança maior, arriscada, fora de escopo). O aviso em `chamada.tsx` é não-bloqueante de propósito.

## ✅ Fase 1 — GED do Aluno com Validação por IA (2026-08-03)

**Contexto**: terceira fatia da Fase 1. Investigando `documents` (usada tanto pelos anexos do aluno em `StudentAttachments`/`useDocuments` quanto por uma feature institucional paralela e não relacionada em `secretaria/documentos`), encontrei o mesmo bug de RLS sem política já corrigido em `classes`/`enrollments`/`student_guardians`, e também **nenhuma política de `DELETE` nos buckets de storage** (`avatars`/`docs`) — o botão "Excluir" que já existia em `StudentAttachments.tsx` estava quebrado. Não havia nenhum conceito de tipo de documento nem status de validação.

**Decisão de escopo**: a IA classifica **tipo do documento** (RG, CPF, comprovante de residência etc.) e avalia **legibilidade** — não extrai dados nem cruza com o cadastro (mais simples, sem risco de lidar mal com dado sensível). Roda sob demanda (botão "Validar com IA"), não automaticamente no upload.

**O que mudou**:
- Migration `20260803160000_documents_ged_ia.sql`: RLS em `documents` (`documents_manage`/`documents_select`, mesmo padrão de `classes`/`enrollments`), colunas `document_type`, `validation_status` (`pendente`/`validado`/`revisar`, default `pendente`), `ai_notes`, `validated_at`; políticas de `DELETE` para os buckets `avatars` e `docs` (não mexi em `edu-docs`, institucional, fora de escopo).
- `supabase/functions/ai-document-validation/index.ts` (nova): recebe `document_id`, baixa a imagem do storage (service role), chama OpenAI Vision (`gpt-4o-mini`) pedindo classificação de tipo + legibilidade em JSON. **Só processa imagens** — PDF marca `validation_status='revisar'` direto (gap consciente: exigiria renderizar a 1ª página como imagem, fora de escopo). Erro na IA também degrada para `revisar` com nota explicativa, em vez de derrubar a request (mesmo padrão de `ai-assessment-feedback`).
- `src/hooks/useDocuments.ts` + `src/lib/storage.ts`: nova `validateDocMutation`, `DocumentRecord` ganhou `document_type`/`validation_status`/`ai_notes`.
- `src/components/StudentAttachments.tsx`: colunas "Tipo" (mostra `document_type` quando a IA já rodou) e "Status" (badge colorido), item "Validar com IA" no dropdown (desabilitado com tooltip para PDF).
- `src/features/secretaria/alunos/SubmodalAlunos.tsx`: conecta `validateDocMutation` ao `StudentAttachments`.

**Verificação**: 47/47 testes, typecheck limpo. Testado ao vivo contra o banco real (mecânica de upload/RLS/delete, sem depender da OpenAI): criado aluno + turma + matrícula de teste, upload de imagem via chamada direta à Storage API + REST API do Supabase usando a sessão autenticada real do navegador (o `file_upload` do Claude in Chrome não aceita arquivos do scratchpad da sessão, então repliquei exatamente a chamada que o app faz) — confirmado `201`/`200`, coluna Tipo="Imagem"/Status="Pendente" corretas na UI, exclusão do documento funcionando (antes falhava, RLS de storage sem política de DELETE). Dados de teste limpos do banco ao final.

**Gaps conhecidos aceitos conscientemente**:
- `OPENAI_API_KEY` não configurada — a chamada real à IA (`ai-document-validation` de fato classificando uma imagem) **não foi testada nesta sessão**, só a mecânica em torno dela (upload, RLS, storage, status default, UI). Function não foi deployada ainda.
- Validação por IA não cobre PDF (só imagens jpg/png/webp).
- A segunda instância de `StudentAttachments` em `src/pages/app/alunos.tsx` (modal de "detalhes do aluno", clique na linha) está com `attachments={[]}` e handlers no-op hardcoded — nunca funcionou de verdade, não é regressão desta sessão, não corrigido (fora de escopo).
- A feature institucional de "Documentos" (`SubmodalDocumentos.tsx`, hub da secretaria) continua com seus próprios bugs pré-existentes (bucket `edu-docs` sem filtrar `owner_type`, duas `ListPage`s divergentes) — não tocada.

## ✅ Fase 1 — Funil de Admissão de Aluno Novo (2026-08-03)

**Contexto**: segunda fatia da Fase 1 (a primeira foi o Calendário Letivo). O funil de rematrícula (aluno já matriculado) já funcionava desde a Fase 0-A, mas o equivalente para **aluno novo** estava quebrado em dois pontos: em `reservas.tsx` o botão "Editar" não tinha `onClick` (não havia como aprovar uma reserva pela UI) e o botão "Converter em Matrícula" abria um `ModalMestre` em branco, sem relação com o candidato; dentro de `SubmodalReservas.tsx` havia um segundo botão "Converter em Matrícula" cujo `convertToEnrollmentMutation` só marcava `status='convertida'` sem criar nada. Também havia um bug adjacente: `SubmodalAlunos.tsx` coletava os dados do responsável legal (obrigatório para menores) mas nunca persistia — só inseria em `students`.

**O que mudou**:
- Migration `20260803140000_add_waitlist_conversion_tracking.sql`: `waitlist_applications.converted_student_id` (rastreabilidade da conversão).
- `src/features/secretaria/lib/createGuardianForStudent.ts` (novo): extrai de `SubmodalResponsaveis.tsx` a sequência insert `guardians` → insert `student_guardians` → `erpEmit.upsertClient` (sync não-fatal com o ERP) — usado agora em 2 call sites.
- `SubmodalAlunos.tsx`: no ramo de criação, se o aluno é menor e tem `responsible_full_name` preenchido, chama o helper acima. Fecha o bug de dado coletado e descartado.
- `ModalMestre.tsx`: nova prop opcional `editingItem` — semeia `editingStates[defaultTab]` uma vez ao abrir, permitindo que páginas-lista externas (como `reservas.tsx`) abram o modal genérico já com um item para editar.
- `src/features/secretaria/reservas/ConverterReservaDialog.tsx` (novo): diálogo próprio (fora do `ModalMestre`) que recebe a reserva aprovada, pré-preenche nome/data de nascimento/responsável, pede turma de destino + CPF do responsável, e numa mutation sequencial cria `students` → `guardians`+`student_guardians` (via helper) → `enrollments` → atualiza `waitlist_applications` (`status='convertida'`, `converted_student_id`).
- `reservas.tsx`: botão "Editar" corrigido (agora funcional), novos botões "Aprovar"/"Rejeitar" para reservas `pendente`, botão "Converter em Matrícula" (visível só em `aprovada`) agora abre o `ConverterReservaDialog` real. `IconBadge` no cabeçalho.
- `SubmodalReservas.tsx`: removido o botão/mutation de conversão morto (ação fake). **Bug real corrigido**: o form não tinha `useEffect` para resetar quando `editingReserva` muda depois do mount — só usava `defaultValues` estáticos, então abrir para editar sempre mostrava campos em branco (só não tinha sido notado porque, antes da prop `editingItem` do `ModalMestre`, nada de fora nunca populava esse estado). Corrigido com o mesmo padrão de `SubmodalAlunos.tsx`.
- `periodos.tsx`: retrofit visual — `IconBadge` no cabeçalho (tocado na mesma Fase 1, mantendo consistência).
- **Migration de segurança descoberta e corrigida** `20260803150000_add_missing_rls_policies_classes_enrollments_student_guardians.sql`: `classes`, `enrollments` e `student_guardians` tinham RLS habilitado **sem nenhuma política** — ninguém conseguia criar turma, matricular aluno ou vincular responsável no banco real (descoberto tentando testar o funil ao vivo: `INSERT` em `classes` falhava com "violates row-level security policy"). Adicionadas políticas `_manage` (ALL, roles admin/coordenação/secretário) + `_select` (qualquer membro da org), replicando exatamente o padrão já usado em `students`/`guardians`. Sem essa correção, o funil de admissão — e a Rematrícula da Fase 0-A — não funcionavam de verdade contra o banco real, apesar de terem sido dados como "prontos" antes.

**Verificação**: 47/47 testes, typecheck limpo. Testado ao vivo no navegador contra o projeto real, ponta a ponta: criada reserva → aprovada → convertida via `ConverterReservaDialog` (turma + CPF do responsável) → confirmado via SQL direto que `students`, `guardians`, `student_guardians` (`is_primary=true`), `enrollments` (`status=ativa`) e `waitlist_applications` (`status=convertida`, `converted_student_id`) ficaram todos corretos. Testado rejeitar reserva `pendente` (badge "Rejeitada"). Testado editar reserva existente (campos de texto pré-preenchidos corretamente após o fix do `useEffect`). Testado cadastro direto de aluno menor via "Alunos", confirmado via SQL que o responsável foi criado e vinculado (`student_guardians`). Dados de teste limpos do banco ao final.

**Gaps conhecidos aceitos conscientemente**:
- O `Select` de "Segmento Desejado"/"Série Desejada" em `SubmodalReservas.tsx` usa `defaultValue` (não reativo) em vez de `value` — ao editar uma reserva, o valor correto está no estado do formulário (e é submetido certo), mas o label visual do `Select` mostra o placeholder em vez do segmento já selecionado. Bug visual pré-existente, não é perda de dado, não corrigido nesta fatia (mesma classe de problema provavelmente repetida em outros formulários — vale uma varredura dedicada depois).
- As conversões multi-tabela (`ConverterReservaDialog`, `finalizeRematricula`) seguem sem transação — inserts sequenciais, sem rollback automático se um passo do meio falhar. Mesmo risco já aceito desde a Fase 0-A.
- Assinatura eletrônica de contrato + gatilho `createReceivable` (Porta 1 do ERP) continuam fora de escopo — ver Backlog e regra de negócio nova abaixo.
- **Regra de negócio confirmada pelo usuário**: no ERP, o "cliente" do contrato/mensalidade é sempre o **responsável**, nunca o aluno (menor não pode ser parte de contrato financeiro) — o nome do aluno aparece só como referência descritiva na cobrança. Já é assim no `createGuardianForStudent` (sincroniza o guardian, não o student); vale lembrar disso ao construir o call site de `createReceivable` no futuro.

## ✅ Fase 0-B: tirar a integração ERP do modo mock — lado educacional (2026-08-02)

**Contexto**: a integração financeira com o ERP era simulada de ponta a ponta — config só em `localStorage`, cliente de saída falando com endpoints inventados (`/clients`, `/receivables`, `/health`), webhook de entrada com fallback inseguro pro secret, `portal/financeiro.tsx` com array 100% hard-coded, `ops-alerts` com bloco de inadimplência comentado esperando uma tabela que não existia.

Investigando o contrato real do ERP (`novusai-erp/docs/CONTRATOS_CANONICOS_ERP.md` + código-fonte de `supabase/functions/sync-webhook/index.ts`), achei uma divergência real entre doc e código: o endpoint de fato implementado usa um envelope genérico `{event, table, data, timestamp, source_system}` com HMAC (v1/v2), **não** o `contaReceberCanonicalSchema` que a documentação descreve — é o formato do código que segui, não o da doc.

**Bloqueio descoberto**: a conta CLI usada aqui não enxerga o projeto do ERP (`lrkebsznehpuascgqbri`) — `supabase projects list` só mostra `Novusai-fiscal` e `Novus Educacional`. Por decisão do usuário, esta fase constrói os dois lados certos no código do lado educacional, mas **não tenta a chamada de saída real contra o ERP** (falta cadastrar uma linha em `webhook_configs` lá, que exige acesso que não temos).

**O que mudou**:
- Migration `20260802180000_create_erp_integration.sql`: duas tabelas novas — `erp_integration_config` (config por org, substitui o `localStorage`) e `financial_transactions` (títulos/pagamentos recebidos do ERP, preenche o gap que `ops-alerts` já esperava).
- `src/lib/featureFlags.ts`: `getERPConfig`/`setERPConfig` viram `async`, lendo/gravando em `erp_integration_config`. Removido `apiKey` (não existe no mecanismo real, que é HMAC) e `events.inventoryIssue`.
- `src/integrations/erp/client.ts` + `emit.ts`: reescritos pra falar o protocolo real — endpoint único `POST {baseUrl}/functions/v1/sync-webhook`, assinatura HMAC-SHA256 sobre o corpo bruto. `upsertClientByCPF` (call site real em `SubmodalResponsaveis.tsx`) e `createReceivable` (ainda sem call site — depende do fluxo de contrato da Fase 1) migrados; `testConnection` virou checagem de alcançabilidade via `OPTIONS` (não existe endpoint de health real). **Removido** `inventoryIssue`/`issueInventory` por completo — não tinha call site em lugar nenhum, não corresponde a nenhuma feature real do app, e o dispatcher do `sync-webhook` nem tem case pra isso.
- `src/pages/app/config/integracoes.tsx`: load/save assíncronos, campo "API Key" removido, toggle "Movimentação de Estoque" removido, campo novo `empresaRepresentadaId` (mapeamento manual pro tenant do ERP), botão renomeado pra "Testar Conectividade" com texto honesto sobre o que ele realmente valida.
- `src/pages/portal/financeiro.tsx`: array hard-coded trocado por query real em `financial_transactions` filtrada por `guardian_id`. Sem título real criado ainda (Fase 1 não existe), mostra o empty-state genuíno em vez de 3 boletos fictícios.
- `src/components/DebugBanner.tsx`, `DebugChip.tsx`, `src/pages/portal/dashboard.tsx`: ajustados pra ler a config de forma assíncrona (efeito colateral necessário da mudança em `featureFlags.ts`).
- `supabase/functions/edu-erp-webhook/index.ts`: fallback inseguro (`|| 'demo-secret-key'`) removido — sem `ERP_SIGNING_SECRET` configurado, a function agora recusa (500) em vez de aceitar um secret conhecido. Schema do evento aceito trocado pro canônico de Liquidação (`titulo_id`, `tipo_titulo`, `valor_pago`, `data_pagamento`, `forma_pagamento`). `organization_id` resolvido a partir de `idempotency_key` na convenção `novus-educacional:<organization_id>:<numero_documento>`. Upsert real em `financial_transactions` (antes só gravava em `audit_logs`).
- `supabase/functions/ops-alerts/index.ts`: bloco de inadimplência ativado de verdade, consultando `financial_transactions` (`status not in (pago,cancelado)` + `due_date` vencido + valor acima do threshold), em vez do placeholder que sempre retornava 0.
- `supabase/config.toml`: adicionado `[functions.edu-erp-webhook] verify_jwt = false` — sem isso, o endpoint (que é chamado por um sistema externo sem sessão Supabase) rejeitava toda chamada com 401 antes mesmo de chegar na validação HMAC.

**Verificação — lado de entrada (100% testado de ponta a ponta contra o projeto real)**: gerado um `ERP_SIGNING_SECRET` de teste, setado via `supabase secrets set`, `edu-erp-webhook` e `ops-alerts` deployados. Montado um payload de Liquidação assinado (HMAC) manualmente e chamado via `curl` contra a function deployada: confirmado que (1) assinatura inválida é rejeitada com 401, (2) um evento `receivable.paid` cria a linha certa em `financial_transactions` com `organization_id` resolvido corretamente via `idempotency_key`, (3) um evento subsequente `receivable.partially_paid` pro mesmo `titulo_id` **atualiza** a mesma linha (não duplica) — `status` muda de `pago` pra `parcial` corretamente. Dados de teste limpos do banco depois. 47/47 testes locais, `typecheck` limpo.

**Verificação — lado de saída (pendente)**: não testável contra o ERP real por falta de acesso. A assinatura HMAC de saída usa a mesma primitiva já testada na validação de entrada (só assina em vez de verificar), então a implementação é consistente, mas **não foi validada contra o `sync-webhook` real**. Pendências pra desbloquear: (a) acesso da conta CLI ao projeto `lrkebsznehpuascgqbri`, ou (b) o usuário cadastrar manualmente uma linha em `webhook_configs` lá (`nome='novus-educacional'`, `empresa_representada_id` de um tenant real) e passar `empresa_representada_id` + `secret_token` de volta pra configurar aqui.

**Gaps conhecidos aceitos conscientemente**: `erp_integration_config.signing_secret` tem RLS só por organização (mesmo padrão de toda a tabela do app) — não existe RLS por role neste app (diferente do ERP), então não inventei um padrão novo só pra esta tabela. `createReceivable` ainda não tem call site na UI — só existe de verdade quando a Fase 1 (contrato/mensalidade) for implementada.

## ✅ Fase 0-A: refactor da secretaria (rematrícula/reservas/solicitações/visitantes) (2026-08-02)

**Contexto**: primeira execução do roadmap formalizado nesta sessão (ver seção de roadmap abaixo). Existia um refactor de UI abandonado — rotas duplicadas `secretaria/{area}` (funcional) e `secretaria/{area}/list` (placeholder, esperando tabelas que nunca existiram: `re_enrollments`, `seat_reservations`, `service_requests`) — e as 3 últimas nem tinham link no menu.

**O que mudou**:
- Visitantes/Reservas/Solicitações: mantida a página funcional original (já usava as tabelas reais), incorporado só o empty-state visual melhor da versão `ListPage.tsx`; apagadas as pastas `ListPage.tsx` mortas e as rotas `/list` correspondentes em `src/App.tsx`.
- Rematrícula: criada de verdade a tabela `public.re_enrollments` (migration `20260802170000_create_re_enrollments.sql`, aplicada no projeto real via `supabase db query --linked -f ...` — **não** via `db push`, porque o histórico de migrations do CLI não bate com o schema real e um `db push` cego tentaria reaplicar as 13 migrations já existentes) com RLS por organização. `secretaria/rematricula/ListPage.tsx` reescrita para consultar `re_enrollments` (join `students`/`classes` com hint de FK explícito, já que há duas FKs pra `classes`) e implementar de verdade aprovar/finalizar (finalizar cria a `enrollments` de verdade). `SubmodalRematricula.tsx` agora cria uma solicitação pendente em `re_enrollments` em vez de matricular direto. A ferramenta de rematrícula **em lote** (`rematricula.tsx`, sem aprovação, insere direto) foi preservada como fluxo separado em `secretaria/rematricula/lote`, com link cruzado entre as duas páginas.
- `src/integrations/supabase/types.ts` regenerado do schema real (`supabase gen types typescript --linked`); `db-types.ts` ganhou `ReEnrollmentRow/Insert/Update`.
- **Correção (autocrítica)**: inicialmente tentei adicionar links de Reservas/Solicitações/Rematrícula em `src/components/ui/sidebar.tsx` — só depois descobri que esse arquivo (`Sidebar`/`MobileSidebar`/`sidebarData`) **não é importado em lugar nenhum do app**, é código morto de um scaffold antigo do shadcn. A navegação real vem de `AppSidebar` dentro de `src/components/layout/AppShell.tsx`, com uma lista `baseMenuItems` própria e plana (só "CRM" tem `submenu`, e nem esse é renderizado). Descoberta ao investigar o bug de contraste (ver abaixo). A boa notícia: o Hub da Secretaria (`src/features/secretaria/hub/SecretariaHub.tsx`) já lista cards pras 4 áreas (Visitantes/Reservas/Solicitações/Rematrícula) com botão "Abrir Lista" — ou seja, a descoberta via UI **já funcionava** por esse caminho, meu diagnóstico original de "só acessível digitando a URL" estava incompleto (só valia pro rail lateral colapsado, não pro Hub).

**Verificação**: 47/47 testes, `typecheck` limpo. Tabela `re_enrollments` confirmada no banco real via query direta. Percorrido ao vivo no navegador: Visitantes/Reservas/Solicitações renderizam o empty-state correto sem erro de console; Rematrícula carrega a query com join de FK dupla sem erro (não foi possível testar criar/aprovar/finalizar via UI porque a organização de teste atual não tem nenhum aluno cadastrado).

## ✅ Bug de contraste da sidebar corrigido (2026-08-02)

**Contexto**: usuário reportou que o menu lateral colapsável tinha cores que deixavam os itens quase invisíveis. Confirmado ao vivo no navegador: todos os itens inativos (Dashboard, BI, CRM, Acadêmico, Pedagógico, Eventos) apareciam em cinza claro quase invisível — só o item ativo tinha contraste correto.

**Causa raiz**: `AppShell.tsx:94` (componente `AppSidebar`, o real, não o `ui/sidebar.tsx` morto) usava a classe `bg-sidebar-background` no container. Essa classe **não existe** — `tailwind.config.ts` mapeia a cor como `sidebar.DEFAULT` (não `sidebar.background`), então a classe Tailwind gerada é `bg-sidebar`, não `bg-sidebar-background`. Com a classe inválida, nenhum fundo era aplicado — a sidebar ficava com o branco padrão da página por baixo, e o texto claro (`text-sidebar-foreground`, esse sim uma classe válida) ficava ilegível. O item ativo aparecia certo porque usa `bg-sidebar-accent`, que é uma classe válida.

**O que mudou**: `src/components/layout/AppShell.tsx:94` — `bg-sidebar-background` → `bg-sidebar`. Uma linha.

**Verificação**: 47/47 testes, `typecheck` limpo, confirmado ao vivo no navegador (sidebar expandida e colapsada) que todos os itens do menu ficaram legíveis com bom contraste.

## ✅ Remoção de tooling de criação de admin da tela de login (2026-08-02)

**Contexto**: encontrado, ao retomar a sessão, um conjunto de mudanças já feitas na working tree mas nunca commitadas nem documentadas. `DevUserCreator` era um botão renderizado na **página pública de login** (`src/pages/auth/login.tsx`) que chamava `createAdminUser()` pra criar um usuário admin diretamente do client — exatamente o tipo de superfície de risco que a seção de Segurança deste projeto já sinalizava (credenciais de admin expostas no histórico do git, `ADMIN_SEED_TOKEN`).

**O que mudou**:
- Removidos: `src/components/DevUserCreator.tsx`, `src/utils/createAdminUser.ts`, `src/utils/createDevUser.ts`, `src/utils/runDiagnostics.ts`, `supabase/functions/dev_diagnostics/index.ts`.
- `src/pages/auth/login.tsx`: removidos os imports e o bloco de UI ("Seção de desenvolvimento") que renderizava o `DevUserCreator` e o botão de diagnóstico.
- `supabase/config.toml`: `project_id` corrigido de `nkcadmwydfnzrnauzeyz` (projeto morto) pra `ixnpotaccbpcbritxlud` (projeto real) — fecha a mesma inconsistência já documentada na sessão de reconciliação de 2026-07-31.

**Verificação**: `grep` confirmou nenhuma referência remanescente aos arquivos removidos. 47/47 testes, `typecheck` limpo. Commit `f6fb0c6`.

**Gaps conhecidos**: nenhum introduzido por esta mudança. Os itens de backlog relacionados (rotação de credenciais, secrets do projeto novo) continuam em aberto — ver Backlog abaixo.
- **Supabase**: projeto `ixnpotaccbpcbritxlud` ("Novus Educacional", `sa-east-1`, criado 2026-07-30). CLI linkado neste ambiente. As 25 migrações locais foram confirmadas como aplicadas de verdade no banco (spot-check via REST). **12 Edge Functions deployadas** (as 11 originais + `onboarding-create-org`, nova).
- **Saúde técnica**: 47/47 testes, `typecheck` e `build` limpos.
- **Decisões em aberto** (perguntadas ao usuário, sem resposta ainda ou adiadas):
  1. Rotacionar a senha do admin/`ADMIN_SEED_TOKEN` expostos no histórico do git (`create_admin_script.md`) — recomendado, não feito.
  2. Configurar os secrets do projeto novo (`ADMIN_SEED_TOKEN`, `OPENAI_API_KEY`, `ERP_SIGNING_SECRET` etc.) — nenhum está setado hoje.
  3. Restyle visual do Portal dos Responsáveis (`/portal`) — usuário decidiu explicitamente deixar para depois; só `/app` foi feito.
  4. Roadmap dos dois PDFs em `docs/` (gestão desktop + engajamento mobile) — ainda não discutido/formalizado em plano; usuário pediu pra considerar o que o ERP já tem pronto e evitar mudanças de grande monta que exijam parada técnica.
  5. Existe uma organização de teste órfã no banco (tentativa de onboarding que falhou antes do fix de `upsert`) — cosmético, não limpo.
- **Regra nova do usuário nesta sessão**: manter este arquivo (`docs/STATUS.md`) e `CLAUDE.md` atualizados ao final de cada atividade, pra qualquer agente ou dev novo entender o projeto sem depender de memória de conversa.

## ✅ Restyle visual de `/app` (2026-07-31)

**Contexto**: usuário achou que o painel tinha "cara de ERP" e pediu uma reformulação puramente estética (cores, ícones, cards, tipografia), sem mudar funcionalidade. Direção definida a partir de uma referência visual fornecida (`docs/Gemini_Generated_Image_e8l053e8l053e8l0.png`) e de decisões explícitas do usuário: só `/app` nesta rodada (Portal fica pra depois), extrair só o estilo da referência (as ideias de trilha gamificada/radar de IA nela são conteúdo de roadmap, não UI a implementar agora).

**O que mudou**:
- `src/index.css` / `tailwind.config.ts` / `index.html`: nova paleta teal (primária) + coral (`--accent-warm`, destaque), `--radius` maior (cards mais arredondados), sidebar com fundo teal escuro, fonte Nunito via Google Fonts.
- `src/components/IconBadge.tsx` (novo): ícone em badge circular colorido, 6 tons (`primary`/`warm`/`success`/`info`/`purple`/`danger`), substituindo blocos ad hoc duplicados (`academico.tsx`, `chamada.tsx`, `pedagogico.tsx`, `eventos.tsx`, `bi/*.tsx`).
- `src/components/bi/BICard.tsx` restilizado pra usar `IconBadge`; `src/pages/app/dashboard.tsx` consolidado pra usar `BICard` em vez de 4 cards de KPI reimplementados inline.
- ~20 arquivos com cores Tailwind hardcoded (status de presença/matrícula, gráficos Recharts, feedback de IA, contador de alertas) realinhados pra família da nova paleta, mesma semântica.
- `auth/login.tsx` e `NotFound.tsx` migrados de cinza/azul cru pros tokens do tema.
- Ícone de "Secretaria" na sidebar: `Building2` → `School`.

**Verificação**: 47/47 testes, typecheck e build limpos. Percorrido ao vivo no navegador (dashboard, sidebar expandida, `/app/eventos`, `/app/bi/academico`, tela de login) sem erro no console.

**Gaps conhecidos**: Portal (`/portal`) não foi tocado — mesma paleta antiga, ainda "cara de ERP". Se for restilizado depois, reaproveitar `IconBadge`/`BICard` de lá.

## ✅ Onboarding de organização + deploy das Edge Functions (2026-07-31)

**Contexto**: ao testar o app de verdade no navegador (login real, não só build), descobri que **nenhuma das 12 Edge Functions estava deployada** no projeto Supabase (`ixnpotaccbpcbritxlud` — projeto novo, criado um dia antes). Isso significa que `edu-erp-webhook` (o receptor real de eventos do ERP) nunca poderia ter funcionado. Descobri também que contas criadas via `/auth/register` ficam sem `organization_id` — sem organização, o app inteiro trava em "Organização não selecionada", e não havia nenhum fluxo na UI pra resolver isso.

**O que mudou**:
- `supabase functions deploy` das 12 functions (autorizado explicitamente pelo usuário — é escrita em produção).
- `supabase/functions/onboarding-create-org` (nova): dado o JWT do usuário autenticado, cria uma organização e vincula o `profiles` dele como admin. Espelha o padrão já existente em `create_admin_user`, mas self-service (não precisa de `ADMIN_SEED_TOKEN`).
- `src/pages/app/onboarding.tsx` (nova) + rota `/app/onboarding`, linkada no empty-state do dashboard.
- **Dois bugs encontrados testando de verdade contra o banco real** (corrigidos no commit seguinte, `18abe28`): a function usava `.update()` em vez de `.upsert()` (não existe trigger que crie a linha em `profiles` no signup comum — só existe pra `guardians`, no portal), e faltava `full_name` (coluna `NOT NULL`) no upsert.

**Verificação**: testado ponta a ponta contra o projeto real — login com `novusaisnp@gmail.com`, criação de organização via `onboarding-create-org`, confirmado por REST que `profiles.organization_id`/`role`/`full_name` ficaram corretos, dashboard passou a renderizar dados reais (zeros de uma org vazia, não mais tela travada).

**Gaps conhecidos**: existe uma organização de teste órfã (tentativa anterior ao fix do `upsert`) — sem limpeza. Secrets do projeto (`ADMIN_SEED_TOKEN` etc.) continuam não configurados, então `create_admin_user` ainda não funciona.

## ✅ Correções encontradas testando em navegador: audit log, form aninhado, feedback do "Testar Conexão" (2026-07-31)

**Contexto**: parte da verificação "roda de verdade, não só compila" pedida pelo usuário. Ao logar e navegar pelo app real, o console acumulava erros repetidos.

**O que mudou**:
- `src/utils/auditSafe.ts`: `logAuditSafe` mandava `organization_id: ''` pro Postgres quando não havia organização — coluna é `uuid NOT NULL`, então toda navegação de um usuário sem org gerava um erro no console. Agora pula o log em vez de tentar gravar um UUID inválido. Corrigido junto: o filtro de PII em `sanitizeAudit` usava `.includes()` (substring), descartando por engano `organizationId` (contém "rg") e `pathname` (contém "name") — trocado pra match exato.
- `src/pages/app/config/integracoes.tsx`: a seção "Recursos de IA" renderizava um `<form>` dentro do `<form>` principal da página (HTML inválido, warning do React). Movida pra fora, como seção irmã com form independente. Também: o botão "Testar Conexão" não fazia nada, sem feedback, quando não havia organização — agora mostra um toast de erro.
- `src/components/layout/AppShell.tsx`: erro de typecheck real (`error.message` em variável tipada `unknown` no fallback do error boundary) — só apareceu porque o script `typecheck` não existia antes desta sessão e nunca tinha rodado em CI.
- 2 testes pré-existentes quebrados em `pwa.provider.spec.tsx` (usavam `require()` dentro do ambiente ESM do Vitest) — trocados por import estático no topo do arquivo.

**Verificação**: 47/47 testes (incluindo os 2 corrigidos), confirmado ao vivo no console do navegador que os erros de auditoria pararam de aparecer.

## ✅ Reconciliação com GitHub + migrações Supabase restauradas + housekeeping (2026-07-31)

**Contexto**: pedido inicial da sessão — auditoria profunda da pasta, conectar com o repositório GitHub `novusaisnp/novus-ai-educacional-54`, e validar se as migrações Supabase já feitas estavam corretas.

**O que foi encontrado**: a pasta local nunca teve `.git`, mas o repositório remoto já existia, completo, com **25 arquivos de migração** (12–22/ago/2025) que faltavam na pasta local (`supabase/migrations/` estava vazia aqui). O `.env` local apontava pra um projeto Supabase morto (`nkcadmwydfnzrnauzeyz`, DNS não resolve mais) — o app só funcionava por causa de um fallback hardcoded em `client.ts` apontando pro projeto certo (`ixnpotaccbpcbritxlud`).

**O que mudou**:
- Git inicializado, histórico do GitHub puxado como base (restaurou as 25 migrações), housekeeping reaplicado por cima como novo commit.
- `.env` parou de ser rastreado (`.gitignore` + `.env.example` criado).
- Gerenciador de pacotes padronizado em **Bun** (igual ao `novusai-erp`) — removido `package-lock.json`, CI (`.github/workflows/ci.yml`) trocado de `pnpm` (sem lockfile, sempre falharia) pra Bun, scripts `test`/`typecheck` adicionados ao `package.json` (não existiam).
- Credenciais reais em texto puro removidas de `create_admin_script.md` (permanecem expostas no histórico do git — recomendação de rotação em aberto).
- Export duplicado `erpEmit` removido de `src/integrations/erp/client.ts` (o real, usado em todo o app, é `src/integrations/erp/emit.ts`).

**Verificação**: as 25 migrações batem estruturalmente com o schema real (spot-check via REST contra `ixnpotaccbpcbritxlud` — tabelas existem, sem nenhum `DROP` destrutivo nas migrações). 47/47 testes, typecheck e build limpos.

## Riscos conhecidos (não são bugs — decisões/lacunas conscientes)

- `useBIData.ts` (BI Financeiro) ainda retorna dados mock/zerados — não coberto pela Fase 0-B (é um dashboard, não a integração ERP em si).
- 229 erros de lint pré-existentes (majoritariamente `no-explicit-any` em Edge Functions) — dívida técnica não tratada nesta sessão, CI vai falhar em `bun run lint` até isso ser resolvido.
- `src/components/ui/sidebar.tsx` (`Sidebar`/`MobileSidebar`/`sidebarData`) é código morto — não importado em lugar nenhum do app. A sidebar real é `AppSidebar` em `src/components/layout/AppShell.tsx`. Não remover sem checar de novo antes (confirmar via grep que continua sem uso).
- Integração de saída ERP (educacional → ERP) implementada no código mas não testada contra o `sync-webhook` real — falta acesso ao projeto `lrkebsznehpuascgqbri` ou coordenação manual com o time do ERP (ver Fase 0-B).
- **O mesmo bug do botão "Edit" sem `onClick`** corrigido em `periodos.tsx` e `reservas.tsx` (ver Fase 1) existe também em `series/ListPage.tsx`, `segmentos/ListPage.tsx`, `unidades/ListPage.tsx`, `documentos/ListPage.tsx`, `responsaveis/ListPage.tsx`, `ex-alunos/ListPage.tsx` — não corrigido nesta sessão (fora do escopo da fatia atual). Além disso, `series`, `segmentos` e `unidades` **só têm a rota `/list` registrada em `App.tsx`** — o link do Hub (`getRouteForModule`) aponta pra rota canônica sem `/list`, que não existe pra esses 3 módulos, resultando em 404 ao clicar "Abrir Lista" no Hub da Secretaria.
- Validação por IA de documento (`ai-document-validation`) não cobre PDF, só imagens — e a function não foi testada contra a OpenAI de verdade nesta sessão por falta de `OPENAI_API_KEY` configurada.
- Segunda instância de `StudentAttachments` em `src/pages/app/alunos.tsx` (modal de detalhes do aluno) está com `attachments={[]}` hardcoded e handlers no-op — nunca funcionou, não é regressão desta sessão.
- `Select` de segmento/série em `SubmodalReservas.tsx` usa `defaultValue` em vez de `value` — não reflete o valor ao editar (visual apenas, dado submetido continua correto). Provavelmente o mesmo padrão existe em outros formulários com `Select` + edição — não auditado.
- **`uploadAvatar` (`src/lib/storage.ts`) vai falhar na primeira troca de foto de aluno**: faz upsert em `documents` com `onConflict: 'organization_id,owner_type,owner_id,title'`, mas essa tabela não tem nenhuma UNIQUE constraint além da PK (mesma classe de bug 42P10 já corrigida em `chamada.tsx`/`useGrades.ts` nesta sessão, ver acima) — exige migration nova pra criar a constraint, não só ajustar o código.
- **`profiles.role` CHECK constraint só permite `'secretaria'`, mas todo o resto do app (migrations de RLS, `useUserRole.ts`, `AppShell.tsx`) usa `'secretario'`** — nunca disparou porque hoje só existe perfil `admin` no banco real, mas qualquer usuário criado com papel de secretaria vai cair fora de toda checagem de role baseada nesse valor.
- CRM atual (`src/pages/app/crm/*`) tem o mesmo padrão de botão morto (`"Nova Interação"` sem `onClick` em `interacoes.tsx`) — **não corrigido por decisão do usuário**: CRM vai ser repensado como produto bem mais amplo (WhatsApp API, app próprio, agentes de IA de atendimento "na pegada do Helena"), fora do escopo de qualquer ajuste pontual até essa conversa acontecer.

## Backlog

- Rotacionar credenciais expostas (admin/`ADMIN_SEED_TOKEN`).
- Configurar secrets do projeto Supabase novo (`OPENAI_API_KEY`, `RESEND_API_KEY`, `WHATSAPP_API_*` — `ERP_SIGNING_SECRET` já setado nesta sessão, com valor de teste).
- Restyle visual do Portal dos Responsáveis.
- Resolver os 229 erros de lint (ou decidir excluir Edge Functions do lint gate).
- Limpar organização de teste órfã.
- Considerar remover `src/components/ui/sidebar.tsx` (dead code confirmado) numa limpeza futura.
- Destravar a integração de saída ERP: conseguir acesso ao projeto `lrkebsznehpuascgqbri` (ou pedir pro time do ERP cadastrar a linha em `webhook_configs` e passar `empresa_representada_id`/`secret_token`) e então testar `createReceivable`/`upsertClientByCPF` de ponta a ponta.
- Corrigir o mesmo bug de botão "Edit" morto em `series/segmentos/unidades/documentos/responsaveis/ex-alunos` (ListPages), igual ao já corrigido em `periodos.tsx`.
- Registrar as rotas canônicas (sem `/list`) de `series`, `segmentos` e `unidades` em `App.tsx` — hoje só existe `/list`, causando 404 ao clicar "Abrir Lista" no Hub da Secretaria pra esses 3 módulos.
- Corrigir `defaultValue`→`value` nos `Select` de formulários com edição (começando por `SubmodalReservas.tsx`), e auditar se o mesmo padrão se repete em outros submodais.
- Migrar `classes.year` (hoje `INTEGER` solto) pra uma FK real em `periods`, se fizer sentido quando a Fase 3 (grade horária) for desenhada.
- Deploy da function `ai-document-validation` + configurar `OPENAI_API_KEY` e testar a classificação real contra a OpenAI (não foi possível nesta sessão).
- Estender a validação por IA de documento pra cobrir PDF (renderizar 1ª página como imagem antes da Vision API).
- Corrigir a segunda instância de `StudentAttachments` em `src/pages/app/alunos.tsx` (modal de detalhes, `attachments={[]}` hardcoded).
- Criar migration com UNIQUE constraint em `documents` (`organization_id, owner_type, owner_id, title`) e corrigir `uploadAvatar` (`src/lib/storage.ts`) — hoje falha com 400 (42P10) na primeira troca de foto de aluno.
- Corrigir o CHECK constraint de `profiles.role` (só permite `'secretaria'`) pra bater com `'secretario'`, usado em todo o resto do app — ou alinhar o app pro valor do banco, o que fizer mais sentido.
- Desenhar o padrão de erros inteligíveis/rastreáveis pra qualquer produto NOVUS (não só esta sessão) — pedido explícito do usuário, ainda não desenhado, toca `novus-educacional` e `novusai-erp`.
- Repensar o CRM (`src/pages/app/crm/*`) como produto mais amplo — WhatsApp API, app próprio da escola, agentes de IA de atendimento/vendas "na pegada do Helena" — pedido explícito do usuário, ainda não desenhado.

## 🗺️ Roadmap formalizado (2026-08-02)

Baseado em `docs/mapa_mental_gestao_novus.pdf` (backoffice), `docs/mapa_mental_novus.pdf` (engajamento), `docs/MVP de ideias.MD` (raio-x de mercado vs. concorrentes tipo TOTVS Educacional/Sponte) e `docs/novus_edu_mockups.html` (referência de UI navegável — 5 telas: Visão Geral, Acadêmico, Secretaria, Portal Família mobile, Integração ERP). Princípio de fronteira (reafirmado após ler `novusai-erp/docs/CONTRATOS_CANONICOS_ERP.md`): o satélite não recria financeiro/fiscal/RH — só consome as 3 portas do ERP (Título, Liquidação, Autorização) e o módulo `Contrato` recorrente que já existe lá.

**Nota sobre `docs/novus_edu_mockups.html`**: é referência de ideias de layout/UX, não uma direção fechada de redesign — usuário pediu explicitamente pra aproveitar só o que fizer sentido, não adotar tudo. Padrões concretos úteis que vale reaproveitar quando cada Fase for implementada: stepper de matrícula em etapas (dados → documentos → responsáveis → financeiro → confirmação) pra Fase 1; dots de frequência (presente/falta/justificada) e inputs de nota inline na grade do diário de classe pra Fase 1/4; tags de habilidades BNCC por aula pra Fase 4; card de "conselho de classe" com atas/pareceres pendentes e card de "PEI ativos" pra Fase 1.5; ring chart de frequência e tela de "justificar falta" com anexo + chat da coordenação no mobile pra Fase 5; diagrama de arquitetura satélite↔ERP core com status de webhooks/APIs e painel multi-unidade pra Fase 0-B/Transversal.

- **Fase 0 — Fundação**: (A) ✅ refactor da secretaria concluído (rematrícula/reservas/solicitações/visitantes). (B) ✅ ERP tirado do modo mock do lado educacional (config em Postgres, protocolo real, entrada testada de ponta a ponta) — saída ainda pendente de acesso ao ERP, ver Backlog. (C) rotação de credenciais + secrets do Supabase (depende de ação do usuário) — ainda não feito. (D) dívida de lint — ainda não feito.
- **Fase 1 — Secretaria Digital**: (Calendário Letivo) ✅ feito — `periods` + `calendar_exceptions`, marcação por dia ou por intervalo, aviso em `chamada.tsx`. (Funil de Admissão) ✅ feito — reserva de vaga → aprovação/rejeição → conversão real em `students`+`guardians`+`enrollments`, responsável persistido também no cadastro direto de aluno. (GED do Aluno com IA) ✅ feito — upload/exclusão de anexo funcionando de verdade (RLS+storage corrigidos), classificação de tipo/legibilidade via `ai-document-validation` (function criada, ainda não deployada/testada contra a OpenAI real — falta `OPENAI_API_KEY`). Ainda por fazer: assinatura eletrônica de contrato com gatilho real pra Porta 1 do ERP. **Somar do MVP novo**: recuperação/progressão parcial/dependência no modelo de avaliação, ata de conselho de classe digital, transferência escolar (declaração/guia).
- **Fase 1.5 — Educação Inclusiva** (novo, do MVP): PEI, laudos e adaptações — compliance LBI, sem cobertura hoje. Tratar como tema próprio, não sub-item.
- **Fase 2 — Conformidade Regulatória**: Censo Escolar/Inep + Painel do Diretor. **Somar do MVP**: exportação SAEB e sistemas estaduais/municipais.
- **Fase 3 — Turmas & Horários**: enturmação inteligente, grade horária automatizada (depende do calendário letivo da Fase 1).
- **Fase 4 — Copiloto do Professor**: planejador BNCC, banco de questões, correção por OCR/visão computacional (estende `ai-assessment-feedback` já existente).
- **Fase 5 — Portal da Família**: feed estilo rede social, push (reaproveita `notify-dispatch`), relatórios sintéticos por IA. **Somar do MVP**: justificativa de falta online, pesquisas de satisfação/NPS.
- **Fase 6 — Engajamento & Interop**: trilha adaptativa, gamificação, tutor virtual 24/7. **Somar do MVP**: integração com LMS externos (Google Classroom/Teams).
- **Fase 7 — Logística física** (novo, do MVP, baixa prioridade/diferenciação): controle de acesso físico (portaria/biometria — dado sensível LGPD, tratar com cuidado extra), cardápio escolar, rastreamento de transporte/ônibus.
- **Transversal**: SSO/federação de identidade com o ERP (relevante pra redes de ensino) — entra junto do trabalho de tirar o ERP do modo mock (Fase 0-B).

Confirmado como já coberto (não é gap): consentimento LGPD de menores (`consents`/`contact_consents`), chatbot de atendimento (`ai-chatbot`), multi-unidade (`units`). RH/folha/e-Social ficam explicitamente fora — é módulo `rh` do `novusai-erp`, não do satélite.
