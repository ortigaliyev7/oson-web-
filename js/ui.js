/* ============================================================
   UI yordamchilari — ikonlar, toast, helperlar
   ============================================================ */

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
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4 h10 v5 a5 5 0 0 1 -10 0z"/><path d="M7 5 H4 v2 a3 3 0 0 0 3 3 M17 5 h3 v2 a3 3 0 0 1 -3 3 M9 19 h6 M12 14 v5"/></svg>',
};

// Logo SVG (oq qalqon + mashina + check)
function logoMarkSVG() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2 l7.5 2.8 v5.7 c0 5.5 -3.7 8.5 -7.5 10.3 c-3.8 -1.8 -7.5 -4.8 -7.5 -10.3 V4.8z" fill="#fff"/><path d="M8.5 11 h7 v3 h-7z M9.5 11 l.8 -2 h3.4 l.8 2" stroke="#0F6E56" stroke-width="1" fill="#0F6E56"/><circle cx="10" cy="14.5" r="1" fill="#0F6E56"/><circle cx="14" cy="14.5" r="1" fill="#0F6E56"/><circle cx="15.5" cy="13.5" r="3" fill="#2BB673"/><path d="M14.2 13.5 l1 1 l1.8 -2" stroke="#fff" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
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
