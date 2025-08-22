
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('performance', { now: () => 1000, getEntriesByType: () => [] } as any)
vi.stubGlobal('navigator', { serviceWorker: {}, userAgent: 'UA', onLine: true } as any)
vi.stubGlobal('document', { visibilityState: 'visible' } as any)
vi.stubGlobal('window', { location: { pathname: '/a' }, addEventListener: vi.fn(), requestAnimationFrame: (cb: any) => cb(1016) } as any)

import { markRouteChangeStart, measureRouteChange, auditInitialNavigation } from '@/utils/uxMetrics'

describe('uxMetrics', () => {
  beforeEach(() => { (window as any).__NOVUS_UX__ = undefined })
  it('audita navegação inicial sem quebrar', () => {
    expect(() => auditInitialNavigation()).not.toThrow()
  })
  it('mede navegação SPA e não quebra', () => {
    markRouteChangeStart()
    expect(() => measureRouteChange('/b','/a','PUSH')).not.toThrow()
  })
})
