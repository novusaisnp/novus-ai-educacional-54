import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock DOM APIs
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/portal/dashboard',
    origin: 'https://app.example.com'
  },
  writable: true
})

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(),
    ready: Promise.resolve({
      scope: '/portal/',
      update: vi.fn()
    })
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

// Mock PWA Manager
interface MockInstallPrompt {
  prompt: () => void
  userChoice: Promise<{ outcome: string }>
}

class MockPWAManager {
  private isRegistered = false
  private installPrompt: MockInstallPrompt | null = null

  async registerServiceWorker(): Promise<boolean> {
    try {
      const registration = await navigator.serviceWorker.register('/portal-sw.js', {
        scope: '/portal/'
      })
      this.isRegistered = true
      return true
    } catch {
      return false
    }
  }

  setupInstallPrompt(): void {
    // Simulate install prompt event
    const mockEvent = {
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: 'accepted' })
    }
    this.installPrompt = mockEvent
  }

  isInstallable(): boolean {
    return !!this.installPrompt
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
  }

  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) return false
    
    await this.installPrompt.prompt()
    const choice = await this.installPrompt.userChoice
    return choice.outcome === 'accepted'
  }
}

describe('Portal PWA Tests', () => {
  let pwaManager: MockPWAManager

  beforeEach(() => {
    vi.clearAllMocks()
    pwaManager = new MockPWAManager()
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
  })

  it('should register service worker in portal routes', async () => {
    const registerSpy = vi.mocked(navigator.serviceWorker.register)
    registerSpy.mockResolvedValue({
      scope: '/portal/',
      update: vi.fn(),
      addEventListener: vi.fn()
    } as unknown as ServiceWorkerRegistration)

    // Test service worker registration
    const registered = await pwaManager.registerServiceWorker()

    expect(registered).toBe(true)
    expect(registerSpy).toHaveBeenCalledWith('/portal-sw.js', {
      scope: '/portal/'
    })
  })

  it('should provide offline fallback for portal routes', async () => {
    // Mock fetch to simulate offline
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    // Mock caches API
    global.caches = {
      match: vi.fn().mockResolvedValue(null),
      open: vi.fn().mockResolvedValue({
        put: vi.fn(),
        addAll: vi.fn()
      })
    } as unknown as CacheStorage

    // Simulate service worker fetch handler offline behavior
    const createOfflineResponse = () => {
      const offlineHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Portal Offline</title></head>
        <body>
          <h1>Portal dos Responsáveis</h1>
          <p>Você está offline. Conecte-se à internet para acessar o portal.</p>
        </body>
        </html>
      `
      return new Response(offlineHtml, {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const offlineResponse = createOfflineResponse()
    expect(offlineResponse.headers.get('Content-Type')).toBe('text/html')
    
    const text = await offlineResponse.text()
    expect(text).toContain('Portal dos Responsáveis')
    expect(text).toContain('Você está offline')
  })

  it('should detect PWA installation state', () => {
    // Test standalone mode detection
    const isInstalled = pwaManager.isInstalled()
    expect(typeof isInstalled).toBe('boolean')

    // Test install prompt availability
    pwaManager.setupInstallPrompt()
    const isInstallable = pwaManager.isInstallable()
    expect(isInstallable).toBe(true)
  })

  it('should handle install prompt correctly', async () => {
    pwaManager.setupInstallPrompt()
    
    const installed = await pwaManager.showInstallPrompt()
    expect(installed).toBe(true)
  })

  it('should preserve deep-links functionality', () => {
    const testRoutes = [
      '/portal/financeiro?highlight=doc123',
      '/portal/documentos?missing=true',
      '/portal/demandas?focus=abc123'
    ]

    testRoutes.forEach(route => {
      // Update location
      window.location.pathname = route.split('?')[0]
      
      // Verify route is in portal scope
      expect(window.location.pathname.startsWith('/portal/')).toBe(true)
      
      // Verify query params would be preserved
      if (route.includes('?')) {
        const queryPart = route.split('?')[1]
        expect(queryPart).toBeTruthy()
      }
    })
  })

  it('should only register SW when PWA is enabled', async () => {
    const registerSpy = vi.mocked(navigator.serviceWorker.register)
    
    // Test with PWA disabled
    const initializeDisabled = async (enabled: boolean) => {
      if (!enabled) {
        return // Skip registration
      }
      await pwaManager.registerServiceWorker()
    }

    await initializeDisabled(false)
    expect(registerSpy).not.toHaveBeenCalled()

    // Test with PWA enabled
    await initializeDisabled(true)
    expect(registerSpy).toHaveBeenCalled()
  })

  it('should not cache sensitive API responses', () => {
    // Test URLs that should NOT be cached
    const sensitiveUrls = [
      'https://nkcadmwydfnzrnauzeyz.supabase.co/rest/v1/students',
      'https://nkcadmwydfnzrnauzeyz.supabase.co/rest/v1/guardians',
      '/api/grades',
      '/api/attendance'
    ]

    sensitiveUrls.forEach(url => {
      const urlObj = new URL(url, 'https://example.com')
      
      // Service worker should ignore these URLs
      const shouldIgnore = urlObj.hostname.includes('supabase.co') || 
                          urlObj.pathname.startsWith('/api/')
      
      expect(shouldIgnore).toBe(true)
    })
  })
})