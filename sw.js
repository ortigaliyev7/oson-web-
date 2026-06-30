// Oson Sug'urtam — minimal service worker (PWA o'rnatish uchun)
const CACHE = 'oson-v1';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
// Tarmoq-birinchi (offline keshlash shart emas — har doim yangi)
self.addEventListener('fetch', (e) => {
  // Faqat GET so'rovlar
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
