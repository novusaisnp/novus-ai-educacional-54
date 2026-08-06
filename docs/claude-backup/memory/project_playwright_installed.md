---
name: project-playwright-installed
description: "Playwright + Chromium instalados nesta máquina (2026-08-06) — resolve o gap de \"sem chromium-cli\" registrado antes na sessão; tem uma armadilha real com o WebSocket de HMR do Vite."
metadata: 
  node_type: memory
  type: project
  originSessionId: 295a8512-4170-46ac-986b-5337d06a3466
  modified: 2026-08-06T02:36:08.966Z
---

Nesta máquina (reconstruída em 2026-08-06, ver [[machine_reset_2026-08]]), não havia `chromium-cli` nem nenhum tooling de browser headless — as verificações de feature dessa sessão (recuperação/progressão parcial, ata de conselho de classe) tiveram que ser feitas via SQL direto no banco, replicando a lógica dos hooks, em vez de clicar na UI de verdade.

**Resolvido nesta sessão**: `bunx playwright install chromium` funciona nesta máquina e baixa um Chromium funcional (`chrome-headless-shell`, ~115MB, em `C:\Users\maxwe\AppData\Local\ms-playwright\`). O pacote `playwright` em si só fica disponível via `bunx`/cache do bun — rodar um script `.mjs` que faz `import { chromium } from 'playwright'` com `node` direto falha (`ERR_MODULE_NOT_FOUND`, porque o node não enxerga o cache de resolução do bun); **rodar com `bun script.mjs` em vez de `node script.mjs`** resolve.

**Armadilha real encontrada**: `page.goto(url, { waitUntil: 'networkidle' })` contra o dev server do Vite (`bun run dev`) **trava indefinidamente** — o Vite mantém uma conexão WebSocket aberta pro HMR (hot module reload), então a rede nunca fica "ociosa" de verdade. Usar `waitUntil: 'load'` ou `'domcontentloaded'`, ou esperar por um seletor específico da página (`page.waitForSelector(...)`), nunca `'networkidle'` contra um dev server Vite rodando.

**Como aplicar**: numa sessão futura que precise verificar UI de verdade neste projeto (em vez de só via SQL/banco), usar Playwright+Chromium já instalados aqui — não precisa reinstalar. Lembrar de rodar com `bun`, não `node`, e nunca usar `networkidle` contra o Vite dev server.
