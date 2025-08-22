
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PWAProvider, usePWA } from '@/components/pwa/PWAProvider'
import * as auditSafe from '@/utils/auditSafe'

// Mock the auditSafe module
vi.mock('@/utils/auditSafe', () => ({
  logAuditSafe: vi.fn()
}))

// Mock pwaManager
vi.mock('@/portal/pwa', () => ({
  pwaManager: {
    initializeForPortal: vi.fn(),
    isInstallable: vi.fn(() => false),
    showInstallPrompt: vi.fn(() => Promise.resolve(true))
  }
}))

// Test component that uses PWA context
const TestComponent = () => {
  const { canInstall, isOnline, hasUpdate, install } = usePWA()
  
  return (
    <div>
      <div data-testid="can-install">{canInstall.toString()}</div>
      <div data-testid="is-online">{isOnline.toString()}</div>
      <div data-testid="has-update">{hasUpdate.toString()}</div>
      <button onClick={install}>Install</button>
    </div>
  )
}

// Mock window location
Object.defineProperty(window, 'location', {
  value: {
    pathname: '/portal/dashboard'
  },
  writable: true
})

describe('PWAProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })

    // Mock service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        controller: {
          postMessage: vi.fn()
        }
      },
      configurable: true
    })
  })

  it('should provide PWA context values', () => {
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    expect(screen.getByTestId('can-install')).toHaveTextContent('false')
    expect(screen.getByTestId('is-online')).toHaveTextContent('true')
    expect(screen.getByTestId('has-update')).toHaveTextContent('false')
  })

  it('should handle install prompt event', async () => {
    const logAuditSafeSpy = vi.mocked(auditSafe.logAuditSafe)

    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    // Simulate beforeinstallprompt event
    const mockEvent = new Event('beforeinstallprompt')
    mockEvent.preventDefault = vi.fn()
    
    fireEvent(window, mockEvent)

    await waitFor(() => {
      expect(logAuditSafeSpy).toHaveBeenCalledWith('pwa_event', {
        type: 'install_prompt_shown',
        pathname: '/portal/dashboard'
      })
    })
  })

  it('should handle online/offline events', async () => {
    const logAuditSafeSpy = vi.mocked(auditSafe.logAuditSafe)

    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    // Simulate going offline
    fireEvent(window, new Event('offline'))

    await waitFor(() => {
      expect(screen.getByTestId('is-online')).toHaveTextContent('false')
      expect(logAuditSafeSpy).toHaveBeenCalledWith('pwa_event', {
        type: 'offline',
        pathname: '/portal/dashboard'
      })
    })

    // Simulate going online
    fireEvent(window, new Event('online'))

    await waitFor(() => {
      expect(screen.getByTestId('is-online')).toHaveTextContent('true')
      expect(logAuditSafeSpy).toHaveBeenCalledWith('pwa_event', {
        type: 'online',
        pathname: '/portal/dashboard'
      })
    })
  })

  it('should not initialize when disabled', () => {
    const { pwaManager } = require('@/portal/pwa')
    
    render(
      <PWAProvider enabled={false}>
        <TestComponent />
      </PWAProvider>
    )

    expect(pwaManager.initializeForPortal).not.toHaveBeenCalled()
  })

  it('should not initialize outside portal routes', () => {
    window.location.pathname = '/app/dashboard'
    const { pwaManager } = require('@/portal/pwa')
    
    render(
      <PWAProvider>
        <TestComponent />
      </PWAProvider>
    )

    expect(pwaManager.initializeForPortal).not.toHaveBeenCalled()
  })
})
