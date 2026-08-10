// Stub pro módulo virtual "virtual:pwa-register" (só existe de verdade via
// o plugin vite-plugin-pwa no build/dev real). Vitest usa um config próprio
// sem esse plugin, então precisa de um alvo resolvível pra transformar o
// import — testes que precisam do comportamento real mockam esse specifier
// explicitamente com vi.mock('virtual:pwa-register', ...).
export function registerSW(_options?: unknown): (reloadPage?: boolean) => Promise<void> {
  return async () => {};
}
