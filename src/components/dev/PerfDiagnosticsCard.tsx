
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getCurrentPerfMetrics, subscribePerf } from '@/utils/perfVitals'

type Row = { label: string; value?: number; unit: string; status: 'good'|'needs-improvement'|'poor'|'na' }

function classify(name: string, v?: number): Row['status'] {
  if (v == null) return 'na'
  switch (name) {
    case 'LCP': return v <= 2500 ? 'good' : v <= 4000 ? 'needs-improvement' : 'poor'
    case 'CLS': return v <= 0.1 ? 'good' : v <= 0.25 ? 'needs-improvement' : 'poor'
    case 'INP': return v <= 200 ? 'good' : v <= 500 ? 'needs-improvement' : 'poor'
    case 'FCP': return v <= 1800 ? 'good' : v <= 3000 ? 'needs-improvement' : 'poor'
    case 'TTFB': return v <= 800 ? 'good' : v <= 1800 ? 'needs-improvement' : 'poor'
    default: return 'na'
  }
}

function fmt(n?: number, unit = 'ms') {
  if (n == null) return '—'
  return unit === '' ? String(n) : `${Math.round(n)} ${unit}`
}

function badge(status: Row['status']) {
  if (status === 'good') return '✅'
  if (status === 'needs-improvement') return '⚠️'
  if (status === 'poor') return '❌'
  return '—'
}

export function PerfDiagnosticsCard() {
  const [v, setV] = useState(getCurrentPerfMetrics())
  
  useEffect(() => {
    const u = subscribePerf(() => setV(getCurrentPerfMetrics()))
    return u
  }, [])
  
  const rows: Array<Row & { key: string }> = [
    { key: 'LCP', label: 'LCP (Largest Contentful Paint)', value: v.LCP?.value, unit: 'ms', status: classify('LCP', v.LCP?.value) },
    { key: 'CLS', label: 'CLS (Cumulative Layout Shift)', value: v.CLS?.value, unit: '', status: classify('CLS', v.CLS?.value) },
    { key: 'INP', label: 'INP (Interaction to Next Paint)', value: v.INP?.value, unit: 'ms', status: classify('INP', v.INP?.value) },
    { key: 'FCP', label: 'FCP (First Contentful Paint)', value: v.FCP?.value, unit: 'ms', status: classify('FCP', v.FCP?.value) },
    { key: 'TTFB', label: 'TTFB (Time to First Byte)', value: v.TTFB?.value, unit: 'ms', status: classify('TTFB', v.TTFB?.value) },
  ]
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Performance (Web Vitals)
          <a className="text-xs underline opacity-70" href="https://web.dev/articles/vitals" target="_blank" rel="noreferrer">
            Saiba mais
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(r => (
            <div key={r.key} className="rounded-2xl border p-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-xs opacity-70">
                  {r.key === 'CLS' ? 'Meta: ≤ 0.1 (bom), ≤ 0.25 (ajuste)' : 'Meta: ver doc'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{fmt(r.value, r.unit)}</div>
                <div className="text-xl">{badge(r.status)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs opacity-70 mt-3">
          Amostragem ativa. Métricas desta sessão são exibidas; auditoria envia valores agregados sem PII.
        </div>
      </CardContent>
    </Card>
  )
}
