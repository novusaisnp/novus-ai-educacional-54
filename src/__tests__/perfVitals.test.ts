
import { describe, it, expect, vi, beforeEach } from 'vitest'

type WebVitalMetric = { name: string; value: number; id: string }
type WebVitalCallback = (cb: (metric: WebVitalMetric) => void) => void

vi.mock('web-vitals', () => {
  return {
    onLCP: ((cb) => cb({ name: 'LCP', value: 2200, id: 'x' })) as WebVitalCallback,
    onCLS: ((cb) => cb({ name: 'CLS', value: 0.08, id: 'y' })) as WebVitalCallback,
    onINP: ((cb) => cb({ name: 'INP', value: 180, id: 'z' })) as WebVitalCallback,
    onFCP: ((cb) => cb({ name: 'FCP', value: 1500, id: 'a' })) as WebVitalCallback,
    onTTFB: ((cb) => cb({ name: 'TTFB', value: 700, id: 'b' })) as WebVitalCallback,
  }
})

vi.stubGlobal('navigator', { userAgent: 'UA', onLine: true })
vi.stubGlobal('document', { visibilityState: 'visible', referrer: '' } as unknown as Document)
vi.stubGlobal('window', { location: { pathname: '/teste' }, addEventListener: vi.fn() } as unknown as Window)

import { initPerfVitals } from '@/utils/perfVitals'

type WindowWithPerfInit = Window & { __NOVUS_PERF_INIT__?: boolean }

describe('perf vitals', () => {
  beforeEach(() => {
    (window as WindowWithPerfInit).__NOVUS_PERF_INIT__ = undefined
    window.__NOVUS_PERF__ = undefined
  })

  it('envia auditoria com métricas', () => {
    const send = vi.fn()
    initPerfVitals({ sampleRate: 1, sendFn: send })
    expect(send).toHaveBeenCalled()
    const events = send.mock.calls.map(c => c[0])
    expect(events.every((e: string) => e === 'perf_vitals')).toBe(true)
  })
})
