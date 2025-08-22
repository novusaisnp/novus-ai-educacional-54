// Portal dos Responsáveis - Service Worker
// Apenas cache básico para assets e rotas do portal, sem dados sensíveis

const CACHE_NAME = 'portal-v1';
const STATIC_CACHE = 'portal-static-v1';

// Assets para cache
const STATIC_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Rotas do portal para NetworkFirst
const PORTAL_ROUTES = [
  '/portal/',
  '/portal/dashboard',
  '/portal/financeiro',
  '/portal/documentos',
  '/portal/demandas',
  '/portal/interacoes'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests de API/Supabase (contêm dados sensíveis)
  if (url.hostname.includes('supabase.co') || 
      url.pathname.startsWith('/api/') ||
      request.method !== 'GET') {
    return;
  }

  // Cache First para assets estáticos
  if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then(cache => cache.put(request, responseClone));
              }
              return response;
            });
        })
    );
    return;
  }

  // NetworkFirst para rotas do portal
  if (PORTAL_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(response => {
              if (response) {
                return response;
              }
              // Fallback para offline
              return new Response(`
                <!DOCTYPE html>
                <html>
                <head>
                  <title>Portal Offline</title>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { font-family: system-ui; text-align: center; padding: 2rem; }
                    .offline { color: #64748b; }
                  </style>
                </head>
                <body>
                  <h1>Portal dos Responsáveis</h1>
                  <p class="offline">Você está offline. Conecte-se à internet para acessar o portal.</p>
                  <button onclick="window.location.reload()">Tentar novamente</button>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              });
            });
        })
    );
  }
});