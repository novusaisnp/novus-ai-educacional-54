
import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { auditInitialNavigation, initAssetAndUnhandledCapture, markRouteChangeStart, measureRouteChange } from '@/utils/uxMetrics'

function navTypeToAction(t: ReturnType<typeof useNavigationType>): 'PUSH'|'POP'|'REPLACE'|'UNKNOWN' {
  if (t === 'PUSH' || t === 'POP' || t === 'REPLACE') return t
  return 'UNKNOWN'
}

export default function RoutePerfObserver() {
  const location = useLocation()
  const navType = useNavigationType()
  const prevPath = useRef<string | undefined>(undefined)

  useEffect(() => {
    // inicial (page load) + asset/unhandled capturers
    auditInitialNavigation()
    initAssetAndUnhandledCapture()
  }, [])

  // marca início quando a rota vai mudar (heurística simples: observar pathname anterior)
  useEffect(() => {
    markRouteChangeStart()
  }, [location.pathname])

  // mede após paint da nova rota
  useEffect(() => {
    const from = prevPath.current
    const to = location.pathname
    const action = navTypeToAction(navType)
    measureRouteChange(to, from, action)
    prevPath.current = to
  }, [location.key]) // key muda a cada navegação

  return null
}
