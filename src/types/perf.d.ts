
export {}

declare global {
  interface Window {
    __NOVUS_PERF__?: {
      metrics: Record<string, any>
      subscribers: Array<() => void>
    }
  }
}
