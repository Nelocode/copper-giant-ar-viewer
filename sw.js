const VERSION = 'v1';
const MODEL_PATH = '/dynamic-ar-model.glb';

// El Service Worker intercepta peticiones a un archivo imaginario
// y devuelve el contenido que el app.js le envíe.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname.endsWith(MODEL_PATH)) {
    event.respondWith(
      caches.match(MODEL_PATH).then((response) => {
        return response || fetch(event.request);
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
