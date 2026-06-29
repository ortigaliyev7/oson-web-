/* ============================================================
   Oson Sug'urtam — Web konfiguratsiya va ma'lumotlar
   Backend: https://api.osugurta.uz (Railway'da jonli)
   ============================================================ */

// Production'da o'z domeningiz; lokal test uchun localhost
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : 'https://api.osugurta.uz';

const API = `${API_BASE}/api`;
const SOCKET = API_BASE;
const UPLOADS = `${API_BASE}/uploads`;

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
