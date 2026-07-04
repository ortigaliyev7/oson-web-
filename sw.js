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

// === WEB PUSH — telefonga bildirishnoma (ilova yopiq bo'lsa ham) ===
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) { data = { title: 'Oson Sug\'urtam', body: (e.data && e.data.text()) || '' }; }
  const title = data.title || 'Oson Sug\'urtam';
  const options = {
    body: data.body || '',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: data.data || {},
    vibrate: [80, 40, 80],
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Bildirishnoma bosilганда — ilovani ochish/fokuslash
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const appId = e.notification.data && e.notification.data.app_id;
  const url = appId ? `/?app=${appId}` : '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
