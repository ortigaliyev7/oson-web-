/* ============================================================
   Oson Sug'urtam — Web konfiguratsiya va ma'lumotlar
   Backend:
     • Production : https://api.osugurta.uz      (Railway'da jonli)
     • Test/staging: https://api-test.osugurta.uz (alohida baza)
   ============================================================ */

// Qaysi backendga ulanishni sayt manzili (hostname) bo'yicha aniqlaymiz:
//   • localhost / 127.0.0.1  -> lokal ishlab chiqish serveri
//   • test.* subdomen        -> test (staging) backend, alohida baza
//   • qolgan barcha manzil   -> asosiy (production) backend
// Shu tufayli bitta kod ikkala saytda ham to'g'ri ishlaydi va asosiy
// sayt hech qachon test bazasiga tegmaydi.
const HOST = location.hostname;
let API_BASE;
if (HOST === 'localhost' || HOST === '127.0.0.1') {
  API_BASE = 'http://localhost:3001';
} else if (HOST.startsWith('test.') || HOST.startsWith('staging.')) {
  API_BASE = 'https://api-test.osugurta.uz';
} else {
  API_BASE = 'https://api.osugurta.uz';
}

// Test muhitida ekanmizmi (UI'da ogohlantirish ko'rsatish uchun)
const IS_TEST_ENV = (API_BASE === 'https://api-test.osugurta.uz');

const API = `${API_BASE}/api`;
const SOCKET = API_BASE;
const UPLOADS = `${API_BASE}/uploads`;

// Test saytida yuqorida qizil "TEST REJIMI" chizig'ini ko'rsatamiz —
// asosiy sayt bilan adashtirmaslik uchun. Production'da umuman chizilmaydi.
if (IS_TEST_ENV) {
  window.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.textContent = '⚠️ TEST REJIMI — bu sinov sayti, bu yerdagi ma’lumotlar haqiqiy emas';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;'
      + 'background:#B91C1C;color:#fff;font-size:13px;font-weight:600;'
      + 'text-align:center;padding:6px 12px;letter-spacing:.2px;'
      + 'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;';
    document.body.appendChild(bar);
    // Sahifa mazmuni chiziq ostida qolib ketmasligi uchun tepadan bo'sh joy
    document.body.style.paddingTop =
      (parseInt(getComputedStyle(document.body).paddingTop, 10) || 0) + 30 + 'px';
  });
}

// Telegram bot (kod yuborish uchun)
const BOT_USERNAME = 'online_sugurtambot';
const BOT_LINK = `https://t.me/${BOT_USERNAME}`;

// localStorage kalitlari
const LS = {
  CLIENT_TOKEN: 'oson_client_token',
  CLIENT_USER:  'oson_client_user',
  ADMIN_TOKEN:  'oson_admin_token',
  ADMIN_USER:   'oson_admin_user',
  DRAFT:        'oson_app_draft',
};

// === HUDUDLAR (14 ta) — zone: tsh = Toshkent, bsh = boshqa ===
const REGIONS = [
  { name: 'Toshkent shahri',   zone: 'tsh' },
  { name: 'Toshkent viloyati', zone: 'tsh' },
  { name: 'Sirdaryo',          zone: 'bsh' },
  { name: 'Jizzax',            zone: 'bsh' },
  { name: 'Samarqand',         zone: 'bsh' },
  { name: "Farg'ona",          zone: 'bsh' },
  { name: 'Namangan',          zone: 'bsh' },
  { name: 'Andijon',           zone: 'bsh' },
  { name: 'Qashqadaryo',       zone: 'bsh' },
  { name: 'Surxondaryo',       zone: 'bsh' },
  { name: 'Buxoro',            zone: 'bsh' },
  { name: 'Navoiy',            zone: 'bsh' },
  { name: 'Xorazm',            zone: 'bsh' },
  { name: "Qoraqalpog'iston",  zone: 'bsh' },
];

// === DAVLAT RAQAMI KODIDAN VILOYAT (avtomatik aniqlash) ===
// Raqamning birinchi 2 raqami — viloyat kodi. Jadval taxminiy; noto'g'ri bo'lsa
// bu yerdan tuzatish mumkin. Mijoz baribir ariza oynasida o'zgartira oladi.
const PLATE_REGION_RANGES = [
  [ 1,  9, 'Toshkent shahri'],
  [10, 19, 'Toshkent viloyati'],
  [20, 24, 'Sirdaryo'],
  [25, 29, 'Jizzax'],
  [30, 39, 'Samarqand'],
  [40, 49, "Farg'ona"],
  [50, 59, 'Namangan'],
  [60, 69, 'Andijon'],
  [70, 74, 'Qashqadaryo'],
  [75, 79, 'Surxondaryo'],
  [80, 84, 'Buxoro'],
  [85, 89, 'Navoiy'],
  [90, 94, 'Xorazm'],
  [95, 99, "Qoraqalpog'iston"],
];

