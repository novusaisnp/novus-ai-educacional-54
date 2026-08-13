import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.novus.educacional',
  appName: 'NOVUS.AI Educacional',
  webDir: 'dist',
  // Sem `server.url`: o app roda o bundle empacotado. Apontar pro dev server é
  // só pra depuração local e nunca pode ir pra loja.
  android: {
    // O WebView do Android não deve tratar o app como conteúdo web comum
    // (senão o pull-to-refresh recarrega a SPA inteira).
    allowMixedContent: false,
  },
};

export default config;
