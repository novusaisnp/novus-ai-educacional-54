
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUxSnapshot, subscribeUx } from '@/utils/uxMetrics'

function ms(n?: number) { return n == null ? '—' : `${Math.round(n)} ms` }

export function UxDiagnosticsCard() {
  const [snap, setSnap] = useState(getUxSnapshot())
  useEffect(() => {
    const u = subscribeUx(() => setSnap(getUxSnapshot()))
    return u
  }, [])
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          UX Metrics (Rotas & Assets)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Últimas navegações (sessão)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {snap.navEvents.slice(-6).reverse().map((e, i) => (
                <div key={i} className="rounded-2xl border p-3">
                  <div className="text-xs opacity-70">{e.ts}</div>
                  <div className="text-sm">De: <span className="font-mono">{e.from ?? '—'}</span></div>
                  <div className="text-sm">Para: <span className="font-mono">{e.to}</span> <span className="opacity-70">({e.navAction ?? e.type})</span></div>
                  <div className="text-sm">Change → Paint: <span className="font-semibold">{ms(e.routeChangeToPaint)}</span></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Erros de assets (sessão)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {snap.assetErrors.slice(-6).reverse().map((a, i) => (
                <div key={i} className="rounded-2xl border p-3">
                  <div className="text-xs opacity-70">{a.ts}</div>
                  <div className="text-sm">Tipo: <span className="font-mono">{a.resourceType}</span></div>
                  <div className="text-sm break-all">URL: <span className="opacity-80">{a.url ?? '—'}</span></div>
                </div>
              ))}
              {snap.assetErrors.length === 0 && (
                <div className="text-xs opacity-70">Sem registros nesta sessão.</div>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Promessas não tratadas (sessão)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {snap.unhandled.slice(-6).reverse().map((u, i) => (
                <div key={i} className="rounded-2xl border p-3">
                  <div className="text-xs opacity-70">{u.ts}</div>
                  <div className="text-sm break-all">{u.reason ?? '—'}</div>
                </div>
              ))}
              {snap.unhandled.length === 0 && (
                <div className="text-xs opacity-70">Sem registros nesta sessão.</div>
              )}
            </div>
          </div>
          <div className="text-xs opacity-70">
            Amostragem ativa. Sem PII. Eventos são limitados por sessão e enfileirados offline para envio posterior.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
