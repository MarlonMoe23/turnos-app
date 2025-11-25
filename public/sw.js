const CACHE_NAME = 'limpieza-filtros-v14'; // Incrementa versión
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
  // ❌ Quitamos '/data/turnos.json' del cache
];

// Archivos que NUNCA deben cachearse
const NEVER_CACHE = [
  '/data/turnos.json',
  // Agrega otros archivos que cambien frecuentemente
];

// Instalar el service worker y cachear recursos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Error al cachear:', err);
        return Promise.resolve();
      })
  );
  self.skipWaiting();
});

// Activar el service worker y limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Función para verificar si un archivo no debe cachearse
function shouldNeverCache(url) {
  return NEVER_CACHE.some(path => url.includes(path));
}

// Interceptar requests
self.addEventListener('fetch', event => {
  // Si es un archivo que no debe cachearse, siempre ir a la red
  if (shouldNeverCache(event.request.url)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si falla, devolver un JSON básico para turnos
        if (event.request.url.includes('turnos.json')) {
          return new Response('{"error": "Sin conexión", "turnos": []}', {
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw new Error('No disponible offline');
      })
    );
    return;
  }

  // Para otros archivos, usar cache normal
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          if (event.request.destination === 'document') {
            return new Response(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Sin conexión - Atención Emergentes</title>
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <style>
                    body { 
                      font-family: Arial, sans-serif; 
                      text-align: center; 
                      padding: 2rem;
                      background-color: #f8fafc;
                    }
                    .offline-container {
                      max-width: 400px;
                      margin: 0 auto;
                      background: white;
                      padding: 2rem;
                      border-radius: 12px;
                      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    }
                    .icon { font-size: 4rem; margin-bottom: 1rem; }
                    h1 { color: #1e293b; margin-bottom: 1rem; }
                    p { color: #64748b; }
                    button {
                      background: #10b981;
                      color: white;
                      border: none;
                      padding: 0.75rem 1.5rem;
                      border-radius: 8px;
                      font-size: 1rem;
                      cursor: pointer;
                      margin-top: 1rem;
                    }
                  </style>
                </head>
                <body>
                  <div class="offline-container">
                    <div class="icon">📡</div>
                    <h1>Sin conexión</h1>
                    <p>No hay conexión a internet. Algunos datos pueden no estar actualizados.</p>
                    <button onclick="location.reload()">Reintentar</button>
                  </div>
                </body>
              </html>
            `, {
              headers: { 'Content-Type': 'text/html' }
            });
          }
        });
      })
  );
});