import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { fileURLToPath, URL } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'

// Fase 1 do split em duas PWAs instaláveis (equipe vs família) — ver plano
// `fancy-painting-mochi.md`. Sem VITE_APP_TARGET definida (deploy atual,
// educacional.novusai.app), o comportamento é idêntico ao de sempre: um só
// manifest combinado, start_url '/m' despachando por papel. Com a var
// definida (novos projetos Vercel "equipe"/"familia"), o manifest aponta
// direto pra árvore de rota daquele alvo, sem passar pelo dispatcher.
type AppTarget = 'staff' | 'familia' | undefined
const APP_TARGET = process.env.VITE_APP_TARGET as AppTarget

const MANIFEST_BY_TARGET: Record<'staff' | 'familia', { name: string; short_name: string; start_url: string }> = {
  staff: { name: 'NOVUS.AI Equipe', short_name: 'Novus Equipe', start_url: '/app/dashboard' },
  familia: { name: 'NOVUS.AI Família', short_name: 'Novus Família', start_url: '/portal/dashboard' },
}
const targetManifest = APP_TARGET ? MANIFEST_BY_TARGET[APP_TARGET] : null
const appTitle = targetManifest?.name ?? 'NOVUS.AI Educacional'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    {
      name: 'app-title-by-target',
      transformIndexHtml(html) {
        return html.replaceAll('NOVUS.AI Educacional', appTitle)
      },
    },
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: targetManifest?.name ?? 'NOVUS.AI Educacional',
        short_name: targetManifest?.short_name ?? 'Novus Educacional',
        description: 'Sistema educacional completo com portal para responsáveis',
        theme_color: '#0f8a7d',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        // Instalada na tela de início (o caminho do iOS enquanto não há app
        // nativo), a PWA abre a pele de app, não a landing. Build combinado
        // (var ausente): /m despacha por papel, staff cai na chamada,
        // responsável no início da família. Build por-alvo: entra direto na
        // árvore daquele alvo, sem passar pelo dispatcher.
        start_url: targetManifest?.start_url ?? '/m',
        lang: 'pt-BR',
        categories: ['education', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,ttf,eot}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}));
