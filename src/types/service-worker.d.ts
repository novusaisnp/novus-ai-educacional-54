
/// <reference lib="webworker" />
export {}

declare global {
  // Tipar o escopo do SW
  const self: ServiceWorkerGlobalScope
}
