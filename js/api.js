/* ============================================================
   API client — barcha backend so'rovlari
   ============================================================ */

function clientToken() { return localStorage.getItem(LS.CLIENT_TOKEN); }
function adminToken()  { return localStorage.getItem(LS.ADMIN_TOKEN); }

async function req(path, { method = 'GET', body = null, token = null, isForm = false, timeout = 15000 } = {}) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let payload = body;
  if (body && !isForm) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout); // default 15s; sekin amallar uzunroq beradi
  try {
    res = await fetch(`${API}${path}`, { method, headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error("Server javob bermayapti. Internetni tekshirib, qaytadan urinib ko'ring.");
    }
    throw new Error("Internetga ulanishda xatolik. Qaytadan urinib ko'ring.");
  }
  clearTimeout(timer);
  let data = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    // Token bilan yuborilgan so'rov 401 qaytarsa — sessiya tugagan/yaroqsiz
    if (res.status === 401 && token) {
      try { window.dispatchEvent(new CustomEvent('oson:session-expired')); } catch (e) {}
    }
    const msg = (data && (data.message || data.error)) || `Xatolik (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---------- MIJOZ AUTH ---------- */
const ClientAPI = {
  sendCode: (phone) => req('/user-auth/send-code', { method:'POST', body:{ phone } }),
  verify:   (phone, code) => req('/user-auth/verify', { method:'POST', body:{ phone, code } }),
  startSession: () => req('/user-auth/start-session', { method:'POST', body:{} }),
  telegramWebApp: (initData) => req('/user-auth/telegram-webapp', { method:'POST', body:{ initData } }),
  checkSession: (token) => req('/user-auth/session/' + encodeURIComponent(token)),
  ocr: (dataUrl, type) => {
    const fd = new FormData();
    fd.append('image', dataURLtoBlob(dataUrl), 'photo.jpg');
    fd.append('type', type || 'texpassport');
    return req('/ocr', { method:'POST', body: fd, isForm:true });
  },
  settings: () => req('/settings'),
  statsPublic: () => req('/stats/public'),
  saveDraftServer: (phone, step) => req(`/client/${encodeURIComponent(phone)}/draft`, { method:'POST', body:{ step } }),
  clearDraftServer: (phone) => req(`/client/${encodeURIComponent(phone)}/draft`, { method:'DELETE' }),
  me:       () => req('/user-auth/me', { token: clientToken() }),
  updateMe: (data) => req('/user-auth/me', { method:'PATCH', body:data, token: clientToken() }),

  myApps:   (phone) => req(`/apps/client/${encodeURIComponent(phone)}`),
  appDetail:(id) => req(`/apps/${id}`, { token: clientToken() }),
  messages: (id) => req(`/apps/${id}/messages`),
  sendMessage: (id, message) => req(`/apps/${id}/client-message`, { method:'POST', body:{ message } }),

  // Referral bonus (mijoz)
  refConfig:   () => req('/referral/config'),
  refEstimate: (region, vehicle, price, via) => req(`/referral/estimate?region=${encodeURIComponent(region||'')}&vehicle=${encodeURIComponent(vehicle||'')}&price=${encodeURIComponent(price||0)}&via=${encodeURIComponent(via||'link')}`),
  refUser:     (phone) => req(`/referral/user/${encodeURIComponent(phone)}`),

  // Web Push (brauzer bildirishnomasi)
  vapidPublic: () => req('/client/vapid-public'),
  webPushSubscribe: (phone, sub) => req(`/client/${encodeURIComponent(phone)}/web-push-subscribe`, { method:'POST', body:{ subscription: sub } }),

  notifications: (phone) => req(`/client/${encodeURIComponent(phone)}/notifications`),
  markRead: (phone) => req(`/client/${encodeURIComponent(phone)}/notifications/mark-read`, { method:'POST' }),

  // Ariza yuborish (multipart FormData)
  submitApp: (formData) => req('/apps', { method:'POST', body: formData, isForm: true }),

  // Mijoz sharhi (polis tayyor bo'lgach)
  submitReview: (data) => req('/reviews', { method:'POST', body: data }),
};

/* ---------- ADMIN AUTH ---------- */
const AdminAPI = {
  login: (username, password) => req('/auth/login', { method:'POST', body:{ username, password } }),
  me:    () => req('/auth/me', { token: adminToken() }),
  setWorkStatus: (status) => req('/auth/work-status', { method:'PATCH', body:{ status }, token: adminToken() }),

  allApps:  () => req('/apps', { token: adminToken() }),
  appDetail:(id) => req(`/apps/${id}`, { token: adminToken() }),
  approve:  (id) => req(`/apps/${id}/approve`, { method:'POST', token: adminToken() }),
  reject:   (id, reason) => req(`/apps/${id}/reject`, { method:'POST', body:{ reason }, token: adminToken() }),
  paymentLink: (id, payload) => req(`/apps/${id}/payment-link`, { method:'POST', body: payload, token: adminToken() }),
  setStatus: (id, status) => req(`/apps/${id}/status`, { method:'PATCH', body:{ status }, token: adminToken() }),
  message:   (id, message) => req(`/apps/${id}/message`, { method:'POST', body:{ message }, token: adminToken() }),
  // finalize multipart (policy_file)
  finalize:  (id, formData) => req(`/apps/${id}/finalize`, { method:'POST', body: formData, isForm:true, token: adminToken() }),
  messages:  (id) => req(`/apps/${id}/messages`),

  // --- Xodimlar boshqaruvi ---
  staffList:   () => req('/admins', { token: adminToken() }),
  staffCreate: (data) => req('/admins', { method:'POST', body:data, token: adminToken() }),
  staffUpdate: (id, data) => req(`/admins/${id}`, { method:'PATCH', body:data, token: adminToken() }),
  staffStatus: (id, status) => req(`/admins/${id}/account-status`, { method:'PATCH', body:{ status }, token: adminToken() }),
  staffDelete: (id) => req(`/admins/${id}`, { method:'DELETE', token: adminToken() }),

  // --- Sozlamalar ---
  settings:        () => req('/settings/admin', { token: adminToken() }),
  setMaintenance:  (enabled, message) => req('/settings/maintenance', { method:'POST', body:{ enabled, message }, token: adminToken() }),
  setRenewal:      (enabled, message) => req('/settings/renewal-toggle', { method:'POST', body:{ enabled, message }, token: adminToken() }),
  setSetting:      (key, value) => req('/settings', { method:'PATCH', body:{ [key]: value }, token: adminToken() }),

  // --- Xodim bonus stavkalari (hudud x avto) ---
  bonusRatesConfig:    () => req('/payroll/commission-config', { token: adminToken() }),
  bonusRatesSave:      (config) => req('/payroll/commission-config', { method:'PUT', body:{ config }, token: adminToken() }),

  // --- To'lov usullari ---
  payMethods:      () => req('/payment-methods/admin', { token: adminToken() }),
  payMethodCreate: (data) => req('/payment-methods', { method:'POST', body:data, token: adminToken() }),
  payMethodUpdate: (id, data) => req(`/payment-methods/${id}`, { method:'PATCH', body:data, token: adminToken() }),
  payMethodDelete: (id) => req(`/payment-methods/${id}`, { method:'DELETE', token: adminToken() }),

  // --- Referral bonus (admin) ---
  refConfig:     () => req('/referral/admin/config', { token: adminToken() }),
  refSaveConfig: (cfg) => req('/referral/admin/config', { method:'PATCH', body: cfg, token: adminToken() }),
  refOverview:   () => req('/referral/admin/overview', { token: adminToken() }),
  refRating:     () => req('/referral/admin/rating', { token: adminToken() }),
  refPayout:     (phone) => req(`/referral/admin/payout/${encodeURIComponent(phone)}`, { method:'POST', token: adminToken() }),

  // --- Ommaviy xabar (broadcast) ---
  broadcastList:   () => req('/broadcast/admin', { token: adminToken() }),
  broadcastSend:   (formData) => req('/broadcast/admin', { method:'POST', body: formData, isForm:true, token: adminToken(), timeout: 60000 }),
  broadcastDelete: (id) => req(`/broadcast/admin/${id}`, { method:'DELETE', token: adminToken() }),

  // --- Zaxira nusxa (backup) ---
  backupList: () => req('/backup/list', { token: adminToken() }),
  backupRun:  () => req('/backup/run', { method:'POST', token: adminToken(), timeout: 30000 }),
  backupDownload: async (name) => {
    const res = await fetch(`${API_BASE}/api/backup/download/${encodeURIComponent(name)}`, {
      headers: { Authorization: `Bearer ${adminToken()}` },
    });
    if (!res.ok) throw new Error('Yuklab bo\'lmadi (' + res.status + ')');
    return res.blob();
  },

  // --- Mijoz sharhlari (moderatsiya) ---
  reviewsList:   () => req('/reviews/admin', { token: adminToken() }),
  reviewApprove: (id) => req(`/reviews/admin/${id}/approve`, { method:'POST', token: adminToken() }),
  reviewReject:  (id) => req(`/reviews/admin/${id}/reject`, { method:'POST', token: adminToken() }),
};

/* ---------- GROSS ROBOT (osago.gross.uz) ---------- */
// Gross amallari brauzer avtomatlashtirish (proksi orqali) — sekin, uzun timeout kerak
const GROSS_TIMEOUT = 120000; // 120s
const GrossAPI = {
  status:      () => req('/gross/status', { token: adminToken() }),
  check:       () => req('/gross/check', { method:'POST', token: adminToken(), timeout: GROSS_TIMEOUT }),
  loginStart:  () => req('/gross/login/start', { method:'POST', token: adminToken(), timeout: GROSS_TIMEOUT }),
  loginSubmit: (captcha) => req('/gross/login/submit', { method:'POST', body:{ captcha }, token: adminToken(), timeout: GROSS_TIMEOUT }),
  logout:      () => req('/gross/logout', { method:'POST', token: adminToken(), timeout: GROSS_TIMEOUT }),
  job:         (id) => req(`/gross/apps/${id}/job`, { token: adminToken() }),
  lookup:      (id, fields) => req(`/gross/apps/${id}/lookup`, { method:'POST', body: fields, token: adminToken(), timeout: GROSS_TIMEOUT }),
  confirm:     (id) => req(`/gross/apps/${id}/confirm`, { method:'POST', token: adminToken(), timeout: GROSS_TIMEOUT }),
};

// Skrinshot/upload yo'lini to'liq URL ga aylantirish
function grossFileUrl(p) {
  if (!p) return '';
  if (/^(https?:|data:)/.test(p)) return p;
  return `${API_BASE}${p.startsWith('/') ? '' : '/'}${p}`;
}
