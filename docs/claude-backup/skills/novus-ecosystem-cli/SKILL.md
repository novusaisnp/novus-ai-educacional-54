---
name: novus-ecosystem-cli
description: Como trabalhar com o Supabase CLI entre os múltiplos projetos do ecossistema NOVUS.AI (novus-educacional, novusai-erp, e futuros satélites como PDV/frente de caixa/CRM) sem quebrar o acesso de um projeto ao mexer no outro. Use antes de rodar qualquer comando `supabase` quando a tarefa envolver mais de um repositório do ecossistema, ou sempre que um comando supabase falhar de forma inesperada em sessão que tocou mais de um projeto.
---

# CLI do Supabase no ecossistema NOVUS.AI

NOVUS.AI é uma única empresa/equipe com múltiplos produtos, cada um em seu próprio repositório e projeto Supabase: o hub (`novusai-erp`, retaguarda financeira/fiscal/administrativa) e os satélites (`novus-educacional` hoje; futuros: PDV, frente de caixa, CRM de receita/relacionamento etc.). Trabalhar entre eles — editar arquivos de um repo a partir de uma sessão focada no outro, consultar/deployar num projeto Supabase diferente do "principal" da tarefa — é esperado e autorizado, não uma violação de escopo. Isso já está registrado em `~/.claude/settings.json` (`autoMode.allow`), então o classificador de segurança não deve mais bloquear esse tipo de ação — se bloquear, é porque a regra não cobre o caso específico; ajuste a regra em vez de tentar contornar.

## Projetos conhecidos (atualizar conforme surgirem novos satélites)

| Repo | Projeto Supabase (ref) | Conta/organização | Observação |
|---|---|---|---|
| `novus-educacional` | `ixnpotaccbpcbritxlud` | conta "novusaisnp" | satélite educacional |
| `novusai-erp` | `lrkebsznehpuascgqbri` ("Novus ERP 2026") | conta "Lignum" | hub financeiro/fiscal/administrativo |

## 🚨 O problema real: login do CLI é exclusivo, não por-projeto

`supabase login` (via navegador) ou `supabase login --token <x>` autentica a **conta inteira**, não um projeto específico. Se `novus-educacional` e `novusai-erp` (ou um satélite futuro) pertencerem a contas Supabase diferentes — como é o caso hoje —, logar numa conta **substitui** a sessão da outra por completo. `supabase projects list` só mostra os projetos da conta atualmente logada; não existe "estar logado nas duas ao mesmo tempo".

**Sintoma enganoso**: depois de trocar de conta, comandos contra o projeto anterior não falham com "projeto não encontrado" — falham com erro de permissão (`403`, `unexpected login role status`), parecendo um problema de acesso/RLS quando na verdade é só a conta errada logada.

## Protocolo antes de qualquer comando `supabase` numa sessão que já tocou mais de um projeto

1. Rode `supabase projects list` primeiro.
2. Confira se o projeto que você precisa aparece na lista.
3. Se **não aparecer**: não é falta de permissão de verdade — é a conta errada logada. Peça ao usuário um novo token de acesso pessoal da conta certa (gerado em https://supabase.com/dashboard/account/tokens) e rode `supabase login --token <token>` antes de prosseguir.
4. Depois de terminar o trabalho num projeto, se for voltar a mexer no outro, **assuma que vai precisar logar de novo** — não persista o pressuposto de que a sessão anterior ainda está válida, mesmo que só tenham se passado poucos comandos.

## Boas práticas pra reduzir o vaivém

- Sempre que possível, **agrupe todo o trabalho de um projeto numa sequência contígua de comandos** antes de trocar de conta pro outro projeto — minimiza quantas vezes o login precisa trocar de mão.
- Ao pedir um token ao usuário, peça que ele **cole o valor direto no chat só se não houver alternativa** — o ideal é ele mesmo rodar `export SUPABASE_ACCESS_TOKEN=...` via `!` no terminal (o valor não aparece no histórico da conversa). Se o usuário colar o token em texto puro mesmo assim, use-o mas sugira revogar/gerar um novo depois.
- Depois de usar `supabase login --token` com um token colado em texto puro no chat, considere isso um segredo já exposto na sessão — não é preciso re-mascarar, mas evite reimprimir o valor em respostas futuras.

## Deploy/config entre repos

Editar `supabase/config.toml` (ex: `verify_jwt = false` pra uma function nova) e rodar `supabase functions deploy <nome> --project-ref <ref>` num repo que não é o "principal" da sessão atual é autorizado quando a function em si documenta (no cabeçalho do arquivo) por que é segura/de baixa sensibilidade — mesmo padrão já usado em `edu-erp-webhook` e `job-recorrencias`. Ver skill `erp-satellite-integration` pro protocolo de dados entre satélite e ERP; esta skill aqui é só sobre a mecânica de sessão/CLI.
