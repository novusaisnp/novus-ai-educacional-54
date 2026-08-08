
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals'
import { logAuditSafe } from '@/utils/auditSafe'

type PerfMetricPayload = {
  name: Metric['name']
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  id: string
  navigationType?: string
  pathname: string
  referrer?: string
  visibilityState?: string
  // metadados técnicos
  ua?: string
  swControlled?: boolean
  // versão opcional do SW se já existir comunicação
  swVersion?: string
}

const DEFAULT_SAMPLE_RATE = 0.25 // 25% por padrão
const QUEUE_KEY = 'novus_perf_queue_v1'

function nowISO() {
  try { return new Date().toISOString() } catch { return '' }
}

function getPathname() {
  try { return window.location?.pathname || '/' } catch { return '/' }
}

function getReferrerOrigin() {
  try {
    if (!document.referrer) return undefined
    const u = new URL(document.referrer)
    return u.origin
  } catch { return undefined }
}

function ratingFor(name: Metric['name'], value: number): 'good' | 'needs-improvement' | 'poor' {
  // Limiares Web Vitals (Google/Core Web Vitals)
  // LCP: good ≤ 2500, needs ≤ 4000
  // CLS: good ≤ 0.1, needs ≤ 0.25
  // INP: good ≤ 200, needs ≤ 500
  // FCP: (auxiliar) good ≤ 1800, needs ≤ 3000
  // TTFB: good ≤ 800, needs ≤ 1800
  switch (name) {
    case 'LCP': return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
    case 'CLS': return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
    case 'INP': return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
    case 'FCP': return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
    case 'TTFB': return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
    default: return 'good'
  }
}

function getNavType(): string | undefined {
  try {
    // PerformanceNavigationTiming disponível em browsers modernos
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return nav?.type
  } catch { return undefined }
}

function getUAshort() {
  try {
    const ua = navigator.userAgent || ''
    // encurta UA para reduzir ruído/PII
    return ua.slice(0, 60)
  } catch { return undefined }
}

function enqueue(payload: any) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.push({ ...payload, ts: nowISO() })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr))
  } catch { /* no-op */ }
}

function flushQueue(send: (e: string, p: any) => void) {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const arr = JSON.parse(raw)
    for (const item of arr) send('perf_vitals', item)
    localStorage.removeItem(QUEUE_KEY)
  } catch { /* no-op */ }
}

function shouldSample(sampleRate: number) {
  try { return Math.random() < sampleRate } catch { return true }
}

// Singleton simples para expor últimos valores à UI (Diagnostics)
function getStore() {
  if (!window.__NOVUS_PERF__) {
    window.__NOVUS_PERF__ = { metrics: {}, subscribers: [] }
  }
  return window.__NOVUS_PERF__
}

function publish(metric: Metric) {
  const store = getStore()
  store.metrics[metric.name] = metric
  for (const cb of store.subscribers) cb()
}

export function subscribePerf(cb: () => void) {
  const store = getStore()
  store.subscribers.push(cb)
  return () => {
    const i = store.subscribers.indexOf(cb)
    if (i >= 0) store.subscribers.splice(i, 1)
  }
}

export function getCurrentPerfMetrics(): Record<string, Metric | undefined> {
  return { ...(getStore().metrics as any) }
}

type InitOptions = {
  sampleRate?: number // 0..1
  sendFn?: (event: string, payload: any) => void
}

export function initPerfVitals(opts: InitOptions = {}) {
  if (typeof window === 'undefined') return
  if ((window as any).__NOVUS_PERF_INIT__) return
  ;(window as any).__NOVUS_PERF_INIT__ = true

  const sampleRate = typeof opts.sampleRate === 'number' ? opts.sampleRate : DEFAULT_SAMPLE_RATE
  const send = opts.sendFn || ((e, p) => logAuditSafe(e, p))

  // Flush ao voltar online
  window.addEventListener('online', () => flushQueue(send))

  function sendMetric(metric: Metric) {
    publish(metric)
    if (!shouldSample(sampleRate)) return
    const payload: PerfMetricPayload = {
      name: metric.name,
      value: metric.value,
      rating: ratingFor(metric.name, metric.value),
      id: metric.id,
      navigationType: getNavType(),
      pathname: getPathname(),
      referrer: getReferrerOrigin(),
      visibilityState: document.visibilityState,
      ua: getUAshort(),
      swControlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
    }
    try { send('perf_vitals', payload) } catch { enqueue(payload) }
  }

  // Registrar Web Vitals
  try {
    onLCP(sendMetric)
    onCLS(sendMetric)
    onINP(sendMetric)
    onFCP(sendMetric)
    onTTFB(sendMetric)
  } catch (e) {
    // falha silenciosa, não bloquear app
  }
}
