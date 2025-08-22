
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/utils/perfVitals', () => ({
  getCurrentPerfMetrics: () => ({
    LCP: { name: 'LCP', value: 2200, id: 'x' },
    CLS: { name: 'CLS', value: 0.08, id: 'y' },
  }),
  subscribePerf: () => () => {},
}))

import { PerfDiagnosticsCard } from '@/components/dev/PerfDiagnosticsCard'

describe('PerfDiagnosticsCard', () => {
  it('renderiza valores básicos', () => {
    render(<PerfDiagnosticsCard />)
    expect(screen.getByText(/Performance \(Web Vitals\)/i)).toBeInTheDocument()
    expect(screen.getByText(/LCP/)).toBeInTheDocument()
    expect(screen.getByText(/CLS/)).toBeInTheDocument()
  })
})
