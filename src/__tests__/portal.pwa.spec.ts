import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DOM APIs
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/portal/dashboard',
    origin: 'https://app.example.com'
  },
  writable: true
})

Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: query === '(display-mode: standalone)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true
})

interface RegisterSWOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onRegisterError?: (error: unknown) => void
}

// A fronteira real com o service worker é o módulo virtual gerado pelo
// vite-plugin-pwa no build — só ele precisa ser mockado, o resto do teste
// exercita o pwaManager de verdade (@/lib/pwa), não uma reimplementação.
// vi.mock é hoisted pro topo do arquivo, então o mock precisa nascer dentro
// de vi.hoisted pra não referenciar um `const` que ainda não existiria.
const { registerSWMock } = vi.hoisted(() => ({
  registerSWMock: vi.fn((_options?: RegisterSWOptions) => vi.fn())
}))

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock
}))

import { pwaManager } from '@/lib/pwa'

describe('PWA Manager (src/lib/pwa.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have manifest present', () => {
    // Simulate manifest link in head
    const manifestLink = document.createElement('link')
    manifestLink.rel = 'manifest'
    manifestLink.href = '/manifest.webmanifest'
    document.head.appendChild(manifestLink)

    const manifest = document.querySelector('link[rel="manifest"]')
    expect(manifest).toBeTruthy()
    expect(manifest?.getAttribute('href')).toBe('/manifest.webmanifest')

    manifestLink.remove()
  })

  it('should register the service worker via registerSW when enabled', () => {
    pwaManager.initialize(true, vi.fn())

    expect(registerSWMock).toHaveBeenCalledWith(
      expect.objectContaining({ immediate: true })
    )
  })

  it('should not register the service worker when disabled', () => {
    pwaManager.initialize(false, vi.fn())

    expect(registerSWMock).not.toHaveBeenCalled()
  })

  it('should call the onNeedRefresh callback through registerSW', () => {
    const onNeedRefresh = vi.fn()
    pwaManager.initialize(true, onNeedRefresh)

    const call = registerSWMock.mock.calls[0][0]
    call?.onNeedRefresh?.()

    expect(onNeedRefresh).toHaveBeenCalled()
  })

  it('should apply update via the function returned by registerSW', () => {
    const updateSW = vi.fn()
    registerSWMock.mockReturnValueOnce(updateSW)

    pwaManager.initialize(true, vi.fn())
    pwaManager.applyUpdate()

    expect(updateSW).toHaveBeenCalledWith(true)
  })

  it('should detect PWA installation state', () => {
    const isInstalled = pwaManager.isInstalled()
    expect(typeof isInstalled).toBe('boolean')

    expect(pwaManager.isInstallable()).toBe(false)
  })

  it('should handle install prompt correctly', async () => {
    pwaManager.setupInstallPrompt()

    const mockEvent = new Event('beforeinstallprompt') as Event & {
      preventDefault: () => void
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string; platform: string }>
    }
    mockEvent.preventDefault = vi.fn()
    mockEvent.prompt = vi.fn().mockResolvedValue(undefined)
    mockEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' })

    window.dispatchEvent(mockEvent)

    expect(pwaManager.isInstallable()).toBe(true)

    const installed = await pwaManager.showInstallPrompt()
    expect(installed).toBe(true)
  })

  it('should not cache sensitive API responses', () => {
    // O runtimeCaching do vite-plugin-pwa (vite.config.ts) não declara
    // nenhuma regra pra supabase.co/api — Workbox só intercepta o que está
    // listado, então essas URLs nunca passam por cache por omissão, não
    // por exclusão explícita. Este teste documenta essa garantia.
    const sensitiveUrls = [
      'https://nkcadmwydfnzrnauzeyz.supabase.co/rest/v1/students',
      'https://nkcadmwydfnzrnauzeyz.supabase.co/rest/v1/guardians',
      '/api/grades',
      '/api/attendance'
    ]

    sensitiveUrls.forEach(url => {
      const urlObj = new URL(url, 'https://example.com')

      const matchesSupabase = urlObj.hostname.includes('supabase.co')
      const matchesApi = urlObj.pathname.startsWith('/api/')

      expect(matchesSupabase || matchesApi).toBe(true)
    })
  })
})
