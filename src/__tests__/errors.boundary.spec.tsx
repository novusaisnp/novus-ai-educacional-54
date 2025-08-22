
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary'
import * as auditSafe from '@/utils/auditSafe'

// Mock the auditSafe module
vi.mock('@/utils/auditSafe', () => ({
  logAuditSafe: vi.fn()
}))

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('AppErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock console.error to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('should render children when no error occurs', () => {
    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AppErrorBoundary>
    )

    expect(screen.getByText('No error')).toBeInTheDocument()
  })

  it('should render error fallback when error occurs', () => {
    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>
    )

    expect(screen.getByText('Oops! Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('should call logAuditSafe when error occurs', () => {
    const logAuditSafeSpy = vi.mocked(auditSafe.logAuditSafe)

    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>
    )

    expect(logAuditSafeSpy).toHaveBeenCalledWith('ui_error', expect.objectContaining({
      message: 'Test error',
      pathname: expect.any(String),
      userAgent: expect.any(String),
      timestamp: expect.any(String)
    }))
  })

  it('should include safe user agent information in audit log', () => {
    const logAuditSafeSpy = vi.mocked(auditSafe.logAuditSafe)

    render(
      <AppErrorBoundary>
        <ThrowError shouldThrow={true} />
      </AppErrorBoundary>
    )

    const auditCall = logAuditSafeSpy.mock.calls[0]
    const payload = auditCall[1] as any
    
    // User agent should be truncated to 100 chars for safety
    expect(payload.userAgent.length).toBeLessThanOrEqual(100)
  })
})
