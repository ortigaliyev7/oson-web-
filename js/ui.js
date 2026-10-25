/* ============================================================
   UI yordamchilari — ikonlar, toast, helperlar
   ============================================================ */

// Socket.io client kutubxonasini backenddan dinamik yuklash (CDN shart emas —
// server o'zi /socket.io/socket.io.js orqali taqdim etadi)
let _socketIOLoading = null;
function loadSocketIO() {
  if (window.io) return Promise.resolve(window.io);
  if (_socketIOLoading) return _socketIOLoading;
  _socketIOLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${SOCKET}/socket.io/socket.io.js`;
    s.onload = () => resolve(window.io);
    s.onerror = () => reject(new Error('socket.io yuklanmadi'));
    document.head.appendChild(s);
  });
  return _socketIOLoading;
}

// Hujjat rasmi to'g'ri o'qilganini tekshirish: 14 xonali JSHSHIR YOKI
// pasport seriya (2 harf + 7 raqam) matnda uchrasa — hujjat qabul qilinadi.
// Aks holda "qayta suratga oling" xabari ko'rsatiladi.
function isDocTextValid(text) {
  const t = String(text || '');
  const hasJshshir = /\b\d{14}\b/.test(t);
  const hasSeria = /\b[A-Za-zА-Яа-яЁёʻ']{2}\s*\d{7}\b/.test(t);
  return hasJshshir || hasSeria;
}

// Diqqat tortuvchi qisqa ovozli signal (Web Audio API — fayl kerak emas)
let _audioCtx = null;
function playNotifSound() {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (_audioCtx.state === 'suspended') _audioCtx.resume();
    const t = _audioCtx.currentTime;
    [0, 0.14].forEach((delay, i) => {
      const o = _audioCtx.createOscillator();
      const g = _audioCtx.createGain();
      o.connect(g); g.connect(_audioCtx.destination);
      o.type = 'sine';
      o.frequency.value = i === 0 ? 880 : 1175;
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.18, t + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.28);
      o.start(t + delay); o.stop(t + delay + 0.3);
    });
  } catch (e) { /* audio ruxsati yo'q — sukut */ }
}

// SVG ikonlar kutubxonasi (stroke-based, currentColor)
const I = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 l8 3 v6 c0 6 -4 9 -8 11 c-4 -2 -8 -5 -8 -11 V5z"/></svg>',
  shieldCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 l8 3 v6 c0 6 -4 9 -8 11 c-4 -2 -8 -5 -8 -11 V5z"/><path d="M9 12 l2 2 l4 -4"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4 h4 l2 5 l-2.5 1.5 a11 11 0 0 0 5 5 L15 13 l5 2 v4 a2 2 0 0 1 -2 2 A16 16 0 0 1 3 6 a2 2 0 0 1 2 -2z"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 h9 l5 5 v15 H6z"/><path d="M14 2 v6 h6"/><path d="M9 13 h6 M9 17 h6"/></svg>',
  car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13 l2 -6 a2 2 0 0 1 2 -1 h10 a2 2 0 0 1 2 1 l2 6"/><path d="M3 13 h18 v4 h-2 M5 17 H3 v-4"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7 h11 v10 H2z M13 11 h4 l3 3 v3 h-2"/><circle cx="6" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9 a6 6 0 0 1 12 0 c0 7 3 8 3 8 H3 s3 -1 3 -8z"/><path d="M10 21 a2 2 0 0 0 4 0"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21 a8 8 0 0 1 16 0"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 l9 -8 l9 8"/><path d="M5 10 v10 h14 V10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5 v14 M5 12 h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12 l5 5 l11 -12"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12 l3 3 l5 -6"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 h14 M13 6 l6 6 l-6 6"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12 H5 M11 6 l-6 6 l6 6"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 v13 M7 11 l5 5 l5 -5 M4 20 h16"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16 V4 M7 9 l5 -5 l5 5 M4 20 h16"/></svg>',
  camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8 a2 2 0 0 1 2 -2 h2 l2 -2 h6 l2 2 h2 a2 2 0 0 1 2 2 v10 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2z"/><circle cx="12" cy="13" r="4"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10 h20"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7 v5 l4 2"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 h9 l5 5 v15 H6z"/><path d="M14 2 v6 h6"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.1 9 a3 3 0 0 1 5.8 1 c0 2 -3 3 -3 3"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21 H5 a2 2 0 0 1 -2 -2 V5 a2 2 0 0 1 2 -2 h4 M16 17 l5 -5 l-5 -5 M21 12 H9"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4 H4 a2 2 0 0 0 -2 2 v14 a2 2 0 0 0 2 2 h14 a2 2 0 0 0 2 -2 v-7"/><path d="M18.5 2.5 a2.1 2.1 0 0 1 3 3 L12 15 l-4 1 l1 -4z"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 L11 13 M22 2 l-7 20 l-4 -9 l-9 -4z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5 a8.5 8 0 0 1 -12 7 L3 20 l1.5 -5 A8 8 0 1 1 21 11.5z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12 a9 9 0 1 1 -3 -6.7 L21 8 M21 3 v5 h-5"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12 h-6 l-2 3 h-4 l-2 -3 H2 M5 5 h14 l3 7 v6 a1 1 0 0 1 -1 1 H3 a1 1 0 0 1 -1 -1 v-6z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3 v18 h18 M7 14 v4 M12 9 v9 M17 5 v13"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7 a2 2 0 0 1 2 -2 h14 a1 1 0 0 1 1 1 v2 M3 7 v12 a1 1 0 0 0 1 1 h16 a1 1 0 0 0 1 -1 v-4 M3 7 h17 v6 h-4 a2 2 0 0 1 0 -4 h4"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20 a6 6 0 0 1 12 0"/><path d="M16 5 a3.5 3.5 0 0 1 0 6.5 M21 20 a6 6 0 0 0 -5 -5.9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6 l12 12 M18 6 l-12 12"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15 a1.6 1.6 0 0 0 .3 1.8 l.1 .1 a2 2 0 1 1 -2.8 2.8 l-.1 -.1 a1.6 1.6 0 0 0 -2.7 1.1 v.2 a2 2 0 0 1 -4 0 v-.1 a1.6 1.6 0 0 0 -1 -1.5 1.6 1.6 0 0 0 -1.8 .3 l-.1 .1 a2 2 0 1 1 -2.8 -2.8 l.1 -.1 a1.6 1.6 0 0 0 -1.1 -2.7 H3 a2 2 0 0 1 0 -4 h.1 a1.6 1.6 0 0 0 1.5 -1 1.6 1.6 0 0 0 -.3 -1.8 l-.1 -.1 a2 2 0 1 1 2.8 -2.8 l.1 .1 a1.6 1.6 0 0 0 1.8 .3 H9 a1.6 1.6 0 0 0 1 -1.5 V3 a2 2 0 0 1 4 0 v.1 a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8 -.3 l.1 -.1 a2 2 0 1 1 2.8 2.8 l-.1 .1 a1.6 1.6 0 0 0 -.3 1.8 V9 a1.6 1.6 0 0 0 1.5 1 H21 a2 2 0 0 1 0 4 h-.1 a1.6 1.6 0 0 0 -1.5 1z"/></svg>',
  filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3 H2 l8 9.5 V19 l4 2 v-8.5z"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12 s4 -7 10 -7 10 7 10 7 -4 7 -10 7 -10 -7 -10 -7z"/><circle cx="12" cy="12" r="3"/></svg>',
  gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11h17v8.5a1.5 1.5 0 0 1 -1.5 1.5H5a1.5 1.5 0 0 1 -1.5 -1.5z"/><rect x="2.5" y="7.5" width="19" height="3.5" rx="1"/><path d="M12 7.5V21"/><path d="M12 7.5S10 4 8.2 4.5 7.4 7.5 9.6 7.5z"/><path d="M12 7.5S14 4 15.8 4.5s.8 3 -1.4 3z"/></svg>',
  earn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.6 14.8 6 12 9.4 9.2 6z"/><rect x="3" y="11" width="18" height="10" rx="2.6"/><circle cx="17" cy="16" r="1.15"/></svg>',
  levels: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4.5 13.8 7.5 16.9 4.5 20 1.5 16.9z"/><path d="M12 10.7 15 15.35 12 20 9 15.35z"/><path d="M19.5 7.6 22.5 13.8 19.5 20 16.5 13.8z" fill="currentColor" stroke="none"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13 2.5 15 8.2 20.7 10.2 15 12.2 13 17.9 11 12.2 5.3 10.2 11 8.2z"/><path d="M5.6 15.4 6.4 17.8 8.8 18.6 6.4 19.4 5.6 21.8 4.8 19.4 2.4 18.6 4.8 17.8z"/></svg>',
  tap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2.8"/><path d="M6.9 6.9a7.2 7.2 0 0 0 0 10.2"/><path d="M17.1 17.1a7.2 7.2 0 0 0 0 -10.2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 2.8 14.7 8.3 20.8 9.2 16.4 13.4 17.4 19.4 12 16.6 6.6 19.4 7.6 13.4 3.2 9.2 9.3 8.3z"/></svg>',
  starFill: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.8 14.7 8.3 20.8 9.2 16.4 13.4 17.4 19.4 12 16.6 6.6 19.4 7.6 13.4 3.2 9.2 9.3 8.3z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10.5" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.7" r="1.1"/></svg>',
  archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="4.5" rx="1.2"/><path d="M4 8.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19V8.5"/><path d="M10 12.5h4"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7 -3L13.7 3.8a2 2 0 0 0 -3.4 0z"/><path d="M12 9v4"/><circle cx="12" cy="17" r=".6" fill="currentColor"/></svg>',
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 h10 v5 a5 5 0 0 1 -10 0z"/><path d="M7 5 H4 v2 a3 3 0 0 0 3 3 M17 5 h3 v2 a3 3 0 0 1 -3 3 M9 19 h6 M12 14 v5"/></svg>',
};

// Logo — yangi brend qalqoni (yashil qalqon + oq avto + belgi), shaffof fon
function logoMarkSVG() {
  // WebP 54.8 KB -> 8.3 KB. <picture> zaxira beradi: WebP'ni tushunmagan
  // brauzer <source>'ni o'tkazib yuborib PNG oladi. width/height esa rasm
  // kelgunicha joy band qilib turadi — sahifa sakramaydi.
  return `<picture class="logo-pic">
    <source srcset="icons/logo-mark.webp" type="image/webp">
    <img src="icons/logo-mark.png" alt="Oson Sug'urtam" class="logo-img" loading="eager" width="213" height="257" decoding="async">
  </picture>`;
}

// === DARAJA TOSHI ===
// Bitta siluet, har darajada yangi qirra qo'shiladi — o'sish ko'zga ko'rinadi.
// Backend daraja emojisini (🥈 va h.k.) Telegram/push matnlari uchun saqlaydi;
// sayt esa shu SVG'ni chizadi. Gradient ataylab ishlatilmagan: bir sahifada
// bir nechta bir xil id paydo bo'lishi va yashirin konteynerdagi <defs> ba'zi
// brauzerlarda gradientni yo'qotishi mumkin — tekis rang bunday xatoga uchramaydi.
const TIER_GEM = {
  yangi:  { fill:'#E7EFEB', line:'#7F988E', facets:0 },
  bronza: { fill:'#C08447', line:'#5C3616', facets:1 },
  kumush: { fill:'#CDD5DA', line:'#56616A', facets:3 },
  oltin:  { fill:'#E6C255', line:'#6B4F0A', facets:5 },
  olmos:  { fill:'#CFEFE7', line:'#456B62', facets:8 },
};
const GEM_FACETS = [
  'M8 20 40 20',        // kamar (girdle)
  'M16 10 20 20',       // toj chap
  'M32 10 28 20',       // toj o'ng
  'M20 20 24 40',       // pastki chap
  'M28 20 24 40',       // pastki o'ng
  'M24 10 24 20',       // markaz
  'M12 20 16 10',       // tashqi chap
  'M36 20 32 10',       // tashqi o'ng
];
// onCard=true — material kartaning ustida: oq yarim shaffof to'ldirish va
// kartaning matn rangidagi chiziq, shunda bronza kartada bronza tosh yo'qolmaydi.
function tierGem(id, size, onCard) {
  const g = TIER_GEM[id] || TIER_GEM.yangi;
  const sz = size || 20;
  const fill = onCard ? 'rgba(255,255,255,.62)' : g.fill;
  const line = onCard ? 'currentColor' : g.line;
  const facets = GEM_FACETS.slice(0, g.facets).map(d => `<path d="${d}"/>`).join('');
  return `<svg class="tier-gem" width="${sz}" height="${sz}" viewBox="0 0 48 48" aria-hidden="true">`
    + `<path d="M16 10 32 10 40 20 24 40 8 20Z" fill="${fill}" stroke="${line}" stroke-width="2.4" stroke-linejoin="round"/>`
    + (facets ? `<g stroke="${line}" stroke-width="2" opacity=".62" fill="none">${facets}</g>` : '')
    + `</svg>`;
}

// Baho yulduzlari (0-5) — emoji ★☆ har qurilmada boshqacha chiziladi
function starRow(n, size) {
  const k = Math.max(0, Math.min(5, Math.round(+n || 0)));
  const sz = size || 15;
  let out = '';
  for (let i = 0; i < 5; i++) {
    out += `<span class="star-ic${i < k ? ' on' : ''}" style="width:${sz}px;height:${sz}px">${i < k ? I.starFill : I.star}</span>`;
  }
  return `<span class="star-row" aria-label="${k} / 5">${out}</span>`;
}

// Backend yozgan matnlardan emojini olib tashlaydi. Ular Telegram va push
// xabarlari uchun yoziladi (u yerda SVG chizib bo'lmaydi), saytda esa o'z
// ikonkalarimiz bor — eski va yangi yozuvlar bir xil toza ko'rinadi.
// Davlat raqami: "01A777AB" → "01 A 777 AB" (jismoniy), "01777ABC" → "01 777 ABC" (yuridik).
// Tanilmagan shakl o'zgarishsiz (katta harfda) qaytadi.
function fmtPlate(raw) {
  const s = String(raw || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  let m = s.match(/^(\d{2})([A-Z])(\d{3})([A-Z]{2})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  m = s.match(/^(\d{2})(\d{3})([A-Z]{3})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return String(raw || '').toUpperCase().trim();
}

// Raqam taxtachasi ko'rinishi (Cho'ntak dizayni)
function plateTag(raw, small) {
  return `<span class="ch-plate${small ? ' sm' : ''}"><span class="ch-plate-uz">UZ</span><span class="ch-plate-num">${esc(fmtPlate(raw))}</span></span>`;
}

// "1 yil cheklovsiz" → "1 yil · Cheklovsiz"
function fmtTerm(duration) {
  const d = String(duration || '').trim();
  const m = d.match(/^(.*?)\s+(cheklovli|cheklovsiz)$/i);
  return m ? `${m[1]} · ${m[2][0].toUpperCase()}${m[2].slice(1).toLowerCase()}` : d;
}

function fmtDay(ts) {
  return ts ? new Date(+ts).toLocaleDateString('ru-RU') : '';
}

// Muddat tugashiga necha kun qoldi (tugagan bo'lsa 0)
function daysLeft(ts) {
  if (!ts) return 0;
  return Math.max(0, Math.ceil((+ts - Date.now()) / 86400000));
}

// Polis amal qilish muddati — backenddagi qoida bilan bir xil: admin kiritgan
// sana, bo'lmasa yakunlangan vaqt + muddat (1 yil / 6 oy / 20 kun).
function policyDays(duration) {
  const d = String(duration || '');
  return d.startsWith('6 oy') ? 182 : d.startsWith('20 kun') ? 20 : 365;
}
function policyExpiry(a) {
  if (!a) return 0;
  if (a.policy_expires_at) return +a.policy_expires_at;
  if (a.policy_end_date) return +a.policy_end_date;
  if (a.status !== 'policy_ready' && a.status !== 'completed') return 0;
  const start = a.completed_at || a.completedAt || a.policy_uploaded_at;
  return start ? +start + policyDays(a.duration) * 86400000 : 0;
}

// Qolgan muddat halqasi (0..1)
function ringSVG(frac) {
  const C = 125.66, f = Math.max(0, Math.min(1, +frac || 0));
  return `<svg class="ch-ring" viewBox="0 0 46 46" aria-hidden="true"><circle class="track" cx="23" cy="23" r="20"/><circle class="val" cx="23" cy="23" r="20" style="stroke-dashoffset:${(C * (1 - f)).toFixed(1)}"/></svg>`;
}

function plainText(s) {
  return String(s == null ? '' : s)
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Toast
function toast(msg, type = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const ic = type === 'success' ? I.checkCircle : type === 'error' ? I.x : I.bell;
  el.innerHTML = `${ic}<span>${msg}</span>`;
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-10px)'; setTimeout(() => el.remove(), 300); }, 3400);
}

// HTML escape
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Status badge HTML
function statusBadge(status) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.pending;
  const label = STATUS_LABEL[status] || status;
  return `<span class="badge" style="background:${c.bg};color:${c.fg}"><span class="badge-dot" style="background:${c.fg}"></span>${esc(label)}</span>`;
}

// Bosh harf (avatar)
function initials(name, phone) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  return phone ? phone.slice(-2) : '?';
}

// Telefon formatlash +998 XX XXX XX XX
function fmtPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length >= 12) return `+${d.slice(0,3)} ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10,12)}`;
  return p;
}

// Loading button holati
function setLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn._txt = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>${text ? ' ' + text : ''}`;
  } else {
    btn.disabled = false;
    if (btn._txt) btn.innerHTML = btn._txt;
  }
}

