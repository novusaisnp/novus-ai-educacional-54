
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/utils/uxMetrics', () => ({
  getUxSnapshot: () => ({
    navEvents: [{ ts: '2025-08-21T00:00:00Z', from: '/a', to: '/b', routeChangeToPaint: 123, type: 'spa' }],
    assetErrors: [],
    unhandled: []
  }),
  subscribeUx: () => () => {}
}))

import { UxDiagnosticsCard } from '@/components/dev/UxDiagnosticsCard'

describe('UxDiagnosticsCard', () => {
  it('renderiza card UX Metrics', () => {
    render(<UxDiagnosticsCard />)
    expect(screen.getByText(/UX Metrics \(Rotas & Assets\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Change → Paint/)).toBeInTheDocument()
  })
})
