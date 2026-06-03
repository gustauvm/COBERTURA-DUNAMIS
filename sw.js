const SHELL_CACHE = 'dunamis-shell-v4-0-4';
const SHELL_ASSETS = [
  './',
  './index.html',
  './main.css?v=4.0.4',
  './app.js?v=4.0.4',
  './config.js?v=4.0.4',
  './core/data-layer.js?v=4.0.4',
  './manifest.webmanifest?v=4.0.4'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  if (!isSameOrigin) return;

  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => {
            cache.put('./index.html', clone.clone());
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  const isCoreAsset = [
    '/index.html',
    '/app.js',
    '/config.js',
    '/main.css'
  ].some((path) => url.pathname.endsWith(path));

  // Network-first for core assets to avoid stale JS causing blank screens.
  if (isCoreAsset) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