// Faylni rasm preview qilish
function readImagePreview(file, cb) {
  const r = new FileReader();
  r.onload = e => cb(e.target.result);
  r.readAsDataURL(file);
}

// VAPID ochiq kalitini (base64url) Uint8Array ga aylantirish (Web Push obuna uchun)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// dataURL -> Blob (rasm yuborish uchun)
function dataURLtoBlob(dataURL) {
  const parts = dataURL.split(',');
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while (n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

// Modal oynasi
function showModal(html) {
  let m = document.getElementById('modal-root');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal-root';
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal-box">${html}</div>
  </div>`;
  m.classList.add('show');
}
function closeModal() {
  const m = document.getElementById('modal-root');
  if (m) { m.classList.remove('show'); m.innerHTML = ''; }
}

// Telegram rasmiy logosi (oq qog'oz samolyot, ko'k doirada ishlatish uchun)
function telegramLogoSVG() {
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M43.95 6.27L3.78 21.77c-1.65.64-1.64 3 .02 3.62l9.9 3.7 3.83 12.3c.43 1.4 2.18 1.85 3.23.82l5.5-5.4 9.86 7.26c1.13.83 2.74.22 3.02-1.15l6.55-32.4c.33-1.62-1.27-2.97-2.78-2.27z" fill="white"/>
    <path d="M19.53 33.4l-.6 7.6c.86 0 1.24-.37 1.69-.81l4.06-3.92-5.15-2.87z" fill="#B5D9F0"/>
    <path d="M20.1 35.6l13.5-11.85c.45-.4-.1-.6-.7-.24L16.2 33.05l-.07.04 1.55 4.97c.18.5.06 1.96.06 1.96l.7-7.4c.05-.5 1.66 3.0 1.66 3.0z" fill="#DCEBF7"/>
  </svg>`;
}

// SMS / xabar logosi (oq, rangli doirada ishlatish uchun)
function smsLogoSVG() {
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 12h28a3 3 0 013 3v15a3 3 0 01-3 3H20l-8 7v-7h-2a3 3 0 01-3-3V15a3 3 0 013-3z" fill="white"/>
    <circle cx="18" cy="22.5" r="2" fill="#229ED9"/>
    <circle cx="24" cy="22.5" r="2" fill="#229ED9"/>
    <circle cx="30" cy="22.5" r="2" fill="#229ED9"/>
  </svg>`;
}

// Rasmni siqish (telefon qotmasligi va OCR tez bo'lishi uchun)
// maxDim px gacha kichraytiradi, JPEG sifatda qaytaradi (~100-300KB)
function compressImage(file, maxDim, quality, cb) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', quality || 0.7));
      } catch (err) { cb(e.target.result); }
    };
    img.onerror = () => cb(e.target.result);
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
