
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('performance', { now: () => 1000, getEntriesByType: () => [] } as unknown as Performance)
vi.stubGlobal('navigator', { serviceWorker: {}, userAgent: 'UA', onLine: true } as unknown as Navigator)
vi.stubGlobal('document', { visibilityState: 'visible' } as unknown as Document)
vi.stubGlobal('window', {
  location: { pathname: '/a' },
  addEventListener: vi.fn(),
  requestAnimationFrame: ((cb: FrameRequestCallback) => cb(1016)) as Window['requestAnimationFrame'],
} as unknown as Window)

import { markRouteChangeStart, measureRouteChange, auditInitialNavigation } from '@/utils/uxMetrics'

describe('uxMetrics', () => {
  beforeEach(() => { window.__NOVUS_UX__ = undefined })
  it('audita navegação inicial sem quebrar', () => {
    expect(() => auditInitialNavigation()).not.toThrow()
  })
  it('mede navegação SPA e não quebra', () => {
    markRouteChangeStart()
    expect(() => measureRouteChange('/b','/a','PUSH')).not.toThrow()
  })
})
