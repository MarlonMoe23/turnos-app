const CACHE_NAME = 'limpieza-filtros-v3';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/data/turnos.json',
  '/manifest.json'
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
        // No bloquear la instalación si falla el cache
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

// Interceptar requests y servir desde cache cuando sea posible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - devolver respuesta desde cache
        if (response) {
          return response;
        }

        // No está en cache, hacer fetch normal
        return fetch(event.request).then(response => {
          // Verificar si recibimos una respuesta válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Si falla el fetch y no está en cache, mostrar página offline básica
          if (event.request.destination === 'document') {
            return new Response(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Sin conexión - Limpieza de Filtros</title>
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