const CACHE_NAME = 'beanbook-v1';

// Fichiers à mettre en cache pour le mode offline
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,400&family=Nunito:wght@300;400;500;600&display=swap'
];

// Installation : on met tout en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // On essaie de cacher les assets locaux, les fonts peuvent échouer (c'est ok)
      return cache.addAll(['/index.html', '/manifest.json']).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activation : on supprime les anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch : cache-first pour les assets, network-first pour le reste
self.addEventListener('fetch', event => {
  // On ignore les requêtes non-GET et les requêtes vers l'API Anthropic
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('api.anthropic.com')) return;
  if (event.request.url.includes('dictionaryapi.dev')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // On cache les réponses valides
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback : on retourne index.html
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
