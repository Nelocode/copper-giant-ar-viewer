const VERSION = 'v1';
const MODEL_PATH = '/dynamic-ar-model.glb';

// Forzar activación inmediata
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// El Service Worker intercepta peticiones a un archivo imaginario
// y devuelve el contenido que el app.js le envíe.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Verificamos si la ruta coincide ignorando los parámetros de búsqueda (query strings)
  if (url.pathname.endsWith(MODEL_PATH)) {
    console.log('[SW] Interceptando petición para:', url.pathname);
    event.respondWith(
      caches.open(VERSION).then((cache) => {
        // Buscamos en el caché ignorando la query string (?v=...)
        return cache.match(MODEL_PATH, { ignoreSearch: true }).then((response) => {
          if (response) {
            console.log('[SW] Sirviendo modelo desde caché virtual');
            return response;
          }
          console.warn('[SW] Modelo no encontrado en caché, reintentando fetch original');
          return fetch(event.request);
        });
      })
    );
  }
});

// Escuchar mensajes desde el app.js para actualizar el modelo en caché
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_MODEL') {
    const blob = event.data.blob;
    const response = new Response(blob, {
      headers: { 'Content-Type': 'model/gltf-binary' }
    });
    
    event.waitUntil(
      caches.open(VERSION).then((cache) => {
        return cache.put(MODEL_PATH, response);
      })
    );
  }
});
