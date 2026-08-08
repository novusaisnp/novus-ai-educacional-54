
export {}

declare global {
  interface Window {
    __NOVUS_PERF__?: {
      metrics: Record<string, unknown>
      subscribers: Array<() => void>
    }
  }
}