// Davlat raqamidan (masalan "01A123BC" yoki "01 A 123 BC") viloyat nomini qaytaradi
function regionFromPlate(plate) {
  if (!plate) return null;
  const m = String(plate).replace(/\s+/g, '').match(/^(\d{2})/);
  if (!m) return null;
  const code = parseInt(m[1], 10);
  const row = PLATE_REGION_RANGES.find(([lo, hi]) => code >= lo && code <= hi);
  if (!row) return null;
  // REGIONS ichida shu nom borligini tekshiramiz
  return REGIONS.some(r => r.name === row[2]) ? row[2] : null;
}

// === AVTOMOBIL TURLARI ===
const VEHICLES = [
  { id: 'yengil', name: 'Yengil avtomobil', desc: 'Sedan, hatchback, universal, SUV' },
  { id: 'yuk',    name: 'Yuk avtomobili',   desc: 'Yuk mashinalari va tijorat transporti' },
];

// === MUDDATLAR ===
const DURATIONS = [
  { id: '1 yil cheklovli',   label: '1 yil',  sub: 'Cheklovli',  popular: true },
  { id: '1 yil cheklovsiz',  label: '1 yil',  sub: 'Cheklovsiz' },
  { id: '6 oy cheklovli',    label: '6 oy',   sub: 'Cheklovli' },
  { id: '6 oy cheklovsiz',   label: '6 oy',   sub: 'Cheklovsiz' },
  { id: '20 kun cheklovli',  label: '20 kun', sub: 'Cheklovli' },
  { id: '20 kun cheklovsiz', label: '20 kun', sub: 'Cheklovsiz' },
];

// === NARXLAR (so'm) ===
const PRICES = {
  yengil: {
    tsh: { '1 yil cheklovli':192000,'1 yil cheklovsiz':384000,'6 oy cheklovli':134400,'6 oy cheklovsiz':268800,'20 kun cheklovli':38400,'20 kun cheklovsiz':76800 },
    bsh: { '1 yil cheklovli':160000,'1 yil cheklovsiz':320000,'6 oy cheklovli':112000,'6 oy cheklovsiz':224000,'20 kun cheklovli':32000,'20 kun cheklovsiz':64000 },
  },
  yuk: {
    tsh: { '1 yil cheklovli':336000,'1 yil cheklovsiz':672000,'6 oy cheklovli':235200,'6 oy cheklovsiz':470400,'20 kun cheklovli':67200,'20 kun cheklovsiz':134400 },
    bsh: { '1 yil cheklovli':280000,'1 yil cheklovsiz':560000,'6 oy cheklovli':196000,'6 oy cheklovsiz':392000,'20 kun cheklovli':56000,'20 kun cheklovsiz':112000 },
  },
};

function getPrice(vehicle, region, duration) {
  const zone = (REGIONS.find(r => r.name === region) || {}).zone || 'bsh';
  return (PRICES[vehicle] && PRICES[vehicle][zone] && PRICES[vehicle][zone][duration]) || 0;
}

// === TO'LOV USULLARI ===
const PAY_METHODS = [
  { id: 'payme', label: 'Payme',        color: '#00BFEE' },
  { id: 'click', label: 'Click',        color: '#0052FF' },
  { id: 'card',  label: 'Bank kartasi', color: '#0F6E56' },
];

// === HUJJAT TURLARI (egasi) ===
const OWNER_DOCS = [
  { id: 'passport', label: 'Pasport' },
  { id: 'id_card',  label: 'ID karta' },
  { id: 'license',  label: 'Haydovchilik guvohnomasi' },
];

// === STATUS MATNLARI VA RANGLARI ===
const STATUS_LABEL = {
  new: 'Yangi', in_review: "Ko'rib chiqilmoqda", assigned: 'Biriktirildi',
  need_more_info: 'Hujjat kerak', approved: 'Tasdiqlandi', payment_pending: "To'lov kutilmoqda",
  paid: "To'landi", policy_preparing: 'Polis tayyorlanmoqda', policy_ready: 'Polis tayyor',
  completed: 'Yakunlandi', rejected: 'Rad etildi', pending: 'Kutilmoqda',
};

const STATUS_COLOR = {
  new:{bg:'#DBEAFE',fg:'#1E40AF'}, in_review:{bg:'#FEF3C7',fg:'#92400E'},
  assigned:{bg:'#F3E8FF',fg:'#6B21A8'}, need_more_info:{bg:'#FEE2E2',fg:'#991B1B'},
  approved:{bg:'#DCFCE7',fg:'#166534'}, payment_pending:{bg:'#FFEDD5',fg:'#9A3412'},
  paid:{bg:'#CFFAFE',fg:'#155E75'}, policy_preparing:{bg:'#E0F2FE',fg:'#075985'},
  policy_ready:{bg:'#D1FAE5',fg:'#065F46'}, completed:{bg:'#D1FAE5',fg:'#064E3B'},
  rejected:{bg:'#FEE2E2',fg:'#7F1D1D'}, pending:{bg:'#FFF1D9',fg:'#BA7517'},
};

// Mijozga ko'rsatiladigan soddalashtirilgan bosqichlar
const FLOW_STEPS = ['new','in_review','approved','payment_pending','paid','policy_ready','completed'];

function fmtSom(n) {
  return (n || 0).toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
}
function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
}
