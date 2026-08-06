---
name: project-supabase-cli-account-switching
description: "novus-educacional (ixnpotaccbpcbritxlud) e novusai-erp (lrkebsznehpuascgqbri) são contas Supabase diferentes — login do CLI é exclusivo, trocar de projeto exige re-login e quebra o acesso ao outro silenciosamente."
metadata: 
  node_type: memory
  type: project
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T01:04:55.228Z
---

O projeto Supabase de `novus-educacional` (`ixnpotaccbpcbritxlud`, org `gcywjpnkhxnbbqqpyblg`, conta "novusaisnp") e o de `novusai-erp` (`lrkebsznehpuascgqbri`, org `nnyqyvorotzguamfimlr`, conta "Lignum") ficam em **contas Supabase diferentes**, não só projetos diferentes na mesma conta. `supabase login --token <x>` substitui a sessão inteira do CLI — não existe jeito de ficar logado nas duas ao mesmo tempo. Rodar `supabase projects list` depois de logar numa conta **não mostra** os projetos da outra conta.

**Sintoma enganoso**: comandos contra o projeto errado não falham com "projeto não encontrado" — falham com erro de permissão (403, `unexpected login role status`), parecendo problema de RLS/acesso quando na verdade é só a conta errada logada.

**Como aplicar**: antes de rodar qualquer comando `supabase`, se a sessão já tocou mais de um projeto do ecossistema, rodar `supabase projects list` primeiro e conferir se o projeto necessário aparece na lista. Se não aparecer, não é falta de permissão real — é a conta errada. Pedir ao usuário um token de acesso pessoal da conta certa (gerado em https://supabase.com/dashboard/account/tokens) e rodar `supabase login --token <token>`. Esse protocolo completo (incluindo boas práticas para reduzir o vaivém de login) está formalizado na skill `novus-ecosystem-cli` (`~/.claude/skills/novus-ecosystem-cli/SKILL.md`, restaurada em 2026-08-06 — ver [[machine_reset_2026-08]]) — carregar essa skill em vez de re-derivar isso só da memória.

Também relevante: `~/.claude/settings.json` tem uma seção `autoMode.allow` estabelecendo que trabalho cross-repo entre `novus-educacional`/`novusai-erp`/futuros satélites (PDV, frente de caixa, CRM) é autorizado — não é violação de escopo, evita que o classificador de auto-mode bloqueie repetidamente esse tipo de ação. Restaurada nesta máquina em 2026-08-06.
