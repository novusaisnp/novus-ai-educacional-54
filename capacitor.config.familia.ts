import type { CapacitorConfig } from '@capacitor/cli';

// Addendum de casca nativa da Fase 1 (plano fancy-painting-mochi.md) — espelha
// o split web (VITE_APP_TARGET=familia) num app Capacitor próprio. Build real:
// `VITE_APP_TARGET=familia bun run build` antes de sincronizar, já que webDir
// aponta pro mesmo `dist/` de sempre.
const config: CapacitorConfig = {
  appId: 'ai.novus.educacional.familia',
  appName: 'NOVUS.AI Família',
  webDir: 'dist',
  ios: {
    path: 'ios-familia',
  },
  android: {
    path: 'android-familia',
    allowMixedContent: false,
  },
};

export default config;
