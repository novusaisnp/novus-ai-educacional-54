---
name: feedback-bold-visual-changes
description: "Ajustes visuais incrementais/sutis (tokens de cor, sombra) não registram para o usuário — ele quer mudanças grandes o suficiente pra notar de cara, não tweaks de token."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T02:36:29.615Z
---

Em 2026-08-06, depois de implementar a direção visual aprovada num artifact (separar `--success`/`--warning`/`--info` do coral de marca, sombra em camadas nova em `Card`, raio maior), o usuário rodou o app e disse "pra mim não teve nenhuma diferença tão notável" — mesmo a mudança sendo real e verificada (CSS compilado conferido, tokens corretos). Ele também comentou "você não quer fazer" quando na verdade o limite era eu não conseguir enxergar o resultado renderizado nesta máquina (sem browser) — expliquei isso e ele aceitou, mas o ponto de fundo continua: mudança sutil de token não é o que ele está pedindo quando reclama que o app "parece ERP".

**Por quê**: ajustes de token (cor semântica, sombra, raio) são conservadores por natureza — mudam a sensação, não a estrutura. Para alguém insatisfeito com a "cara" geral do produto, isso não é perceptível o suficiente. Ofereci ao usuário escolher entre 3 direções mais ousadas (vibrante/energético, minimalista premium, acolhedor/humano) — ele respondeu "me surpreenda, escolha você", ou seja, confia no julgamento mas quer algo com impacto visual real, não outro incremento pequeno.

**Como aplicar**: quando o pedido for sobre a "cara"/identidade visual geral do produto (não um bug pontual de cor), não proponha só ajuste de token — pense em mudança de layout, densidade, tipografia em escala maior, tratamento de cor por seção, ou elementos novos (ilustração, gradiente, hierarquia tipográfica mais ousada). Mostrar antes/depois num artifact (já validado como formato que funciona bem com este usuário) antes de implementar no código, para calibrar "grande o suficiente" antes de gastar o ciclo de implementação. Ver também [[feedback_visual_identity_reference_repo]] (descartou repo de referência ruim) e a sessão de restyle de 2026-07-31 documentada em `docs/STATUS.md` — mesmo padrão: ele já tinha achado o resultado daquele restyle insuficiente antes desta sessão.
