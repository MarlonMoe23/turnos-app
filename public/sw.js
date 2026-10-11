
const CACHE_NAME = 'turnosfiltros-v18';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();

      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // No interceptar solicitudes a otros dominios,
  // incluyendo Google Sheets.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Las páginas y los recursos siempre se solicitan a la red.
  event.respondWith(
    fetch(request, { cache: 'no-store' })
  );
});
