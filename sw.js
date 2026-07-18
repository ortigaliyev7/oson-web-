// Oson Sug'urtam — service worker (PWA o'rnatish + doim yangi kontent)
const CACHE = 'oson-v2';

self.addEventListener('install', (e) => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Eski keshlarni tozalaymiz (eskirgan fayllar qolmasin)
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    } catch {}
    await self.clients.claim();
  })());
});

// === DOIM YANGI KONTENT ===
// O'z domenimizdagi GET so'rovlarni HAR DOIM serverdan yangi olamiz — bunda
// brauzerning HTTP keshi CHETLAB O'TILADI (cache: 'no-store'). Shu tufayli yangi
// deploy chiqqach yangilanish DARHOL ko'rinadi, "hard refresh" (Ctrl+Shift+R)
// qilish shart emas. Internet bo'lmasa — oxirgi keshdan ko'rsatamiz (offline).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  let sameOrigin = false;
  try { sameOrigin = new URL(e.request.url).origin === self.location.origin; } catch {}

  if (!sameOrigin) {
    // Tashqi so'rovlar (masalan API) — oddiy: tarmoq, bo'lmasa keshdan
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  e.respondWith((async () => {
    try {
      const fresh = await fetch(e.request, { cache: 'no-store' });
      // Offline uchun nusxa saqlab qo'yamiz (natijaga ta'sir qilmaydi)
      try {
        const cache = await caches.open(CACHE);
        cache.put(e.request, fresh.clone());
      } catch {}
      return fresh;
    } catch (err) {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      throw err;
    }
  })());
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
