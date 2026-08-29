export type AppTarget = 'staff' | 'familia' | undefined;

/**
 * Ausente no deploy combinado de sempre (educacional.novusai.app) — registra as
 * duas árvores de rota, como hoje. Definida nos dois novos projetos Vercel
 * (equipe/família, Fase 1 do split em PWAs instaláveis) — registra só a árvore
 * daquele alvo. Ver plano `fancy-painting-mochi.md`.
 */
export const APP_TARGET = import.meta.env.VITE_APP_TARGET as AppTarget;
