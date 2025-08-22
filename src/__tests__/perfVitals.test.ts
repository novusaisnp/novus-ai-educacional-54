
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('web-vitals', () => {
  return {
    onLCP: (cb: any) => cb({ name: 'LCP', value: 2200, id: 'x' }),
    onCLS: (cb: any) => cb({ name: 'CLS', value: 0.08, id: 'y' }),
    onINP: (cb: any) => cb({ name: 'INP', value: 180, id: 'z' }),
    onFCP: (cb: any) => cb({ name: 'FCP', value: 1500, id: 'a' }),
    onTTFB: (cb: any) => cb({ name: 'TTFB', value: 700, id: 'b' }),
  }
})

vi.stubGlobal('navigator', { userAgent: 'UA', onLine: true })
vi.stubGlobal('document', { visibilityState: 'visible', referrer: '' } as any)
vi.stubGlobal('window', { location: { pathname: '/teste' }, addEventListener: vi.fn() } as any)

import { initPerfVitals } from '@/utils/perfVitals'

describe('perf vitals', () => {
  beforeEach(() => {
    ;(window as any).__NOVUS_PERF_INIT__ = undefined
    ;(window as any).__NOVUS_PERF__ = undefined
  })

  it('envia auditoria com métricas', () => {
    const send = vi.fn()
    initPerfVitals({ sampleRate: 1, sendFn: send })
    expect(send).toHaveBeenCalled()
    const events = send.mock.calls.map(c => c[0])
    expect(events.every((e: string) => e === 'perf_vitals')).toBe(true)
  })
})
