// Oson Sug'urtam — service worker
// =============================================================================
// Maqsad ikkita, bir-biriga qarama-qarshi:
//   1) yangi deploy DARHOL ko'rinishi kerak,
//   2) sayt tez ochilishi kerak (har kirishda 200 KB qayta yuklanmasin).
// Yechim — so'rov turiga qarab alohida strategiya:
//   • HTML (sahifaning o'zi)  -> doim tarmoqdan, kesh chetlab o'tiladi
//   • CSS / JS / rasm / shrift -> keshdan DARHOL, orqa fonda yangilanadi
//   • API (api.osugurta.uz)    -> faqat tarmoq, hech qachon keshdan
// Statik fayl yangilangani aniqlansa — sahifaga xabar yuboriladi va mijozga
// "Yangi versiya tayyor" tasmasi ko'rsatiladi.
// =============================================================================

const CACHE = 'oson-v3';
const STATIC_RE = /\.(?:css|js|mjs|png|jpe?g|svg|webp|avif|woff2?|ttf|otf|ico)$/i;
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    } catch {}
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// Javobning "imzosi" — shu bo'yicha fayl o'zgarganini bilamiz.
// GitHub Pages ETag yuboradi; bo'lmasa Last-Modified yoki hajm bilan solishtiramiz.
function sig(res) {
  const h = res.headers;
  return h.get('etag') || h.get('last-modified') || h.get('content-length') || '';
}

let notified = false;
async function notifyUpdate() {
  if (notified) return;
  notified = true;
  try {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: 'OSON_UPDATE' }));
  } catch {}
}

// Keshdan darhol beramiz, parallel ravishda tarmoqdan yangilaymiz.
// Fayl o'zgargan bo'lsa — sahifaga xabar.
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);

  const network = fetch(req).then(async (res) => {
    if (res && res.ok) {
      const before = cached ? sig(cached) : null;
      try { await cache.put(req, res.clone()); } catch {}
      if (before !== null && before !== sig(res)) notifyUpdate();
    }
    return res;
  }).catch(() => null);

  if (cached) return cached;
  const fresh = await network;
  if (fresh) return fresh;
  throw new Error('offline');
}

// Shriftlar deyarli o'zgarmaydi — keshda bo'lsa tarmoqqa chiqmaymiz ham.
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res && res.ok) { try { await cache.put(req, res.clone()); } catch {} }
  return res;
}

// HTML — doim yangi. Shu tufayli deploy darhol ko'rinadi.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    if (fresh && fresh.ok) { try { await cache.put(req, fresh.clone()); } catch {} }
    return fresh;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Tashqi manbalar
  if (url.origin !== self.location.origin) {
    if (FONT_HOSTS.includes(url.hostname)) {
      e.respondWith(cacheFirst(req).catch(() => fetch(req)));
    }
    // API va boshqalar — hech qanday kesh: eskirgan sug'urta ma'lumoti
    // ko'rsatilgandan ko'ra xato ko'rsatish xavfsizroq.
    return;
  }

  // Sahifaning o'zi (navigatsiya yoki .html)
  if (req.mode === 'navigate' || /\.html?$/i.test(url.pathname) || url.pathname === '/') {
    e.respondWith(networkFirst(req));
    return;
  }

  // Statik fayllar
  if (STATIC_RE.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Qolgani (yuklangan hujjatlar va h.k.) — tarmoq, bo'lmasa keshdan
  e.respondWith(fetch(req).catch(() => caches.match(req)));
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

// Bildirishnoma bosilganda — ilovani ochish/fokuslash
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
