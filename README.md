# Oson Sug'urtam — Web ilova

Avto-sug'urta rasmiylashtirish platformasining web versiyasi.
Mijoz ilovasi + Admin panel. Backend: **https://api.osugurta.uz** (Railway'da jonli).

## Fayllar tuzilishi

```
oson-web/
├── index.html        ← Mijoz ilovasi (asosiy kirish)
├── admin.html        ← Admin panel
├── css/
│   ├── style.css     ← Mijoz dizayni
│   └── admin.css     ← Admin dizayni
└── js/
    ├── config.js     ← Sozlamalar, narxlar, hududlar (BU YERDA tahrirlash)
    ├── api.js        ← Backend so'rovlari
    ├── ui.js         ← Ikonalar va yordamchilar
    ├── app.js        ← Mijoz ilovasi mantiqi
    └── admin.js      ← Admin panel mantiqi
```

## Manzillar (joylangandan keyin)

- **Mijoz:** `<domain>/index.html` (yoki shunchaki `<domain>/`)
- **Admin:** `<domain>/admin.html`

## Admin kirish

- Login: `admin`
- Parol: backend'da o'rnatilgan (HEAD_ADMIN_PASSWORD)

### Admin panel bo'limlari

- **Arizalar** — barcha arizalar, filtrlar, real-time yangilanish (12s), tasdiqlash/rad etish/to'lov havolasi/polis yuklash
- **Statistika** — jami/bugungi arizalar, tushum, daromad, status diagrammasi
- **Ish haqi** — xodimlar bo'yicha hisob-kitob
- **Xodimlar** — xodim qo'shish, tahrirlash, bloklash, komissiya foizi (faqat rahbar)
- **To'lov usullari** — Payme/Click/karta usullarini boshqarish (faqat rahbar)
- **Sozlamalar** — texnik ish rejimi, polisni yangilash toggle (faqat rahbar)
- **Profil** — shaxsiy ma'lumotlar

## Build kerak emas

Bu oddiy statik sayt — hech qanday `npm install` yoki build jarayoni yo'q.
Fayllarni istalgan statik hostingga (GitHub Pages, Netlify, Railway) yuklab,
darhol ishlatish mumkin. To'liq qo'llanma: `DEPLOY.md`.

## ⚠️ Eng muhim qadam

Joylangandan keyin Railway'da `ALLOWED_ORIGINS` o'zgaruvchisiga sayt domenini
qo'shish SHART, aks holda backend so'rovlarni bloklaydi. Batafsil: `DEPLOY.md`.
