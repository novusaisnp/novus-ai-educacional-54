import type { CapacitorConfig } from '@capacitor/cli';

// Addendum de casca nativa da Fase 1 (plano fancy-painting-mochi.md) — espelha
// o split web (VITE_APP_TARGET=staff) num app Capacitor próprio. Build real:
// `VITE_APP_TARGET=staff bun run build` antes de sincronizar, já que webDir
// aponta pro mesmo `dist/` de sempre.
const config: CapacitorConfig = {
  appId: 'ai.novus.educacional.equipe',
  appName: 'NOVUS.AI Equipe',
  webDir: 'dist',
  ios: {
    path: 'ios-equipe',
  },
  android: {
    path: 'android-equipe',
    allowMixedContent: false,
  },
};

export default config;
