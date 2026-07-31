
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sanitizeAudit, logAuditSafe } from '@/utils/auditSafe'
import * as audit from '@/lib/audit'

// Mock the audit module
vi.mock('@/lib/audit', () => ({
  logAudit: vi.fn()
}))

describe('auditSafe utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sanitizeAudit', () => {
    it('should remove PII fields', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123456789',
        action: 'login',
        timestamp: '2024-01-01',
        data: {
          fullName: 'John Doe',
          cpf: '123.456.789-00',
          validField: 'keep this'
        }
      }

      const result = sanitizeAudit(input)

      expect(result).toEqual({
        action: 'login',
        timestamp: '2024-01-01',
        data: {
          validField: 'keep this'
        }
      })
    })

    it('should handle nested objects', () => {
      const input = {
        user: {
          name: 'Jane Doe',
          id: 'user123',
          preferences: {
            email: 'jane@example.com',
            theme: 'dark'
          }
        },
        action: 'update_profile'
      }

      const result = sanitizeAudit(input)

      expect(result).toEqual({
        user: {
          id: 'user123',
          preferences: {
            theme: 'dark'
          }
        },
        action: 'update_profile'
      })
    })

    it('should handle arrays', () => {
      const input = {
        users: [
          { name: 'John', id: '1' },
          { email: 'jane@example.com', id: '2' }
        ],
        action: 'bulk_update'
      }

      const result = sanitizeAudit(input)

      expect(result).toEqual({
        users: [
          { id: '1' },
          { id: '2' }
        ],
        action: 'bulk_update'
      })
    })

    it('should return empty object for non-objects', () => {
      expect(sanitizeAudit('string')).toEqual({})
      expect(sanitizeAudit(123)).toEqual({})
      expect(sanitizeAudit(null)).toEqual({})
      expect(sanitizeAudit(undefined)).toEqual({})
    })

    it('should preserve safe fields', () => {
      const input = {
        id: 'doc123',
        action: 'download',
        timestamp: '2024-01-01',
        pathname: '/portal/documentos',
        userAgent: 'Mozilla/5.0...',
        organizationId: 'org456'
      }

      const result = sanitizeAudit(input)

      expect(result).toEqual(input)
    })
  })

  describe('logAuditSafe', () => {
    it('should call logAudit with sanitized payload', async () => {
      const logAuditSpy = vi.mocked(audit.logAudit)
      
      const payload = {
        name: 'John Doe',
        action: 'login',
        id: 'user123'
      }

      await logAuditSafe('test_action', payload, 'org456')

      expect(logAuditSpy).toHaveBeenCalledWith({
        table_name: 'ui_events',
        action: 'test_action',
        diff: {
          action: 'login',
          id: 'user123'
        },
        organization_id: 'org456'
      })
    })

    it('should skip logging when organization_id is missing', async () => {
      const logAuditSpy = vi.mocked(audit.logAudit)

      await logAuditSafe('test_action', { action: 'test' })

      // organization_id é uma coluna uuid NOT NULL — sem org, não há como
      // gravar um audit_log válido, então logAudit nunca deve ser chamado.
      expect(logAuditSpy).not.toHaveBeenCalled()
    })

    it('should handle audit failures gracefully', async () => {
      const logAuditSpy = vi.mocked(audit.logAudit)
      logAuditSpy.mockRejectedValue(new Error('Audit failed'))

      // Should not throw
      await expect(logAuditSafe('test_action', {}, 'org456')).resolves.toBeUndefined()
    })
  })
})
