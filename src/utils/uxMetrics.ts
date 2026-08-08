
/* eslint-disable @typescript-eslint/no-explicit-any */
import { logAuditSafe } from '@/utils/auditSafe'

type UxNavPayload = {
  type: 'spa' | 'initial'
  from?: string
  to: string
  navAction?: 'PUSH' | 'POP' | 'REPLACE' | 'UNKNOWN'
  // tempos em ms
  routeChangeToPaint?: number
  marks?: Record<string, number>
  pathname: string
  visibilityState?: string
  swControlled?: boolean
}

type AssetErrorPayload = {
  kind: 'asset_error'
  resourceType: 'img' | 'script' | 'link' | 'other'
  url?: string // sem querystring
  pathname: string
}

type UnhandledPayload = {
  kind: 'unhandled_rejection'
  reason?: string
  pathname: string
}

const SAMPLE_NAV = 0.5 // 50% de navegações
const SAMPLE_ASSET = 0.5
const QUEUE_KEY = 'novus_ux_queue_v1'
const SESSION_LIMIT = 30

function shouldSample(rate: number) {
  try { return Math.random() < rate } catch { return true }
}

function now() { try { return performance.now() } catch { return 0 } }
function nowISO() { try { return new Date().toISOString() } catch { return '' } }

function stripQuery(u?: string) {
  if (!u) return undefined
  try {
    const url = new URL(u, window.location.origin)
    return url.origin + url.pathname // sem search/hash
  } catch { return u.split('?')[0].split('#')[0] }
}

function getPathname() {
  try { return window.location?.pathname || '/' } catch { return '/' }
}

function enqueue(event: string, payload: any) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.push({ event, payload, ts: nowISO() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr))
  } catch { /* no-op */ }
}

function flushQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const arr = JSON.parse(raw)
    for (const item of arr) logAuditSafe(item.event, item.payload)
    localStorage.removeItem(QUEUE_KEY)
  } catch { /* no-op */ }
}

// Store simples para última sessão (diagnostics) e para limitar volume
declare global {
  interface Window {
    __NOVUS_UX__?: {
      navEvents: Array<UxNavPayload & { ts: string }>
      assetErrors: Array<AssetErrorPayload & { ts: string }>
      unhandled: Array<UnhandledPayload & { ts: string }>
      count: number
      subscribers: Array<() => void>
    }
  }
}

function store() {
  if (!window.__NOVUS_UX__) {
    window.__NOVUS_UX__ = { navEvents: [], assetErrors: [], unhandled: [], count: 0, subscribers: [] }
  }
  return window.__NOVUS_UX__
}

function publish() {
  const s = store()
  for (const cb of s.subscribers) cb()
}

export function subscribeUx(cb: () => void) {
  const s = store()
  s.subscribers.push(cb)
  return () => {
    const i = s.subscribers.indexOf(cb)
    if (i >= 0) s.subscribers.splice(i, 1)
  }
}

export function getUxSnapshot() {
  const s = store()
  return {
    navEvents: [...s.navEvents],
    assetErrors: [...s.assetErrors],
    unhandled: [...s.unhandled]
  }
}

function boundedPush<T extends object>(arr: Array<T>, item: T, max = 50) {
  arr.push(item)
  if (arr.length > max) arr.shift()
}

function safeSend(event: string, payload: any) {
  const s = store()
  if (s.count >= SESSION_LIMIT) return // cap por sessão
  try {
    logAuditSafe(event, payload)
  } catch {
    enqueue(event, payload)
  } finally {
    s.count++
  }
}

// Flush quando voltar online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flushQueue())
}

// ---------- Inicial (page load) ----------
export function auditInitialNavigation() {
  if (typeof window === 'undefined') return
  if (!shouldSample(SAMPLE_NAV)) return
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const payload: UxNavPayload = {
      type: 'initial',
      to: getPathname(),
      pathname: getPathname(),
      visibilityState: document.visibilityState,
      swControlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      marks: nav ? {
        domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
        load: nav.loadEventEnd - nav.startTime,
        responseStart: nav.responseStart - nav.startTime,
        ttfb: nav.responseStart - nav.startTime
      } : undefined
    }
    const withTs = { ...payload, ts: nowISO() }
    boundedPush(store().navEvents, withTs)
    publish()
    safeSend('ux_page_load', payload)
  } catch { /* no-op */ }
}

// ---------- SPA (route change → first paint) ----------
let pendingNavStart = 0
export function markRouteChangeStart() {
  if (typeof window === 'undefined') return
  pendingNavStart = now()
}

// mede após ~2 frames para garantir paint
export function measureRouteChange(to: string, from?: string, navAction?: 'PUSH' | 'POP' | 'REPLACE' | 'UNKNOWN') {
  if (typeof window === 'undefined') return
  const start = pendingNavStart || now()
  const raf = window.requestAnimationFrame || ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16))
  raf(() => {
    raf(() => {
      const dur = Math.max(0, now() - start)
      const payload: UxNavPayload = {
        type: 'spa',
        from,
        to,
        navAction,
        routeChangeToPaint: Math.round(dur),
        pathname: to,
        visibilityState: document.visibilityState,
        swControlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
      }
      const withTs = { ...payload, ts: nowISO() }
      boundedPush(store().navEvents, withTs)
      publish()
      if (shouldSample(SAMPLE_NAV)) safeSend('ux_nav', payload)
      pendingNavStart = 0
    })
  })
}

// ---------- Asset errors & unhandled rejections ----------
export function initAssetAndUnhandledCapture() {
  if (typeof window === 'undefined') return
  // asset loading errors (captura no capture phase)
  window.addEventListener('error', (e: Event) => {
    const t = e.target as any
    if (!t || !(t instanceof HTMLElement)) return
    let resourceType: AssetErrorPayload['resourceType'] = 'other'
    let url: string | undefined
    if (t instanceof HTMLImageElement) { resourceType = 'img'; url = t.currentSrc || t.src }
    else if (t instanceof HTMLScriptElement) { resourceType = 'script'; url = t.src }
    else if (t instanceof HTMLLinkElement) { resourceType = 'link'; url = t.href }
    else { resourceType = 'other' }
    const payload: AssetErrorPayload = {
      kind: 'asset_error',
      resourceType,
      url: stripQuery(url),
      pathname: getPathname()
    }
    const withTs = { ...payload, ts: nowISO() }
    boundedPush(store().assetErrors, withTs)
    publish()
    if (shouldSample(SAMPLE_ASSET)) safeSend('asset_error', payload)
  }, true)

  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    let reason: string | undefined
    try {
      const r: any = e.reason
      if (r instanceof Error) reason = r.message?.slice(0, 180)
      else if (typeof r === 'string') reason = r.slice(0, 180)
      else reason = JSON.stringify(r).slice(0, 180)
    } catch { /* no-op */ }
    const payload: UnhandledPayload = {
      kind: 'unhandled_rejection',
      reason,
      pathname: getPathname()
    }
    const withTs = { ...payload, ts: nowISO() }
    boundedPush(store().unhandled, withTs)
    publish()
    safeSend('unhandled_rejection', payload)
  })
}
