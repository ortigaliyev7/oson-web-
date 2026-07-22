/* ============================================================
   MIJOZ ILOVASI (SPA) — router + auth + dashboard
   ============================================================ */

const App = {
  root: null,
  user: null,
  draft: null,        // ariza qoralamasi
  notifCount: 0,

  async init() {
    this.root = document.getElementById('app');
    this.appSettings = {};
    // Referral havolasi (?ref=RAQAM) — do'st shu havola orqali kelsa saqlaymiz
    try {
      const params = new URLSearchParams(location.search);
      const ref = params.get('ref');
      if (ref) {
        const digits = ref.replace(/\D/g, '');
        if (digits.length >= 9) {
          const norm = digits.startsWith('998') ? '+' + digits : '+998' + digits.slice(-9);
          localStorage.setItem('oson_ref', norm);
        }
      }
    } catch (e) {}
    // Saqlangan sessiya
    const u = localStorage.getItem(LS.CLIENT_USER);
    if (u) { try { this.user = JSON.parse(u); } catch {} }
    // Qoralama
    const d = localStorage.getItem(LS.DRAFT);
    if (d) { try { this.draft = JSON.parse(d); } catch {} }

    window.addEventListener('hashchange', () => this.route());
    // Token yaroqsiz (401) bo'lsa — tozalab, kirish sahifasiga qaytaramiz
    window.addEventListener('oson:session-expired', () => {
      if (this._sessionEnding) return;
      if (localStorage.getItem(LS.CLIENT_TOKEN)) {
        this._sessionEnding = true;
        localStorage.removeItem(LS.CLIENT_TOKEN);
        localStorage.removeItem(LS.CLIENT_USER);
        this.user = null;
        toast('Sessiya muddati tugadi. Qaytadan kiring.', 'err');
        this.go('/login');
        setTimeout(() => { this._sessionEnding = false; }, 1500);
      }
    });
    await this.initTelegramWebApp();
    this.initTheme();

    this.route();
    this.loadSettings();
    this.initPWA();
    if (this.isAuthed && this.isAuthed()) this.initSocket();
  },

  // === RANG — accent rang tanlovi ===
  initTheme() {
    this.applyTheme();
  },
  getAccentPref() { return localStorage.getItem('oson_accent') || 'green'; },
  applyTheme() {
    document.documentElement.setAttribute('data-accent', this.getAccentPref());
    try {
      const meta = document.querySelector('meta[name="theme-color"]');
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--green-700').trim();
      if (meta && accent) meta.setAttribute('content', accent);
    } catch (e) {}
  },
  setAccent(a) {
    localStorage.setItem('oson_accent', a);
    this.applyTheme();
    this.viewProfile();
  },

  // === TELEGRAM MINI APP — botda ulangan mijozni avtomatik kirg'izish ===
  async initTelegramWebApp() {
    try {
      const tg = window.Telegram && window.Telegram.WebApp;
      if (!tg || !tg.initData) return; // oddiy brauzerda ochilgan — hech narsa qilmaymiz
      tg.ready();
      tg.expand();
      if (this.isAuthed()) return; // allaqachon kirgan
      const r = await ClientAPI.telegramWebApp(tg.initData);
      if (r && r.ok && r.token) {
        this.user = r.user;
        localStorage.setItem(LS.CLIENT_TOKEN, r.token);
        localStorage.setItem(LS.CLIENT_USER, JSON.stringify(this.user));
      }
    } catch (e) { /* avtomatik kirish ixtiyoriy — muvaffaqiyatsiz bo'lsa oddiy login ekrani ko'rinadi */ }
  },

  // === REAL VAQT (Socket.io) — status/to'lov/polis/xabar darhol yangilanadi ===
  async initSocket() {
    if (this._socket || !this.user || !this.user.phone) return;
    try {
      const io = await loadSocketIO();
      const socket = io(SOCKET, { transports: ['websocket', 'polling'] });
      this._socket = socket;
      socket.on('connect', () => socket.emit('join_client', this.user.phone));

      socket.on('status_updated', (d) => {
        playNotifSound();
        toast(`Ariza holati yangilandi: ${STATUS_LABEL[d.status] || d.status}`, 'success');
        if (location.hash === `#/status/${d.app_id}`) this.viewStatus(d.app_id);
        this.refreshNotifCount();
      });
      socket.on('payment_link', (d) => {
        playNotifSound();
        toast("To'lov havolasi keldi", 'success');
        if (location.hash === `#/status/${d.app_id}`) this.viewStatus(d.app_id);
        this.refreshNotifCount();
      });
      socket.on('policy_uploaded', (d) => {
        playNotifSound();
        toast('Polisingiz tayyor!', 'success');
        if (location.hash === `#/status/${d.app_id}`) this.viewStatus(d.app_id);
        this.refreshNotifCount();
      });
      socket.on('new_message', (m) => {
        playNotifSound();
        if (this.chatAppId && location.hash === `#/chat/${this.chatAppId}`) this.loadChat();
        else toast("Operatordan yangi xabar keldi", '');
      });
    } catch (e) { /* real vaqt ixtiyoriy — ulanmasa ham ilova ishlayveradi */ }
  },
  async loadSettings() {
    try {
      const s = await ClientAPI.settings();
      this.appSettings = s || {};
      if (location.hash.includes('/new/drivers')) this.flowDrivers();
    } catch (e) { /* sozlama yuklanmasa default */ }
  },

  // === WEB PUSH: telefonga bildirishnoma obunasi ===
  // canPrompt=true bo'lsa ruxsat so'raladi (login kabi harakatdan keyin);
  // aks holda faqat ruxsat allaqachon berilgan bo'lsa obuna qilinadi.
  async setupWebPush(canPrompt) {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
      if (!this.user || !this.user.phone) return;
      if (Notification.permission === 'denied') return;
      if (Notification.permission === 'default' && !canPrompt) return;

      const r = await ClientAPI.vapidPublic().catch(() => null);
      const publicKey = r && r.publicKey;
      if (!publicKey) return;

      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await ClientAPI.webPushSubscribe(this.user.phone, sub);
    } catch (e) { /* push majburiy emas — sukut */ }
  },

  // === PWA: ilovani o'rnatishni taklif qilish ===
  initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    // Ruxsat oldin berilgan bo'lsa — jim obuna (prompt'siz)
    if (this.isAuthed && this.isAuthed()) this.setupWebPush(false);
    const installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (installed) return;
    if (localStorage.getItem('oson_pwa_dismissed') === '1') return;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredPrompt = e;
      setTimeout(() => this.showPwaBanner('android'), 2500);
    });

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      setTimeout(() => this.showPwaBanner('ios'), 3000);
    }
  },
  showPwaBanner(kind) {
    if (document.getElementById('pwaBanner')) return;
    const txt = kind === 'ios'
      ? `<b>Ilovani o'rnating</b><span>"Ulashish" (↑) → "Bosh ekranga qo'shish"</span>`
      : `<b>Ilovani o'rnating</b><span>Tez kirish uchun bosh ekranga qo'shing</span>`;
    const btn = kind === 'ios' ? '' : `<button class="pwa-install" onclick="App.installPwa()">O'rnatish</button>`;
    const el = document.createElement('div');
    el.id = 'pwaBanner';
    el.className = 'pwa-banner';
    el.innerHTML = `
      <div class="pwa-ic">${logoMarkSVG()}</div>
      <div class="pwa-txt">${txt}</div>
      <div class="pwa-btns">${btn}<button class="pwa-close" onclick="App.dismissPwa()">&times;</button></div>`;
    document.body.appendChild(el);
  },
  async installPwa() {
    const p = this._deferredPrompt;
    if (!p) { this.dismissPwa(); return; }
    p.prompt();
    try { await p.userChoice; } catch {}
    this._deferredPrompt = null;
    this.dismissPwa();
  },
  dismissPwa() {
    const el = document.getElementById('pwaBanner');
    if (el) el.remove();
    localStorage.setItem('oson_pwa_dismissed', '1');
  },

  go(path) { location.hash = path; },

  saveDraft() {
    try {
      if (this.draft && this.user && this.user.phone) this.draft._ownerPhone = this.user.phone;
      localStorage.setItem(LS.DRAFT, JSON.stringify(this.draft || {}));
    } catch(e){}
    this.pingDraftServer();
  },
  saveDraftSoon() { clearTimeout(this._saveT); this._saveT = setTimeout(() => this.saveDraft(), 400); },
  clearDraft() {
    if (this.user && this.user.phone) ClientAPI.clearDraftServer(this.user.phone).catch(() => {});
    this.draft = null; localStorage.removeItem(LS.DRAFT);
  },
  // Tugallanmagan ariza haqida serverga signal (rasm/matn EMAS — faqat bosqich va vaqt,
  // "arizangiz saqlanib qoldi" eslatmasi uchun). 1 daqiqada bir martadan ortiq yubormaymiz.
  pingDraftServer() {
    if (!this.draft || !this.user || !this.user.phone) return;
    const now = Date.now();
    if (this._lastDraftPing && now - this._lastDraftPing < 60000) return;
    this._lastDraftPing = now;
    const step = (location.hash.match(/\/new\/(\w+)/) || [])[1] || '';
    ClientAPI.saveDraftServer(this.user.phone, step).catch(() => {});
  },

  logout() {
    localStorage.removeItem(LS.CLIENT_TOKEN);
    localStorage.removeItem(LS.CLIENT_USER);
    this.user = null;
    // Qoralama TOZALANMAYDI — shu raqam bilan qaytadan kirsa, davom ettirish
    // uchun saqlanadi (boshqa raqam kirsa initSocket/verify'da tekshiriladi).
    this.go('/');
  },

  isAuthed() { return !!localStorage.getItem(LS.CLIENT_TOKEN) && !!this.user; },

  route() {
    const hash = (location.hash || '#/').slice(1);
    const [path, ...rest] = hash.split('/').filter(Boolean);

    // Login sahifasidan chiqilsa — Telegram session pollingni to'xtatish
    if (path !== 'login') this.stopSessionPoll();

    // Himoyalangan sahifalar
    const protectedViews = ['dashboard','new','apps','status','profile','notifications','chat','bonus'];
    if (protectedViews.includes(path) && !this.isAuthed()) {
      return this.go('/login');
    }

    window.scrollTo(0, 0);

    switch (path) {
      case undefined: case '': return this.viewLanding();
      case 'login':    return this.viewLogin();
      case 'dashboard':return this.viewDashboard();
      case 'new':      return this.viewFlow(rest[0] || 'type');
      case 'apps':     return this.viewMyApps();
      case 'status':   return this.viewStatus(rest[0]);
      case 'chat':     return this.viewChat(rest[0]);
      case 'notifications': return this.viewNotifications();
      case 'bonus':    return this.viewBonusClient();
      case 'profile':  return this.viewProfile();
      default:         return this.viewLanding();
    }
  },

  // ============================================================
  // BONUS (mijoz) — do'stingizga sug'urta qiling, pul ishlang
  // ============================================================
  refShareLink() {
    const digits = String(this.user && this.user.phone || '').replace(/\D/g, '').slice(-9);
    return `https://osugurta.uz/?ref=${digits}`;
  },
  setBcVia(via) {
    this._bcVia = via;
    const l = document.getElementById('bcViaLink'), d = document.getElementById('bcViaDirect');
    if (l) l.className = 'cc-opt' + (via==='link'?' on':'');
    if (d) d.className = 'cc-opt' + (via==='direct'?' on':'');
    this.refCalc();
  },
  refCalc() {
    const cfg = this._refCfg; if (!cfg) return;
    const via = this._bcVia === 'direct' ? 'direct' : 'link';
    const table = via === 'direct' ? cfg.direct_rates : cfg.rates;
    const zone = document.getElementById('bcZone').value;   // tsh | bsh
    const veh  = document.getElementById('bcVeh').value;     // yengil | yuk
    const rate = (table && table[`${zone}_${veh}`]) || { mode:'percent', value:0 };
    const region = zone === 'tsh' ? 'Toshkent shahri' : 'Samarqand';
    const price = getPrice(veh, region, '1 yil cheklovli') || 0;
    let amount = rate.mode === 'fixed' ? (+rate.value||0) : Math.round(price * (+rate.value||0) / 100);
    const out = document.getElementById('bcResult');
    if (!out) return;
    const themeClass = via === 'direct' ? 'ac-gold' : 'ac-green';
    const badge = via === 'direct' ? '🎁 TAXMINIY BONUS' : '💰 TAXMINIY BONUS';
    const lab = via === 'direct' ? "Bu turdagi sug'urta uchun taxminan" : "Har bir do'st uchun taxminan";
    const sub = via === 'direct'
      ? "To'g'ridan-to'g'ri sug'urta qilib bersangiz"
      : `1 yillik polisdan${rate.mode==='percent' ? ` (${rate.value}%)` : ''}`;
    out.innerHTML = `
      <div class="bonus-amount-card ${themeClass}">
        <div class="dbc-badge">${badge}</div>
        <div class="dbc-top">
          <div class="dbc-ic">${I.trophy}</div>
          <div class="dbc-txt">
            <span class="dbc-lab">${lab}</span>
            <b class="dbc-amt">${fmtSom(amount)}</b>
            <span class="dbc-sub">${sub}</span>
          </div>
        </div>
      </div>`;
  },
  async shareRef() {
    const link = this.refShareLink();
    const text = `Oson Sug'urtam orqali avto sug'urtangizni onlayn rasmiylashtiring! ${link}`;
    try {
      if (navigator.share) { await navigator.share({ title:"Oson Sug'urtam", text, url: link }); return; }
    } catch (e) { return; }
    try { await navigator.clipboard.writeText(link); toast('Havola nusxalandi', 'success'); }
    catch { prompt('Havolani nusxalang:', link); }
  },
  async viewBonusClient() {
    this.root.innerHTML = this.topbar('Bonus', '/dashboard') + `<div class="app-shell"><div class="wrap app-main app-view">${this.loadingBlock ? this.loadingBlock() : ''}</div></div>`;
    try {
      const phone = this.user.phone;
      const [cfg, ub] = await Promise.all([
        ClientAPI.refConfig(), ClientAPI.refUser(phone),
      ]);
      this._refCfg = cfg;
      const link = this.refShareLink();
      const contact = cfg.payout_contact || this.appSettings.contact_admin_tg_url || '';
      const txHtml = (ub.transactions||[]).length ? ub.transactions.map(t => `
        <div class="bx-tx">
          <div><b>${t.type==='earned'?'Bonus qo\'shildi':t.type==='paid'?'To\'lab berildi':t.type==='discount'?'Chegirma':'—'}</b>
            <span>${fmtDate(t.createdAt)}</span>
            ${t.note ? `<span class="bx-tx-note">${esc(t.note)}</span>` : ''}</div>
          <div class="bx-amt ${t.amount<0?'neg':''}">${t.amount>0?'+':''}${fmtSom(Math.abs(t.amount))}</div>
        </div>`).join('') : `<p class="muted-text" style="text-align:center;padding:16px">Hozircha tranzaksiya yo'q</p>`;

      const tier = ub.tier || {};
      const rankTxt = ub.rank
        ? `Reytingda: <b>#${ub.rank}</b> / ${ub.rank_total} · Oborot: <b>${fmtSom(ub.turnover||0)}</b>`
        : `Oborotingiz: <b>${fmtSom(ub.turnover||0)}</b>`;
      const nextTxt = tier.next
        ? `Keyingi daraja — ${tier.next.icon} ${esc(tier.next.label)}: yana <b>${fmtSom(tier.next.remaining)}</b> viloyat oboroti kerak`
        : ((ub.turnover || 0) > 0 ? '🎉 Eng yuqori darajadasiz!' : "Do'st taklif qilib, viloyat oboroti bilan daraja oshiring");

      const body = `
        <div class="bx-balance">
          <div class="bx-bal-lab">Sizning bonusingiz</div>
          <div class="bx-bal-val">${fmtSom(ub.balance)}</div>
          <div class="bx-bal-sub">Jami ishlangan: ${fmtSom(ub.total_earned)} · Do'stlar: ${ub.referral_count||0}</div>
          ${ub.balance > 0 ? (ub.payout_locked
            ? `<div class="bx-payout-wait">${I.clock} Yana ${ub.payout_available_in_days} kundan keyin so'rashingiz mumkin</div>`
            : (contact ? `<a href="${esc(contact)}" target="_blank" class="btn btn-light btn-sm" style="margin-top:12px">${I.send} Bonusni olish uchun murojaat</a>` : '')
          ) : ''}
        </div>

        <div class="bx-rank-card">
          <div class="bx-rank-badge tier-${esc(tier.id||'yangi')}">
            <span class="bx-rank-ic">${tier.icon||'🔰'}</span>
            <div class="bx-rank-txt"><b>${esc(tier.label||'Yangi')} daraja</b><span>${rankTxt}</span></div>
          </div>
          <div class="bx-rank-hint">${nextTxt}</div>
        </div>

        ${Array.isArray(cfg.tiers) && cfg.tiers.length ? `
        <div class="bx-card">
          <h3 class="bx-h">🏅 Darajalar va mukofotlar</h3>
          <p style="color:var(--ink-2);font-size:13px;line-height:1.5;margin:2px 0 12px">Darajangiz siz keltirgan <b>viloyat</b> oboroti bo'yicha ko'tariladi (Toshkent hisobga olinmaydi). Har bir darajaga birinchi marta yetganingizda mukofot bonusi qo'shiladi.</p>
          ${cfg.tiers.map(t => {
            const active = (tier.id === t.id);
            const reached = (ub.turnover || 0) >= (+t.min || 0);
            return `<div style="display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;margin-bottom:8px;border:1px solid ${active?'var(--green-500)':'var(--line)'};background:${active?'var(--green-50)':'var(--card)'}">
              <div style="font-size:22px;line-height:1">${t.icon||'🔰'}</div>
              <div style="flex:1;min-width:0">
                <b style="display:block;font-size:14.5px;color:var(--ink)">${esc(t.label||'')}${active?' · <span style="color:var(--green-700)">Sizning darajangiz</span>':(reached?' <span style="color:var(--green-600)">✓</span>':'')}</b>
                <span style="font-size:12.5px;color:var(--ink-2)">${(+t.min||0)>0?`${fmtSom(t.min)} oborotdan`:'Boshlang‘ich daraja'}</span>
              </div>
              <div style="font-weight:800;color:var(--green-700);white-space:nowrap;font-size:14px">${(+t.bonus||0)>0?`+${fmtSom(t.bonus)}`:'—'}</div>
            </div>`;
          }).join('')}
        </div>` : ''}

        ${cfg.enabled ? `
        <div class="bx-card bx-earn">
          <h3>${I.trophy} Do'stingizga sug'urta qiling — pul ishlang!</h3>
          <p>Bu — sizning shaxsiy daromad manbaingiz. Qancha ko'p do'st taklif qilsangiz, shuncha ko'p bonus ishlaysiz:</p>
          <div class="bx-steps">
            <div class="bx-step"><span class="bx-num">1</span><span>Pastdagi havolani do'stingizga yuboring</span></div>
            <div class="bx-step"><span class="bx-num">2</span><span>Do'stingiz shu havola orqali ariza to'ldiradi</span></div>
            <div class="bx-step bx-step-key"><span class="bx-num">3</span><span><b>To'lov qilib, ariza yakunlangach</b> — bonus tushadi</span></div>
          </div>
          ${ub.payout_locked ? `<div class="bx-contact-note bx-locked">
            <div class="bcn-ic">${I.clock}</div>
            <div class="bcn-txt"><b>Bonusni yechib olish</b><span>Yana ${ub.payout_available_in_days} kundan keyin murojaat qilishingiz mumkin</span></div>
          </div>` : (contact ? `<a href="${esc(contact)}" target="_blank" class="bx-contact-note">
            <div class="bcn-ic">${I.send}</div>
            <div class="bcn-txt"><b>Bonusni yechib olish uchun</b><span>Murojaat qiling</span></div>
            <div class="bcn-arrow">${I.arrowRight}</div>
          </a>` : '')}
          <div class="bx-link"><input class="inp" id="refLink" readonly value="${esc(link)}"><button class="btn btn-primary btn-sm" onclick="App.shareRef()">${I.send} Ulashish</button></div>
          <div class="bx-calc">
            ${cfg.direct_enabled ? `
            <div class="cc-toggle bx-via-toggle">
              <button class="cc-opt on" id="bcViaLink" onclick="App.setBcVia('link')">Taklif havolasi</button>
              <button class="cc-opt" id="bcViaDirect" onclick="App.setBcVia('direct')">To'g'ridan-to'g'ri</button>
            </div>` : ''}
            <div class="bx-calc-row">
              <select class="inp" id="bcZone" onchange="App.refCalc()"><option value="bsh">Viloyat</option><option value="tsh">Toshkent</option></select>
              <select class="inp" id="bcVeh" onchange="App.refCalc()"><option value="yengil">Yengil avto</option><option value="yuk">Yuk avto</option></select>
            </div>
            <div class="bx-calc-result" id="bcResult"></div>
          </div>
        </div>` : ''}

        <div class="bx-card">
          <h3 class="bx-h">Tarix</h3>
          ${txHtml}
        </div>`;
      this.root.querySelector('.app-view').innerHTML = body;
      this.refCalc();
    } catch (e) {
      const v = this.root.querySelector('.app-view');
      if (v) v.innerHTML = this.errorBlock ? this.errorBlock(e.message) : `<p>${esc(e.message)}</p>`;
    }
  },

  // Topbar (ichki sahifalar)
  topbar(title, backTo) {
    const back = backTo
      ? `<div class="app-back" onclick="App.go('${backTo}')">${I.arrowLeft}<span>${tt('Orqaga')}</span></div>`
      : `<div class="logo"><div class="logo-mark">${logoMarkSVG()}</div></div>`;
    return `<div class="app-topbar"><div class="wrap app-topbar-inner">
      ${back}
      ${title ? `<div class="app-title">${esc(tt(title))}</div>` : ''}
      <div style="width:80px"></div>
    </div></div>`;
  },

  // Pastki navigatsiya
  bottomNav(active) {
    const items = [
      { k:'dashboard', ic:I.home, lab:tt('Asosiy'), path:'/dashboard' },
      { k:'apps', ic:I.doc, lab:tt('Arizalar'), path:'/apps' },
      { k:'notifications', ic:I.bell, lab:tt('Xabar'), path:'/notifications', badge:this.notifCount },
      { k:'profile', ic:I.user, lab:tt('Profil'), path:'/profile' },
    ];
    return `<div class="bottom-nav">${items.map(it => `
      <div class="bn-item ${active===it.k?'active':''}" onclick="App.go('${it.path}')">
        <div style="position:relative">${it.ic}${it.badge?`<span class="bn-badge">${it.badge}</span>`:''}</div>
        <span class="bn-lab">${it.lab}</span>
      </div>`).join('')}</div>`;
  },

  // ============================================================
  // LANDING (mehmon sahifasi)
  // ============================================================
  viewLanding() {
    document.body.className = '';
    this.root.innerHTML = `
    <nav class="nav"><div class="wrap nav-inner">
      <div class="logo"><div class="logo-mark">${logoMarkSVG()}</div>Oson Sug'urtam</div>
      <div class="nav-links">
        <a href="#features">${tt('Imkoniyatlar')}</a>
        <a href="#how">${tt('Qanday ishlaydi')}</a>
        <a href="#contact">${tt('Aloqa')}</a>
      </div>
      <div class="nav-lang-switch">
        <button class="${getLang()!=='ru'?'on':''}" onclick="App.setLang('uz')">UZ</button>
        <button class="${getLang()==='ru'?'on':''}" onclick="App.setLang('ru')">RU</button>
      </div>
      <button class="btn btn-primary btn-sm" onclick="App.go('/login')">${tt('Kirish')}</button>
    </div></nav>

    <header class="hero"><div class="hero-bg"></div><div class="wrap hero-grid">
      <div class="hero-text">
        <div class="hero-eyebrow">${I.shieldCheck} ${tt("O'zbekistonda raqamli sug'urta")}</div>
        <h1>${tt('Avto sug\'urta')} <span class="accent">${tt('bir necha daqiqada')}</span></h1>
        <p class="hero-slogan">${tt("Bir surat. Bir to'lov. Polis tayyor.")}</p>
        <p class="hero-sub">${tt("Ofisga borib navbatda turmang. Hujjatni suratga oling, biz polisingizni rasmiylashtiramiz va to'g'ridan-to'g'ri sug'urta kompaniyasiga davlat narxida to'laysiz.")}</p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-lg" onclick="App.go('/login')">${I.arrowRight} ${tt('Boshlash')}</button>
          <a href="#how" class="btn btn-outline btn-lg">${tt('Qanday ishlaydi')}</a>
        </div>
        <div class="hero-trust">
          <div><div class="t-num">3 ${tt('daq')}</div><div class="t-lab">${tt("O'rtacha vaqt")}</div></div>
          <div><div class="t-num">14 ${tt('ta')}</div><div class="t-lab">${tt('Barcha hudud')}</div></div>
          <div><div class="t-num">100%</div><div class="t-lab">${tt('Xavfsiz')}</div></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="phone"><div class="phone-screen"><div class="phone-notch"></div>
          ${this.phoneMockContent()}
        </div></div>
        <div class="phone-float float-1"><div class="pf-ic" style="background:var(--green-100);color:var(--green-700)">${I.shieldCheck}</div>${tt('Polis tayyor')}</div>
        <div class="phone-float float-2"><div class="pf-ic" style="background:#E0F7FF;color:#0052FF">${I.card}</div>${tt("To'lov qabul qilindi")}</div>
        <div class="phone-float float-3"><div class="pf-ic" style="background:var(--gold-l);color:var(--gold)">${I.clock}</div>3 ${tt('daqiqada')}</div>
      </div>
    </div></header>

    <section class="section" id="features"><div class="wrap">
      <div class="section-head">
        <div class="section-eyebrow">${tt('Imkoniyatlar')}</div>
        <h2>${tt('Hammasi bitta ilovada')}</h2>
        <p>${tt("Sug'urta rasmiylashtirish uchun kerak bo'lgan barcha narsa — qulay va tez")}</p>
      </div>
      <div class="features-grid">
        ${[
          {ic:I.phone, t:tt('Telegram orqali kirish'), d:tt("Telefon raqamingizni ulang — tasdiqlash kodi avtomatik keladi. SMS to'lovsiz va parolsiz.")},
          {ic:I.camera, t:tt('Suratga oling'), d:tt('Texpassport rasmini oling — ma\'lumotlar avtomatik aniqlanadi. Qo\'lda kiritish shart emas.')},
          {ic:I.clock, t:tt('Tezkor narx'), d:tt('Avto turi, hudud va muddatni tanlang — narx darhol ko\'rsatiladi. Yashirin to\'lov yo\'q.')},
          {ic:I.refresh, t:tt('Bir qadamda yangilash'), d:tt('Eski polis rasmini yuklang — qolgan ma\'lumotlar saqlanadi.')},
          {ic:I.card, t:tt('Qulay to\'lov'), d:tt('Payme, Click yoki bank kartasi orqali to\'g\'ridan-to\'g\'ri kompaniyaga.')},
          {ic:I.pdf, t:tt('PDF polis'), d:tt('Tayyor polis PDF formatda. Xohlagan vaqtda yuklab oling va ko\'rsating.')},
        ].map(f => `<div class="feature">
          <div class="feature-ic">${f.ic}</div>
          <h3>${f.t}</h3><p>${f.d}</p>
        </div>`).join('')}
      </div>
    </div></section>

    <section class="section" id="how" style="background:#fff"><div class="wrap">
      <div class="section-head">
        <div class="section-eyebrow">${tt('Jarayon')}</div>
        <h2>${tt("To'rt oddiy qadam")}</h2>
        <p>${tt("Arizadan polisgacha — soddalashtirilgan jarayon")}</p>
      </div>
      <div class="steps-rail">
        ${[
          {t:tt('Kirish'), d:tt('Telefon raqamingiz orqali tizimga kiring')},
          {t:tt('Ariza to\'ldirish'), d:tt('Avto ma\'lumotlari va hujjat rasmlarini yuboring')},
          {t:tt('To\'lov'), d:tt('Payme, Click yoki karta orqali to\'lang')},
          {t:tt('Polisni oling'), d:tt('Tayyor polisni PDF formatda yuklab oling')},
        ].map((s,i) => `<div class="step-card">
          <div class="step-num">${i+1}</div>
          <h3>${s.t}</h3><p>${s.d}</p>
        </div>`).join('')}
      </div>
    </div></section>

    <section class="section"><div class="wrap">
      <div class="cta-banner">
        <h2>${tt('Hoziroq boshlang')}</h2>
        <p>${tt("Bir necha daqiqada sug'urta polisingizni rasmiylashtiring. Tez, qulay va ishonchli.")}</p>
        <button class="btn btn-white btn-lg" onclick="App.go('/login')">${I.arrowRight} ${tt('Ariza topshirish')}</button>
      </div>
    </div></section>

    <footer class="footer" id="contact"><div class="wrap">
      <div class="footer-grid">
        <div>
          <div class="logo"><div class="logo-mark">${logoMarkSVG()}</div>Oson Sug'urtam</div>
          <p>${tt("O'zbekistonda avtomobil sug'urtasini onlayn rasmiylashtirish xizmati. «EVAZ» MChJ.")}</p>
        </div>
        <div>
          <h4>${tt('Xizmatlar')}</h4>
          <div class="footer-links">
            <a href="#features">${tt('Yangi polis')}</a>
            <a href="#features">${tt('Polisni yangilash')}</a>
            <a href="#how">${tt('Qanday ishlaydi')}</a>
          </div>
        </div>
        <div>
          <h4>${tt('Aloqa')}</h4>
          <div class="footer-links">
            <a href="tel:+998907772477">+998 90 777 24 77</a>
            <a href="${BOT_LINK}" target="_blank" rel="noopener">${tt('Telegram orqali yozish')}</a>
            <a href="privacy-policy.html">${tt('Maxfiylik siyosati')}</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 «EVAZ» MChJ</span>
        <span>${tt("Farg'ona viloyati, O'zbekiston")}</span>
      </div>
    </div></footer>`;
  },

  phoneMockContent() {
    return `<div style="padding:40px 20px;color:#fff;height:100%;display:flex;flex-direction:column">
      <div style="text-align:center;margin-top:30px">
        <div style="width:80px;height:80px;margin:0 auto 16px;background:rgba(255,255,255,.15);border-radius:24px;display:grid;place-items:center">
          <div style="width:48px;height:48px">${logoMarkSVG()}</div>
        </div>
        <div style="font-family:'Sora';font-weight:800;font-size:22px">Oson Sug'urtam</div>
        <div style="font-size:13px;opacity:.8;margin-top:4px">${tt('Avto sug\'urta')}</div>
      </div>
      <div style="margin-top:auto;background:rgba(255,255,255,.12);border-radius:16px;padding:16px;backdrop-filter:blur(8px)">
        <div style="font-size:12px;opacity:.8">${tt('Ariza')} #A-1042</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <div style="width:28px;height:28px;background:#2BB673;border-radius:50%;display:grid;place-items:center">${I.check}</div>
          <div style="font-weight:600;font-size:14px">${tt('Polis tayyor')}</div>
        </div>
      </div>
    </div>`;
  },

  // ============================================================
  // LOGIN (telefon + OTP)
  // ============================================================
  viewLogin() {
    document.body.className = '';
    this.loginPhone = this.loginPhone || '';
    this.stopSessionPoll();
    this.root.innerHTML = `
    <div class="auth-page">
      <div class="auth-visual">
        <div class="logo"><div class="logo-mark">${logoMarkSVG()}</div>Oson Sug'urtam</div>
        <div class="auth-visual-mid">
          <h2>${tt('Sug\'urta endi')}<br>${tt('oson va tez')}</h2>
          <p>${tt("Telegram orqali bir tugma bilan kiring va bir necha daqiqada polisingizni rasmiylashtiring.")}</p>
        </div>
        <div style="position:relative;z-index:2;font-size:13px;opacity:.7">© 2026 «EVAZ» MChJ</div>
        <div class="auth-shield">${I.shield}</div>
      </div>
      <div class="auth-form-side">
        <div class="auth-box" id="authBox">${this.loginPhoneStep()}</div>
      </div>
    </div>`;
    this.prepTelegramLogin();
  },

  // YAGONA kirish usuli — Telegram orqali bir tugma bilan. Mijoz "Raqamni ulash"
  // tugmasini bosishi bilan avtomatik kirg'iziladi (kod kiritish shart emas).
  loginPhoneStep() {
    return `
      <div class="app-back" onclick="App.go('/')" style="margin-bottom:20px">${I.arrowLeft}<span>${tt('Bosh sahifa')}</span></div>
      <h1>${tt('Tizimga kirish')}</h1>
      <p class="sub">${tt("Telegram orqali bir tugma bilan kiring — telefon raqamini yozish shart emas")}</p>

      <div class="tg-login-hero">
        <div class="tg-login-logo">${telegramLogoSVG()}</div>
        <h3>${tt('Telegram orqali kirish')}</h3>
        <p>${tt('Telegram\'da "Boshlash" va "Raqamni ulash" tugmalarini bossangiz — avtomatik kirasiz.')}</p>
      </div>

      <div class="tg-steps tg-steps-compact">
        <div class="tg-step"><span class="tg-step-n">1</span><div>${tt('Pastdagi tugmani bosing — Telegram ochiladi')}</div></div>
        <div class="tg-step"><span class="tg-step-n">2</span><div><b>"${tt('Boshlash')}"</b> ${tt('va')} <b>"📱 ${tt('Raqamni ulash')}"</b>${tt('ni bosing')}</div></div>
        <div class="tg-step"><span class="tg-step-n">3</span><div>${tt('Ulashishingiz bilan avtomatik kirasiz')}</div></div>
      </div>

      <a class="btn btn-tg btn-block btn-lg tg-login-btn disabled" id="tgLoginBtn" target="_blank" rel="noopener"
         onclick="App.onTgLoginClick(event)">
        ${telegramLogoSVG()} <span>${tt('Telegram orqali kirish')}</span>
      </a>`;
  },

  // === TELEGRAM SESSION (bir tugma bilan kirish) ===
  async prepTelegramLogin() {
    try {
      const r = await ClientAPI.startSession();
      this.sessionToken = r.token;
      const btn = document.getElementById('tgLoginBtn');
      if (btn) {
        btn.href = `${BOT_LINK}?start=${r.token}`;
        btn.classList.remove('disabled');
      }
    } catch (e) { /* tugma onclick orqali zaxira yo'l bilan ishlaydi */ }
  },

  onTgLoginClick(e) {
    if (!this.sessionToken) {
      // session hali tayyor emas — yaratamiz va ochamiz
      e.preventDefault();
      this.startTelegramLoginFallback();
      return;
    }
    // <a href> Telegram'ni ochadi; biz kutish ekranini ko'rsatamiz va so'rov boshlaymiz
    setTimeout(() => this.renderTelegramWaiting(), 80);
    this.pollSession();
  },

  async startTelegramLoginFallback() {
    // Ko'p mobil brauzerlar window.open()ni faqat bosish hodisasi ICHIDA,
    // SINXRON chaqirilsa ruxsat beradi — await'dan keyin chaqirilsa ovozsiz
    // bloklab qo'yadi (hech qanday xato ko'rinmaydi). Shuning uchun oynani
    // hozir (hali sinxron) bo'sh holda ochamiz, manzilni esa javob kelgach
    // beramiz.
    const win = window.open('', '_blank');
    try {
      const r = await ClientAPI.startSession();
      this.sessionToken = r.token;
      const url = `${BOT_LINK}?start=${r.token}`;
      if (win) win.location.href = url;
      else window.open(url, '_blank'); // popap bloklangan bo'lsa — oddiy urinish
      this.renderTelegramWaiting();
      this.pollSession();
    } catch (e) {
      if (win) win.close();
      toast('Xatolik yuz berdi, qaytadan urinib ko\'ring', 'error');
    }
  },

  renderTelegramWaiting() {
    const box = document.getElementById('authBox');
    if (!box) return;
    box.innerHTML = `
      <div class="app-back" onclick="App.cancelTelegramLogin()" style="margin-bottom:20px">${I.arrowLeft}<span>Bekor qilish</span></div>
      <div class="tg-deliver tg">
        <div class="tg-badge">
          <span class="tg-ring"></span><span class="tg-ring"></span><span class="tg-ring"></span>
          <div class="tg-logo">${telegramLogoSVG()}</div>
        </div>
        <h1 class="tg-title">Telegram ochildi</h1>
        <p class="tg-sub">Telegram ilovasida quyidagi 2 qadamni bajaring</p>
      </div>
      <div class="tg-steps">
        <div class="tg-step"><span class="tg-step-n">1</span><div><b>"Boshlash"</b> (Start) tugmasini bosing</div></div>
        <div class="tg-step"><span class="tg-step-n">2</span><div><b>"📱 Raqamni ulash"</b> tugmasini bosing</div></div>
      </div>
      <div class="tg-waiting"><span class="spinner"></span><span>Telegram javobini kutyapmiz...</span></div>
      <a class="btn btn-tg btn-block" href="${BOT_LINK}?start=${this.sessionToken}" target="_blank" rel="noopener">
        ${telegramLogoSVG()} <span>Telegram'ni qayta ochish</span>
      </a>`;
  },

  pollSession() {
    this.stopSessionPoll();
    let elapsed = 0;
    this.sessionPoll = setInterval(async () => {
      elapsed += 3;
      if (elapsed > 600) { this.stopSessionPoll(); return; }
      try {
        const s = await ClientAPI.checkSession(this.sessionToken);
        // Raqamni ulash — Telegram tomonidan tasdiqlangan, shuning uchun KOD SHART EMAS.
        // Backend token qaytarsa — mijozni to'g'ridan-to'g'ri ilovaga kirg'izamiz.
        if (s && s.ready && s.token) {
          this.stopSessionPoll();
          if (s.phone) this.loginFullPhone = s.phone;
          this.finishLogin(s, { toast: 'Avtomatik kirdingiz. Xush kelibsiz!' });
        } else if (s && s.ready && s.phone) {
          // Zaxira yo'l: token kelmasa (eski backend) — kod kiritish ekrani
          this.stopSessionPoll();
          this.loginFullPhone = s.phone;
          this.renderOtpStep('telegram');
          toast('Raqam ulandi! Kodni kiriting', 'ok');
        } else if (s && s.expired) {
          this.stopSessionPoll();
          toast('Vaqt tugadi, qaytadan urinib ko\'ring', 'error');
          this.viewLogin();
        }
      } catch (e) { /* keyingi urinishda */ }
    }, 3000);
  },
  stopSessionPoll() { if (this.sessionPoll) { clearInterval(this.sessionPoll); this.sessionPoll = null; } },
  cancelTelegramLogin() { this.stopSessionPoll(); this.viewLogin(); },

  onPhoneInput(el) {
    el.value = el.value.replace(/\D/g, '').slice(0, 9);
    this.loginPhone = el.value;
  },

  async sendCode() {
    let digits = (this.loginPhone || '').replace(/\D/g, '');
    // OTP zaxira ekranida (Telegram orqali) to'liq raqam allaqachon ma'lum bo'ladi —
    // "Qayta yuborish" bosilganda o'shandan foydalanamiz (raqam kiritish maydoni yo'q).
    if (digits.length !== 9 && this.loginFullPhone) {
      digits = String(this.loginFullPhone).replace(/\D/g, '').slice(-9);
    }
    if (digits.length !== 9) { toast('To\'liq telefon raqam kiriting', 'error'); return; }
    const phone = '+998' + digits;
    const btn = document.getElementById('sendBtn');
    setLoading(btn, true, 'Yuborilmoqda...');
    try {
      const r = await ClientAPI.sendCode(phone);
      this.loginFullPhone = phone;
      this.renderOtpStep(r && r.via);
    } catch (e) {
      toast(e.message || 'Kod yuborishda xatolik', 'error');
      setLoading(btn, false);
    }
  },

  renderOtpStep(via) {
    const box = document.getElementById('authBox');
    const isSms = via === 'sms';
    const delivered = (via === 'sms' || via === 'telegram_gateway' || via === 'telegram');
    const logo = isSms ? smsLogoSVG() : telegramLogoSVG();
    const heroTitle = isSms ? 'Kod SMS orqali yuborildi' : "Kod Telegram'ga yuborildi";
    const heroSub = isSms
      ? `<b>${esc(fmtPhone(this.loginFullPhone))}</b> raqamiga<br>6 xonali tasdiqlash kodi yuborildi`
      : `<b>${esc(fmtPhone(this.loginFullPhone))}</b> raqamli Telegram'ingizga<br>6 xonali kod yuborildi — ilovangizni tekshiring`;

    const hero = delivered ? `
      <div class="tg-deliver ${isSms?'sms':'tg'}">
        <div class="tg-badge">
          <span class="tg-ring"></span><span class="tg-ring"></span><span class="tg-ring"></span>
          <div class="tg-logo">${logo}</div>
          <div class="tg-check">${I.check}</div>
        </div>
        <h1 class="tg-title">${heroTitle}</h1>
        <p class="tg-sub">${heroSub}</p>
      </div>` : `
      <div class="tg-deliver wait">
        <div class="tg-badge">
          <span class="tg-ring"></span><span class="tg-ring"></span>
          <div class="tg-logo">${telegramLogoSVG()}</div>
        </div>
        <h1 class="tg-title">${tt('Kodni kiriting')}</h1>
        <p class="tg-sub"><b>${esc(fmtPhone(this.loginFullPhone))}</b> ${tt('raqamiga yuborilgan')}<br>${tt('6 xonali kodni kiriting')}</p>
      </div>`;

    // Kod yetkazilmagan bo'lsa (telegram_id yo'q, gateway/SMS sozlanmagan) — botni ochish taklifi
    const botHelp = !delivered ? `
      <div class="bot-help">
        <p>Kod kelmadimi? Telegram bot orqali oling:</p>
        <a class="btn btn-tg btn-block" href="${BOT_LINK}" target="_blank" rel="noopener">
          ${telegramLogoSVG()} Telegram botni ochish
        </a>
        <span class="bot-help-note">Botda "Boshlash" tugmasini bosing va telefon raqamingizni ulashing — kod avtomatik keladi</span>
      </div>` : '';

    box.innerHTML = `
      <div class="app-back" onclick="App.viewLogin()" style="margin-bottom:20px">${I.arrowLeft}<span>Raqamni o'zgartirish</span></div>
      ${hero}
      <div class="otp-row" id="otpRow">
        ${[0,1,2,3,4,5].map(i => `<input class="otp-cell" type="tel" inputmode="numeric" maxlength="1" data-i="${i}" oninput="App.onOtpInput(this)" onkeydown="App.onOtpKey(event,this)">`).join('')}
      </div>
      <div class="hint resend-hint">Kod kelmadimi? <a id="resendLink" onclick="App.sendCode()">Qayta yuborish</a></div>
      <button class="btn btn-primary btn-block btn-lg" id="verifyBtn" onclick="App.verifyCode()">Tasdiqlash ${I.check}</button>
      ${botHelp}`;
    setTimeout(() => { const c = box.querySelector('.otp-cell'); if (c) c.focus(); }, 100);
  },

  onOtpInput(el) {
    el.value = el.value.replace(/\D/g, '');
    el.classList.toggle('filled', !!el.value);
    if (el.value && el.nextElementSibling) el.nextElementSibling.focus();
    // To'lganda avtomatik tasdiqlash
    const cells = [...document.querySelectorAll('.otp-cell')];
    if (cells.every(c => c.value)) this.verifyCode();
  },
  onOtpKey(e, el) {
    if (e.key === 'Backspace' && !el.value && el.previousElementSibling) {
      el.previousElementSibling.focus();
      el.previousElementSibling.classList.remove('filled');
    }
  },

  async verifyCode() {
    const cells = [...document.querySelectorAll('.otp-cell')];
    const code = cells.map(c => c.value).join('');
    if (code.length !== 6) { toast('To\'liq kodni kiriting', 'error'); return; }
    const btn = document.getElementById('verifyBtn');
    setLoading(btn, true, 'Tekshirilmoqda...');
    try {
      const r = await ClientAPI.verify(this.loginFullPhone, code);
      this.finishLogin(r);
    } catch (e) {
      toast(e.message || 'Kod noto\'g\'ri', 'error');
      setLoading(btn, false);
      cells.forEach(c => c.value = '');
      if (cells[0]) cells[0].focus();
    }
  },

  // Kirish yakunlash — kod tasdiqlangach YOKI Telegram raqam ulash orqali
  // avtomatik kirilganda ham bir xil ishlaydi. r: { token, user, phone? }
  finishLogin(r, opts = {}) {
    localStorage.setItem(LS.CLIENT_TOKEN, r.token);
    this.user = r.user || { phone: this.loginFullPhone };
    localStorage.setItem(LS.CLIENT_USER, JSON.stringify(this.user));
    // Qoralama boshqa raqamga tegishli bo'lsa — tozalaymiz (maxfiylik uchun);
    // shu raqamga tegishli bo'lsa (yoki eski, egasiz qoralama) — davom ettiramiz.
    if (this.draft && this.draft._ownerPhone && this.draft._ownerPhone !== this.user.phone) {
      this.clearDraft();
    }
    toast(opts.toast || 'Xush kelibsiz!', 'success');
    this.setupWebPush(true); // bildirishnomaga obuna (ruxsat so'raladi)
    this.initSocket();
    this.go('/dashboard');
  },

  // ============================================================
  // DASHBOARD
  // ============================================================
  async viewDashboard() {
    document.body.className = '';
    const name = (this.user && (this.user.name || this.user.full_name)) || '';
    const firstName = name ? name.split(/\s+/)[0] : 'Mijoz';
    const isFirstVisit = !localStorage.getItem('oson_onboarded');
    this.root.innerHTML = `
      ${this.topbar('')}
      <div class="app-shell"><div class="wrap app-main app-view">
        <div class="greeting">${tt('Assalomu alaykum,')}</div>
        <div class="greeting-name">${esc(firstName)}!</div>

        <div class="hero-card">
          <h2>${tt("Sug'urta polisini rasmiylashtiring")}</h2>
          <p>${tt("Bir necha daqiqada, ofisga bormasdan")}</p>
          <div class="hc-shield">${I.shieldCheck}</div>
        </div>

        <div class="onb-wrap">
          <div class="action-card ${isFirstVisit?'onb-highlight':''}" onclick="App.dismissOnboarding();App.startNewApp()">
            <div class="ac-plus">${I.plus}</div>
            <div><h3>${tt('Yangi ariza')}</h3><p>${tt("3-5 daqiqada to'ldiring")}</p></div>
            <div class="ac-arrow">${I.arrowRight}</div>
          </div>
          ${isFirstVisit ? `
          <div class="onb-hint">
            <span>👆 ${tt("Sug'urta olish uchun shu yerdan boshlang!")}</span>
            <button onclick="App.dismissOnboarding()">${I.x}</button>
          </div>` : ''}
        </div>

        <div class="bonus-promo" onclick="App.go('/bonus')">
          <div class="bp-badge">💰 ${tt('DAROMAD')}</div>
          <div class="bp-top">
            <div class="bp-ic">${I.trophy}</div>
            <div class="bp-txt"><h3>${tt("Do'stingizni taklif qiling — pul ishlang!")}</h3><p>${tt("Bu — sizning shaxsiy daromad manbaingiz")}</p></div>
            <div class="ac-arrow">${I.arrowRight}</div>
          </div>
          <div class="bp-steps">
            <div class="bp-step"><span class="bp-num">1</span><span>${tt("Havolangizni do'stingizga yuboring")}</span></div>
            <div class="bp-step"><span class="bp-num">2</span><span>${tt("Do'stingiz sug'urta arizasini to'ldiradi")}</span></div>
            <div class="bp-step bp-key"><span class="bp-num">3</span><span><b>${tt("To'lov qilib, ariza yakunlangach")}</b> — ${tt('sizga bonus tushadi')}</span></div>
          </div>
        </div>

        <div class="tiles">
          <div class="tile" onclick="App.go('/apps')">
            <div class="tile-ic" style="background:#DBEAFE;color:#1E40AF">${I.doc}</div>
            <h4>${tt('Arizalarim')}</h4><p>${tt('Holatlarni kuzating')}</p>
          </div>
          <div class="tile" onclick="App.go('/notifications')">
            <div class="tile-ic" style="background:var(--gold-l);color:var(--gold)">${I.bell}</div>
            ${this.notifCount?`<span class="tile-badge">${this.notifCount}</span>`:''}
            <h4>${tt('Bildirishnoma')}</h4><p>${tt('Yangiliklar')}</p>
          </div>
          <div class="tile" onclick="App.startRenew()">
            <div class="tile-ic" style="background:var(--green-100);color:var(--green-700)">${I.refresh}</div>
            <h4>${tt('Polisni yangilash')}</h4><p>${tt('Tez yangilash')}</p>
          </div>
          <div class="tile" onclick="App.go('/profile')">
            <div class="tile-ic" style="background:#F3E8FF;color:#6B21A8">${I.user}</div>
            <h4>${tt('Profil')}</h4><p>${tt('Sozlamalar')}</p>
          </div>
        </div>

        <div class="card card-pad" style="margin-top:20px;display:flex;gap:16px;align-items:center;background:var(--green-50);border-color:var(--green-100)">
          <div style="width:48px;height:48px;color:var(--green-700);flex-shrink:0">${I.shieldCheck}</div>
          <div>
            <h4 style="font-size:15px;margin-bottom:2px">${tt('100% xavfsiz')}</h4>
            <p style="font-size:13.5px;color:var(--ink-2)">${tt("Ma'lumotlaringiz shifrlangan kanallar orqali himoyalangan")}</p>
          </div>
        </div>

        <div id="trust-banner"></div>
      </div></div>
      ${this.bottomNav('dashboard')}`;
    this.refreshNotifCount();
    this.renderTrustBanner();
  },

  // Ishonch bloki — real statistika (backend) + admin qo'shgan sharhlar
  async renderTrustBanner() {
    try {
      const [stats, s] = await Promise.all([
        ClientAPI.statsPublic().catch(() => null),
        Object.keys(this.appSettings || {}).length ? Promise.resolve(this.appSettings) : ClientAPI.settings().catch(() => ({})),
      ]);
      const el = document.getElementById('trust-banner');
      if (!el) return;
      let html = '';
      if (stats && (+stats.totalPolicies || 0) >= 5) {
        html += `
        <div class="trust-stats">
          <div class="ts-item"><strong>${stats.totalPolicies}+</strong><span>polis rasmiylashtirildi</span></div>
          <div class="ts-item"><strong>${stats.totalClients}+</strong><span>mijoz ro'yxatdan o'tdi</span></div>
        </div>`;
      }
      const testimonials = (s && Array.isArray(s.testimonials)) ? s.testimonials : [];
      if (testimonials.length) {
        html += `
        <div class="testimonials">
          ${testimonials.slice(0, 5).map(t => `
          <div class="testimonial-card">
            ${t.rating ? `<div class="tc-stars">${'★'.repeat(Math.round(t.rating))}${'☆'.repeat(5-Math.round(t.rating))}</div>` : ''}
            <p>"${esc(t.text || '')}"</p>
            <div class="tc-author">${esc(t.name || 'Mijoz')}${t.city ? ', ' + esc(t.city) : ''}</div>
          </div>`).join('')}
        </div>`;
      }
      el.innerHTML = html;
    } catch (e) { /* ixtiyoriy blok */ }
  },
  dismissOnboarding() {
    localStorage.setItem('oson_onboarded', '1');
    const el = document.querySelector('.onb-hint');
    if (el) el.remove();
    const card = document.querySelector('.action-card.onb-highlight');
    if (card) card.classList.remove('onb-highlight');
  },

  async refreshNotifCount() {
    if (!this.user || !this.user.phone) return;
    try {
      const r = await ClientAPI.notifications(this.user.phone);
      const list = Array.isArray(r) ? r : (r.items || r.notifications || []);
      this.notifCount = list.filter(n => !n.is_read).length;
      // badge yangilash
      document.querySelectorAll('.bn-badge').forEach(b => {});
    } catch {}
  },

  startNewApp() {
    // Ish vaqti jadvali — baza yopiq bo'lsa yangi ariza ochilmaydi, xabar chiqadi
    const ws = this.appSettings && this.appSettings.work_status;
    if (ws && ws.open === false) {
      const nx = ws.next_text ? ` Biz ${ws.next_text} yana xizmatingizda bo'lamiz.` : '';
      showModal(`<h3 class="modal-title">${I.clock} Ish vaqtimiz hozircha yakunlandi</h3>
        <p style="color:var(--ink-2);line-height:1.55;margin-bottom:6px">${esc((ws.message || 'Hurmatli mijoz! Hozir ish vaqtimiz tugagan. Sizga xizmat ko\'rsatishdan doimo mamnunmiz.') + nx)}</p>
        <div class="modal-actions"><button class="btn btn-primary btn-block" onclick="closeModal()">Albatta</button></div>`);
      return;
    }
    this.draft = { app_type: 'new', drivers: [] };
    this.saveDraft();
    this.go('/new/type');
    // Takroriy mijoz — oldingi arizadagi ma'lumotlardan foydalanish taklifi.
    // Tarmoq so'rovi FONDA ketadi — tugma bosilganda darhol keyingi ekranga
    // o'tiladi, sekin internetda ham "bosilmayapti" degan taassurot bo'lmasin.
    this.offerPrefillFromLastApp();
  },
  async offerPrefillFromLastApp() {
    try {
      const last = await this.getLastAppFull();
      if (last && (last.tex_plate || (Array.isArray(last.drivers) && last.drivers.length))) {
        const info = last.tex_plate ? `\nAvto: ${last.tex_plate}` : '';
        if (confirm(`Oldingi arizangizdagi ma'lumotlardan foydalanasizmi?${info}`)) {
          this.prefillDraftFrom(last);
          this.saveDraft();
          toast('Oldingi ma\'lumotlar to\'ldirildi — tekshiring', 'success');
          if (location.hash.startsWith('#/new/')) this.route();
        }
      }
    } catch (e) { /* prefill ixtiyoriy */ }
  },

  // Mijozning oxirgi arizasini to'liq ma'lumot bilan olish
  async getLastAppFull() {
    if (!this.user || !this.user.phone) return null;
    const r = await ClientAPI.myApps(this.user.phone).catch(() => null);
    const items = (r && r.items) || [];
    if (!items.length) return null;
    const id = items[0].id || items[0]._id;
    if (!id) return null;
    const full = await ClientAPI.appDetail(id).catch(() => null);
    return (full && (full.app || full)) || null;
  },

  // Draftni oldingi arizadan to'ldirish (rasm/muddat/narx qayta tanlanadi)
  prefillDraftFrom(a) {
    this.draft.vehicle = a.vehicle || null;
    if (a.region) { this.draft.region = a.region; this.draft.regionAuto = a.region; }
    this.draft.owner_doc = a.owner_doc || null;
    this.draft.tex = {
      plate: a.tex_plate || '', seria: a.tex_seria || '', model: a.tex_model || '',
      year: a.tex_year || '', vin: a.tex_vin || '', stir: a.tex_stir || '',
    };
    if (Array.isArray(a.drivers) && a.drivers.length) {
      this.draft.drivers = a.drivers.map(d => ({
        jshshir: d.jshshir || '', seria: d.seria || d.license || '', name: d.name || '',
      }));
    }
    this.draft._prefilled = true;
  },
  startRenew() {
    this.draft = { app_type: 'renew', drivers: [] };
    this.saveDraft();
    this.go('/new/oldpolicy');
  },

  // ============================================================
  // YANGI ARIZA — ko'p bosqichli oqim
  // ============================================================
  flowSteps() {
    // renew bo'lsa "type" o'tkazib yuboriladi. Yangilashda texpassport EMAS —
    // faqat eski polis rasmi (1 ta) so'raladi; haydovchi qo'shish ixtiyoriy.
    // Yangi arizada tex (texpassport rasmi) eng oldinda — OCR raqamni o'qib
    // viloyatni avtomatik aniqlaydi; keyin avto turi, hudud (tasdiq), muddat/narx.
    const base = this.draft && this.draft.app_type === 'renew'
      ? ['oldpolicy','vehicle','region','duration','drivers','payment','confirm']
      : ['type','tex','vehicle','region','duration','drivers','payment','confirm'];
    return base;
  },

  flowProgress(step) {
    const steps = this.flowSteps();
    const idx = steps.indexOf(step);
    const total = steps.length;
    const pct = Math.round(((idx+1) / total) * 100);
    return { idx, total, pct };
  },

  flowNext(step) {
    const steps = this.flowSteps();
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) this.go('/new/' + steps[idx+1]);
  },
  flowPrev(step) {
    const steps = this.flowSteps();
    const idx = steps.indexOf(step);
    if (idx > 0) this.go('/new/' + steps[idx-1]);
    else this.go('/dashboard');
  },

  flowHeader(step, title) {
    const { idx, total, pct } = this.flowProgress(step);
    return `
      ${this.topbar(title)}
      <div class="app-shell"><div class="wrap app-main app-view">
        <div class="flow-back" onclick="App.flowPrev('${step}')">${I.arrowLeft}<span>${tt('Orqaga')}</span></div>
        <div class="flow-progress">
          <div class="fp-track"><div class="fp-fill" style="width:${pct}%"></div></div>
          <div class="fp-label">${idx+1} / ${total} ${tt('qadam')}</div>
        </div>`;
  },

  viewFlow(step) {
    if (!this.draft) { this.startNewApp(); return; }
    document.body.className = '';
    window.scrollTo(0, 0);
    this.hideTransition();
    switch (step) {
      case 'type':      return this.flowType();
      case 'vehicle':   return this.flowVehicle();
      case 'region':    return this.flowRegion();
      case 'duration':  return this.flowDuration();
      case 'tex':       return this.flowTex();
      case 'oldpolicy': return this.flowOldPolicy();
      case 'drivers':   return this.flowDrivers();
      case 'payment':   return this.flowPayment();
      case 'confirm':   return this.flowConfirm();
      default:          return this.flowType();
    }
  },

  // 1. Ariza turi
  flowType() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('type', 'Ariza turi') + `
      <h2 class="flow-q">${tt('Qanday ariza?')}</h2>
      <p class="flow-sub">${tt('Yangi polis yoki mavjudini yangilash')}</p>
      <div class="choice-list">
        <div class="choice ${d.app_type==='new'?'sel':''}" onclick="App.selectAndGo(this,'app_type','new','/new/tex')">
          <div class="choice-ic" style="background:var(--green-100);color:var(--green-700)">${I.plus}</div>
          <div class="choice-txt"><h4>${tt('Yangi polis')}</h4><p>${tt('Birinchi marta rasmiylashtirish')}</p></div>
          <div class="choice-rad"></div>
        </div>
        <div class="choice ${d.app_type==='renew'?'sel':''}" onclick="App.selectAndGo(this,'app_type','renew','/new/oldpolicy')">
          <div class="choice-ic" style="background:#DBEAFE;color:#1E40AF">${I.refresh}</div>
          <div class="choice-txt"><h4>${tt('Polisni yangilash')}</h4><p>${tt('Eski polis asosida tez yangilash')}</p></div>
          <div class="choice-rad"></div>
        </div>
      </div>
      </div></div>`;
  },
  pick(field, val, next) {
    this.draft[field] = val;
    this.saveDraft();
    if (next) this.go(next);
  },
  // Tanlovni darrov belgilab (rang), keyin o'tadi — "qotish" hissini yo'qotadi
  selectAndGo(el, field, val, next) {
    if (el && el.parentElement) {
      [...el.parentElement.children].forEach(s => s.classList.remove('sel'));
      el.classList.add('sel');
    }
    this.draft[field] = val;
    this.saveDraft();
    this.showTransition();
    setTimeout(() => { if (next) this.go(next); }, 230);
  },
  // Tanlab, flowSteps tartibi bo'yicha KEYINGI qadamga o'tadi (qattiq yo'l emas)
  selectAndNext(el, field, val, step) {
    if (el && el.parentElement) {
      [...el.parentElement.children].forEach(s => s.classList.remove('sel'));
      el.classList.add('sel');
    }
    this.draft[field] = val;
    this.saveDraft();
    this.showTransition();
    setTimeout(() => this.flowNext(step), 230);
  },
  showTransition() {
    let o = document.getElementById('stepLoading');
    if (!o) {
      o = document.createElement('div');
      o.id = 'stepLoading';
      o.className = 'step-loading';
      o.innerHTML = `<div class="sl-box"><span class="spinner"></span><span>Kuting...</span></div>`;
      document.body.appendChild(o);
    }
    requestAnimationFrame(() => o.classList.add('show'));
  },
  hideTransition() {
    const o = document.getElementById('stepLoading');
    if (o) o.classList.remove('show');
  },
  pickRenew() {
    this.draft.app_type = 'renew';
    this.saveDraft();
    this.go('/new/oldpolicy');
  },

  // 2. Avto turi
  flowVehicle() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('vehicle', 'Avtomobil turi') + `
      <h2 class="flow-q">${tt("Avtomobil turini tanlang")}</h2>
      <p class="flow-sub">${tt("Sug'urta narxi turga bog'liq")}</p>
      <div class="choice-list">
        ${VEHICLES.map(v => `
          <div class="choice ${d.vehicle===v.id?'sel':''}" onclick="App.selectAndNext(this,'vehicle','${v.id}','vehicle')">
            <div class="choice-ic" style="background:var(--green-100);color:var(--green-700)">${v.id==='yuk'?I.truck:I.car}</div>
            <div class="choice-txt"><h4>${tt(v.name)}</h4><p>${tt(v.desc)}</p></div>
            <div class="choice-rad"></div>
          </div>`).join('')}
      </div>
      </div></div>`;
  },

  // 3. Hudud
  flowRegion() {
    const d = this.draft;
    const auto = d.regionAuto && d.region === d.regionAuto;
    this.root.innerHTML = this.flowHeader('region', 'Hudud') + `
      <h2 class="flow-q">${tt("Hududingizni tasdiqlang")}</h2>
      <p class="flow-sub">${tt(auto ? "Davlat raqamidan avtomatik aniqlandi — noto'g'ri bo'lsa o'zgartiring" : "Avtomobil ro'yxatdan o'tgan hudud")}</p>
      ${auto ? `<div class="region-auto">${I.checkCircle}<span>${tt('Aniqlandi')}: <b>${esc(tt(d.region))}</b></span></div>` : ''}
      <div class="region-grid">
        ${REGIONS.map((r, i) => `
          <div class="region-chip ${d.region===r.name?'sel':''}" data-i="${i}" onclick="App.pickRegion(${i})">
            ${esc(tt(r.name))}
          </div>`).join('')}
      </div>
      ${d.region ? `<button class="btn btn-primary btn-block btn-lg" style="margin-top:20px" onclick="App.flowNext('region')">${tt('Davom etish')}</button>` : ''}
      </div></div>`;
  },
  pickRegion(i) {
    const r = REGIONS[i];
    if (!r) return;
    const el = document.querySelector('.region-chip[data-i="' + i + '"]');
    this.selectAndGo(el, 'region', r.name, '/new/duration');
  },

  // 4. Muddat
  flowDuration() {
    const d = this.draft;
    if (!d.vehicle || !d.region) { this.go('/new/vehicle'); return; }
    this.root.innerHTML = this.flowHeader('duration', 'Muddat') + `
      <h2 class="flow-q">${tt("Sug'urta muddati")}</h2>
      <p class="flow-sub">${tt("Muddat va qoplamani tanlang")}</p>
      <div class="dur-list">
        ${DURATIONS.map(dur => {
          const price = getPrice(d.vehicle, d.region, dur.id);
          return `
          <div class="dur-card ${d.duration===dur.id?'sel':''}" onclick="App.selectAndNext(this,'duration','${dur.id}','duration')">
            ${dur.popular?`<span class="dur-pop">${tt('Mashhur')}</span>`:''}
            <div class="dur-main">
              <div class="dur-label">${tt(dur.label)}</div>
              <div class="dur-sub">${tt(dur.sub)}</div>
            </div>
            <div class="dur-price">${fmtSom(price)}</div>
            <div class="choice-rad"></div>
          </div>`;
        }).join('')}
      </div>
      </div></div>`;
  },

  // 5. Texpassport ma'lumotlari + rasm (OCR bilan)
  flowTex() {
    const d = this.draft;
    d.tex = d.tex || {};
    this.root.innerHTML = this.flowHeader('tex', 'Texpassport') + `
      <h2 class="flow-q">${tt("Avtomobil ma'lumotlari")}</h2>
      <p class="flow-sub">${tt("Texpassport rasmini oling — ma'lumotlar avtomatik aniqlanadi")}</p>

      <div class="tex-uploads">
        <div class="upload-zone tex-up" id="texUpload" onclick="document.getElementById('texFile').click()">
          <input type="file" id="texFile" accept="image/*" hidden onchange="App.onTexPhoto('front', event)">
          <div id="texPreview">
            <div class="uz-ic">${I.camera}</div>
            <div class="uz-title">Old tomoni</div>
            <div class="uz-hint">Rasmga oling yoki galereyadan tanlang</div>
          </div>
          ${this.uzCamButton('texFileCam', "App.onTexPhoto('front', event)", 'texFile')}
        </div>
        <div class="upload-zone tex-up" id="texBackUpload" onclick="document.getElementById('texBackFile').click()">
          <input type="file" id="texBackFile" accept="image/*" hidden onchange="App.onTexPhoto('back', event)">
          <div id="texBackPreview">
            <div class="uz-ic">${I.camera}</div>
            <div class="uz-title">Orqa tomoni</div>
            <div class="uz-hint">Rasmga oling yoki galereyadan tanlang</div>
          </div>
          ${this.uzCamButton('texBackFileCam', "App.onTexPhoto('back', event)", 'texBackFile')}
        </div>
      </div>

      <div id="ocrStatus" class="ocr-status" style="display:none"></div>

      <div class="form-grid" style="margin-top:18px">
        <div class="field"><label>Davlat raqami</label>
          <input class="inp" id="t_plate" placeholder="01 A 123 BC" value="${esc(d.tex.plate||'')}" oninput="App.texField('plate',this.value)"></div>
        <div class="field-row">
          <div class="field"><label>Seriya</label>
            <input class="inp" id="t_seria" placeholder="AAF1234567" value="${esc(d.tex.seria||'')}" oninput="App.texField('seria',this.value)"></div>
          <div class="field"><label>Yil</label>
            <input class="inp" id="t_year" placeholder="2020" inputmode="numeric" value="${esc(d.tex.year||'')}" oninput="App.texField('year',this.value)"></div>
        </div>
        <div class="field"><label>Model</label>
          <input class="inp" id="t_model" placeholder="Chevrolet Cobalt" value="${esc(d.tex.model||'')}" oninput="App.texField('model',this.value)"></div>
        <div class="field"><label>VIN (kuzov raqami)</label>
          <input class="inp" id="t_vin" placeholder="XXXXXXXXXXXXXXXXX" value="${esc(d.tex.vin||'')}" oninput="App.texField('vin',this.value)"></div>
        <div class="field"><label>STIR / JSHSHIR <span class="opt">(ixtiyoriy)</span></label>
          <input class="inp" id="t_stir" placeholder="000000000" inputmode="numeric" value="${esc(d.tex.stir||'')}" oninput="App.texField('stir',this.value)"></div>
      </div>

      <div class="owner-sec">
        <h3 class="owner-title">Avtomobil egasining pasporti</h3>
        <p class="owner-sub">Avtomobil kimning nomida bo'lsa — o'sha odamning pasporti. Old (rasmli) tomonini yuklang yoki seriyasini kiriting.</p>
        <div class="upload-zone" id="ownerUpload" onclick="document.getElementById('ownerFile').click()">
          <input type="file" id="ownerFile" accept="image/*" hidden onchange="App.onOwnerPhoto(event)">
          <div id="ownerPreview">
            <div class="uz-ic">${I.camera}</div>
            <div class="uz-title">Pasport old tomoni</div>
            <div class="uz-hint">Rasmga oling yoki galereyadan tanlang</div>
          </div>
          ${this.uzCamButton('ownerFileCam', "App.onOwnerPhoto(event)", 'ownerFile')}
        </div>
        <div id="ownerOcrStatus" class="ocr-status" style="display:none"></div>
        <div class="field" style="margin-top:12px"><label>Pasport seriyasi <span class="opt">(AA1234567)</span></label>
          <input class="inp" id="o_seria" placeholder="AA1234567" value="${esc((d.owner&&d.owner.seria)||'')}" oninput="App.ownerField('seria',this.value)"></div>
      </div>

      <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="App.texNext()">Davom etish</button>
      </div></div>`;
    if (d.texPhotoData) this.showTexPreview('front', d.texPhotoData);
    if (d.texBackPhotoData) this.showTexPreview('back', d.texBackPhotoData);
    if (d.owner && d.owner.photo) this.showOwnerPreview(d.owner.photo);
  },
  ownerField(k, v) {
    this.draft.owner = this.draft.owner || {};
    this.draft.owner[k] = v;
    this.saveDraftSoon();
  },
  showOwnerPreview(dataUrl) {
    const box = document.getElementById('ownerPreview');
    if (box) box.innerHTML = `<img src="${dataUrl}" class="uz-img" alt="pasport">
      <div class="uz-change">${I.refresh}<span>Almashtirish</span></div>`;
  },
  onOwnerPhoto(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const box = document.getElementById('ownerPreview');
    if (box) box.innerHTML = `<div class="uz-loading"><span class="spinner"></span><span>Yuklanmoqda...</span></div>`;
    compressImage(f, 1280, 0.7, (dataUrl) => {
      this.draft.owner = this.draft.owner || {};
      this.draft.owner.photo = dataUrl;
      this.saveDraft();
      this.showOwnerPreview(dataUrl);
      this.runOwnerOcr(dataUrl);
    });
  },
  async runOwnerOcr(dataUrl) {
    const status = document.getElementById('ownerOcrStatus');
    if (status) { status.style.display = 'flex'; status.className = 'ocr-status loading'; status.innerHTML = `<span class="spinner"></span><span>Pasport o'qilmoqda...</span>`; }
    try {
      const r = await ClientAPI.ocr(dataUrl, 'auto');
      const f = (r && r.fields) || {};
      this.draft.owner = this.draft.owner || {};
      // Seriya (2 harf + 7 raqam) yoki JSHSHIR (14 raqam)
      const seria = f.seria || f.passport_seria || '';
      const jshshir = f.jshshir || '';
      if (seria && !this.draft.owner.seria) {
        this.draft.owner.seria = seria;
        const inp = document.getElementById('o_seria'); if (inp) { inp.value = seria; inp.classList.add('ocr-filled'); }
      }
      if (jshshir) this.draft.owner.jshshir = jshshir;
      this.draft.owner._valid = isDocTextValid(r && r.text);
      this.saveDraft();
      if (status) {
        if (this.draft.owner._valid) { status.className = 'ocr-status ok'; status.innerHTML = `${I.check}<span>Pasport ma'lumoti aniqlandi — tekshiring</span>`; }
        else { status.className = 'ocr-status warn'; status.innerHTML = `<span>Qayta suratga oling — yaxshi ko'rinmayapti (yoki seriyani qo'lda kiriting)</span>`; }
      }
    } catch (err) {
      if (status) { status.className = 'ocr-status warn'; status.innerHTML = `<span>Avtomatik o'qib bo'lmadi — seriyani qo'lda kiriting</span>`; }
    }
  },
  texField(k, v) {
    this.draft.tex = this.draft.tex||{};
    this.draft.tex[k] = v;
    // Davlat raqamidan viloyatni avtomatik aniqlash (qo'lda kiritilganda ham)
    if (k === 'plate') {
      const rg = regionFromPlate(v);
      if (rg) { this.draft.region = rg; this.draft.regionAuto = rg; }
    }
    this.saveDraftSoon();
  },

  onTexPhoto(side, e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // Darrov "yuklanmoqda" ko'rsatamiz (siqish bir lahza vaqt oladi)
    const box = document.getElementById(side === 'back' ? 'texBackPreview' : 'texPreview');
    if (box) box.innerHTML = `<div class="uz-loading"><span class="spinner"></span><span>Yuklanmoqda...</span></div>`;
    // Siqish — telefon qotmasligi uchun (xom rasm o'rniga ~200KB JPEG)
    compressImage(f, 1280, 0.7, (dataUrl) => {
      if (side === 'back') this.draft.texBackPhotoData = dataUrl;
      else this.draft.texPhotoData = dataUrl;
      this.saveDraft();
      this.showTexPreview(side, dataUrl);
      this.runOcr(side, dataUrl);
    });
  },
  showTexPreview(side, dataUrl) {
    const box = document.getElementById(side === 'back' ? 'texBackPreview' : 'texPreview');
    if (box) box.innerHTML = `<img src="${dataUrl}" class="uz-img" alt="texpassport">
      <div class="uz-change">${I.refresh}<span>Almashtirish</span></div>`;
  },

  // OCR — rasmdan ma'lumot o'qish va maydonlarni to'ldirish
  async runOcr(side, dataUrl) {
    const status = document.getElementById('ocrStatus');
    if (status) {
      status.style.display = 'flex';
      status.className = 'ocr-status loading';
      status.innerHTML = `<span class="spinner"></span><span>Rasm o'qilmoqda...</span>`;
    }
    try {
      const r = await ClientAPI.ocr(dataUrl, 'texpassport');
      const f = (r && r.fields) || {};
      const map = { tex_plate:'plate', tex_seria:'seria', tex_year:'year', tex_vin:'vin', tex_stir:'stir' };
      let filled = 0;
      this.draft.tex = this.draft.tex || {};
      Object.keys(map).forEach(k => {
        if (f[k]) {
          const field = map[k];
          // Faqat bo'sh maydonni to'ldiramiz (foydalanuvchi yozganini buzmaymiz)
          if (!this.draft.tex[field]) {
            this.draft.tex[field] = f[k];
            const inp = document.getElementById('t_' + field);
            if (inp) { inp.value = f[k]; inp.classList.add('ocr-filled'); }
            filled++;
          }
        }
      });
      // Davlat raqamidan viloyatni avtomatik aniqlash
      let regionMsg = '';
      if (this.draft.tex.plate) {
        const rg = regionFromPlate(this.draft.tex.plate);
        if (rg) {
          this.draft.region = rg;
          this.draft.regionAuto = rg;
          regionMsg = ` · Hudud: ${rg}`;
        }
      }
      this.saveDraft();
      if (status) {
        if (filled > 0) {
          status.className = 'ocr-status ok';
          status.innerHTML = `${I.check}<span>${filled} ta ma'lumot aniqlandi${regionMsg} — tekshiring</span>`;
        } else {
          status.className = 'ocr-status warn';
          status.innerHTML = `<span>Ma'lumot aniqlanmadi — qo'lda kiriting</span>`;
        }
      }
    } catch (err) {
      if (status) {
        status.className = 'ocr-status warn';
        status.innerHTML = `<span>Avtomatik o'qib bo'lmadi — ma'lumotlarni qo'lda kiriting</span>`;
      }
    }
  },

  texNext() {
    // Rasm asosiy: old tomon rasmi majburiy. Ammo takroriy mijozда (oldingi
    // arizadan to'ldirilgan, raqam bor) rasm qayta talab qilinmaydi.
    const prefilled = this.draft._prefilled && this.draft.tex && this.draft.tex.plate;
    if (!this.draft.texPhotoData && !prefilled) {
      return toast('Texpassport old tomoni rasmini yuklang', 'err');
    }
    // Avtomobil egasining pasporti: seriya YOKI rasm bo'lishi shart
    const o = this.draft.owner || {};
    const hasOwner = (o.seria && o.seria.trim()) || o.jshshir || o.photo;
    if (!hasOwner && !prefilled) {
      return toast("Avtomobil egasining pasport seriyasini yoki rasmini yuklang", 'err');
    }
    this.saveDraft();
    this.flowNext('tex');
  },

  // 5b. Eski polis (faqat renew)
  flowOldPolicy() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('oldpolicy', 'Eski polis') + `
      <h2 class="flow-q">${tt("Eski polisingiz")}</h2>
      <p class="flow-sub">${tt("Mavjud polis rasmini yuklang (1 ta rasm)")}</p>
      <div class="upload-zone" id="oldUpload" onclick="document.getElementById('oldFile').click()">
        <input type="file" id="oldFile" accept="image/*" hidden onchange="App.onOldPolicy(event)">
        <div id="oldPreview">
          <div class="uz-ic">${I.doc}</div>
          <div class="uz-title">Eski polis rasmini yuklang</div>
          <div class="uz-hint">Ma'lumotlar tezroq to'ldiriladi</div>
        </div>
        ${this.uzCamButton('oldFileCam', "App.onOldPolicy(event)", 'oldFile')}
      </div>
      <div id="oldOcrStatus" class="ocr-status" style="display:none;margin-bottom:8px"></div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" onclick="App.oldNext()">Davom etish</button>
      </div></div>`;
    if (d.oldPolicyData) this.showOldPreview(d.oldPolicyData);
  },
  onOldPolicy(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const box = document.getElementById('oldPreview');
    if (box) box.innerHTML = `<div class="uz-loading"><span class="spinner"></span><span>Yuklanmoqda...</span></div>`;
    compressImage(f, 1280, 0.7, (dataUrl) => {
      this.draft.oldPolicyData = dataUrl;
      this.saveDraft();
      this.showOldPreview(dataUrl);
      this.runOldPolicyOcr(dataUrl);
    });
  },
  showOldPreview(dataUrl) {
    const box = document.getElementById('oldPreview');
    if (box) box.innerHTML = `<img src="${dataUrl}" class="uz-img" alt="polis">
      <div class="uz-change">${I.refresh}<span>Rasmni almashtirish</span></div>`;
  },
  // Eski polis rasmi to'g'ri tushganini tekshirish (JSHSHIR yoki pasport seriya bor-yo'qligi)
  async runOldPolicyOcr(dataUrl) {
    const status = document.getElementById('oldOcrStatus');
    if (status) { status.style.display='flex'; status.className='ocr-status loading'; status.innerHTML=`<span class="spinner"></span><span>Rasm tekshirilmoqda...</span>`; }
    try {
      const r = await ClientAPI.ocr(dataUrl, 'auto');
      this.draft._oldPolicyValid = isDocTextValid(r && r.text);
      this.saveDraft();
      if (status) {
        if (this.draft._oldPolicyValid) {
          status.className='ocr-status ok'; status.innerHTML=`${I.check}<span>Hujjat qabul qilindi</span>`;
        } else {
          status.className='ocr-status warn';
          status.innerHTML=`<span>Hujjat yaxshi ko'rinmayapti — qayta suratga oling</span>`;
        }
      }
    } catch (err) {
      // OCR ishlamasa ham arizani to'sib qo'ymaymiz — faqat ogohlantirmiz
      this.draft._oldPolicyValid = true;
      if (status) { status.style.display = 'none'; }
    }
  },
  oldNext() {
    if (!this.draft.oldPolicyData) return toast('Eski polis rasmini yuklang', 'err');
    if (this.draft._oldPolicyValid === false) {
      return toast("Hujjat yaxshi ko'rinmayapti — qayta suratga oling", 'err');
    }
    this.flowNext('oldpolicy');
  },

  // 6. Haydovchilar
  isUnlimited() { return /cheklovsiz/i.test(this.draft.duration || ''); },

  flowDrivers() {
    const d = this.draft;
    const unlimited = this.isUnlimited();
    const isRenew = d.app_type === 'renew';
    d.drivers = d.drivers || [];
    if (unlimited) { d.drivers = [d.drivers[0] || {}]; }
    // Yangilashda (renew) haydovchi ixtiyoriy — majburiy bo'sh yozuv qo'shilmaydi
    else if (d.drivers.length === 0 && !isRenew) { d.drivers.push({}); }
    const title = unlimited ? 'Avtomobil egasi' : (isRenew ? "Qo'shimcha haydovchilar" : 'Haydovchilar');
    const sub = unlimited
      ? "Cheklanmagan sug'urta — avtomobil egasining pasporti (yoki ID kartasi) suratga olinadi"
      : isRenew
        ? "Ixtiyoriy — yangi haydovchi qo'shmoqchi bo'lsangiz, hujjatini yuklang (5 tagacha)"
        : "Cheklangan sug'urta — har bir haydovchi hujjati suratga olinadi (5 tagacha)";
    this.root.innerHTML = this.flowHeader('drivers', title) + `
      <h2 class="flow-q">${tt(title)}</h2>
      <p class="flow-sub">${tt(sub)}</p>
      <div id="driversList">${this.renderDrivers()}</div>
      ${(!unlimited && d.drivers.length < 5) ? `<button class="btn btn-ghost btn-block" onclick="App.addDriver()">${I.plus} ${tt("Haydovchi qo'shish")}</button>` : ''}
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" onclick="App.driversNext()">Davom etish</button>
      </div></div>`;
    d.drivers.forEach((dr, i) => {
      if (dr._frontData) this.showDocPhoto(i, 'front', dr._frontData);
      if (dr._backData) this.showDocPhoto(i, 'back', dr._backData);
    });
  },
  renderDrivers() {
    const unlimited = this.isUnlimited();
    return this.draft.drivers.map((dr, i) => {
      const isBio = (dr.doc_type || 'id') === 'bio'; // 'id' = ID karta (2 tomon), 'bio' = biometrik pasport (1 tomon)
      return `
      <div class="driver-card">
        <div class="driver-head">
          <span>${unlimited ? 'Avtomobil egasi' : 'Haydovchi ' + (i+1)}</span>
          ${(!unlimited && (this.draft.drivers.length > 1 || this.draft.app_type === 'renew')) ? `<button class="driver-del" onclick="App.delDriver(${i})">${I.x}</button>` : ''}
        </div>
        <div class="doc-type-toggle">
          <button class="dt-opt ${!isBio?'sel':''}" onclick="App.setDocType(${i},'id')">ID karta</button>
          <button class="dt-opt ${isBio?'sel':''}" onclick="App.setDocType(${i},'bio')">Biometrik pasport</button>
        </div>
        <p class="doc-hint">${isBio ? "Pasportning rasmi bor sahifasini suratga oling — JSHSHIR va seriya avtomatik o'qiladi" : "ID kartaning ikkala tomonini suratga oling — JSHSHIR va seriya avtomatik o'qiladi"}</p>
        <div class="doc-uploads ${isBio?'doc-uploads-single':''}">
          <div class="upload-zone doc-up" id="docUp${i}_front" onclick="document.getElementById('docFile${i}_front').click()">
            <input type="file" id="docFile${i}_front" accept="image/*" hidden onchange="App.onDocPhoto(${i},'front',event)">
            <div id="docPrev${i}_front"><div class="uz-ic">${I.camera}</div><div class="uz-title">${isBio?'Rasmi bor sahifa':'Old tomoni'}</div><div class="uz-hint">${isBio?'Biometrik pasport':'ID karta'}</div></div>
            ${this.uzCamButton(`docFile${i}_front_cam`, `App.onDocPhoto(${i},'front',event)`, `docFile${i}_front`)}
          </div>
          ${!isBio ? `
          <div class="upload-zone doc-up" id="docUp${i}_back" onclick="document.getElementById('docFile${i}_back').click()">
            <input type="file" id="docFile${i}_back" accept="image/*" hidden onchange="App.onDocPhoto(${i},'back',event)">
            <div id="docPrev${i}_back"><div class="uz-ic">${I.camera}</div><div class="uz-title">Orqa tomoni</div><div class="uz-hint">ID karta uchun</div></div>
            ${this.uzCamButton(`docFile${i}_back_cam`, `App.onDocPhoto(${i},'back',event)`, `docFile${i}_back`)}
          </div>` : ''}
        </div>
        <div id="docStatus${i}" class="ocr-status" style="display:none;margin-bottom:14px"></div>
        <div class="field"><label>JSHSHIR (14 raqam)</label>
          <input class="inp" id="dr_jshshir${i}" inputmode="numeric" placeholder="00000000000000" value="${esc(dr.jshshir||'')}" oninput="App.driverField(${i},'jshshir',this.value)"></div>
        <div class="field"><label>Pasport seriya</label>
          <input class="inp" id="dr_seria${i}" placeholder="AB1234567" value="${esc(dr.seria||'')}" oninput="App.driverField(${i},'seria',this.value)"></div>
        <div class="field"><label>F.I.Sh <span class="opt">(ixtiyoriy)</span></label>
          <input class="inp" id="dr_name${i}" placeholder="Familiya Ism Sharif" value="${esc(dr.name||'')}" oninput="App.driverField(${i},'name',this.value)"></div>
        ${(this.appSettings && this.appSettings.require_driver_license) ? `
        <div class="field"><label>Haydovchilik guvohnomasi seriyasi</label>
          <input class="inp" id="dr_license${i}" placeholder="AB1234567" value="${esc(dr.license||'')}" oninput="App.driverField(${i},'license',this.value)"></div>` : ''}
      </div>`;
    }).join('');
  },
  setDocType(i, type) {
    this.draft.drivers[i].doc_type = type;
    if (type === 'bio') {
      // Biometrik pasportda orqa tomon kerak emas — mavjud bo'lsa tozalaymiz
      this.draft.drivers[i]._backData = null;
    }
    this.saveDraftSoon();
    this.flowDrivers();
  },
  driverField(i, k, v) { this.draft.drivers[i][k] = v; this.saveDraftSoon(); },

  onDocPhoto(i, side, e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const box = document.getElementById(`docPrev${i}_${side}`);
    if (box) box.innerHTML = `<div class="uz-loading"><span class="spinner"></span><span>Yuklanmoqda...</span></div>`;
    compressImage(f, 1280, 0.7, (dataUrl) => {
      this.draft.drivers[i][side === 'back' ? '_backData' : '_frontData'] = dataUrl;
      this.saveDraft();
      this.showDocPhoto(i, side, dataUrl);
      this.runDocOcr(i, dataUrl);
    });
  },
  showDocPhoto(i, side, dataUrl) {
    const box = document.getElementById(`docPrev${i}_${side}`);
    if (box) box.innerHTML = `<img src="${dataUrl}" class="uz-img" alt="hujjat"><div class="uz-change">${I.refresh}<span>Almashtirish</span></div>`;
  },
  async runDocOcr(i, dataUrl) {
    const status = document.getElementById('docStatus' + i);
    if (status) { status.style.display='flex'; status.className='ocr-status loading'; status.innerHTML=`<span class="spinner"></span><span>Rasm o'qilmoqda...</span>`; }
    try {
      const r = await ClientAPI.ocr(dataUrl, 'id_card');
      const f = (r && r.fields) || {};
      let filled = 0;
      if (f.jshshir && !this.draft.drivers[i].jshshir) {
        this.draft.drivers[i].jshshir = f.jshshir;
        const inp = document.getElementById('dr_jshshir' + i); if (inp){ inp.value=f.jshshir; inp.classList.add('ocr-filled'); }
        filled++;
      }
      if (f.pasport && !this.draft.drivers[i].seria) {
        this.draft.drivers[i].seria = f.pasport;
        const inp = document.getElementById('dr_seria' + i); if (inp){ inp.value=f.pasport; inp.classList.add('ocr-filled'); }
        filled++;
      }
      this.saveDraft();
      if (status) {
        if (filled > 0) {
          status.className='ocr-status ok'; status.innerHTML=`${I.check}<span>${filled} ta ma'lumot aniqlandi</span>`;
        } else if (!isDocTextValid(r && r.text)) {
          status.className='ocr-status warn';
          status.innerHTML=`<span>${I.x||''} Hujjat yaxshi ko'rinmayapti — qayta suratga oling</span>`;
        } else {
          status.className='ocr-status warn'; status.innerHTML=`<span>Aniqlanmadi — qo'lda kiriting</span>`;
        }
      }
    } catch (err) {
      if (status) { status.className='ocr-status warn'; status.innerHTML=`<span>Rasm yuklandi — ma'lumotni qo'lda kiriting</span>`; }
    }
  },

  addDriver() {
    if (this.isUnlimited() || this.draft.drivers.length >= 5) return;
    this.draft.drivers.push({});
    this.saveDraft();
    this.flowDrivers();
  },
  delDriver(i) {
    this.draft.drivers.splice(i, 1);
    this.saveDraft();
    this.flowDrivers();
  },
  driversNext() {
    // Rasm asosiy: har kishida hujjat rasmi YOKI (JSHSHIR + seriya) bo'lsin
    const ok = this.draft.drivers.every(d => d._frontData || (d.jshshir && d.seria));
    if (!ok) return toast('Har bir kishi uchun hujjat rasmini yuklang yoki JSHSHIR va seriyani kiriting', 'err');
    // Guvohnoma so'rash yoqilgan bo'lsa — majburiy
    if (this.appSettings && this.appSettings.require_driver_license) {
      const licOk = this.draft.drivers.every(d => d.license && d.license.trim());
      if (!licOk) return toast('Har bir haydovchi uchun guvohnoma seriyasini kiriting', 'err');
    }
    this.draft.coverage = this.isUnlimited() ? 'unlimited' : 'limited';
    this.flowNext('drivers');
  },

  // 7. To'lov usuli
  flowPayment() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('payment', "To'lov usuli") + `
      <h2 class="flow-q">${tt("To'lov usulini tanlang")}</h2>
      <p class="flow-sub">${tt("Sug'urta kompaniyasiga to'lov")}</p>
      <div class="choice-list">
        ${PAY_METHODS.map(p => `
          <div class="choice ${d.pay_method===p.id?'sel':''}" onclick="App.pick('pay_method','${p.id}','/new/confirm')">
            <div class="choice-ic" style="background:${p.color}1a;color:${p.color}">${I.card}</div>
            <div class="choice-txt"><h4>${p.label}</h4><p>${p.id==='card'?'Plastik karta orqali':'Ilova orqali tez to\'lov'}</p></div>
            <div class="choice-rad"></div>
          </div>`).join('')}
      </div>
      <div class="info-box" style="margin-top:20px">
        ${I.shieldCheck}
        <p>To'lov to'g'ridan-to'g'ri sug'urta kompaniyasiga, davlat narxida amalga oshiriladi</p>
      </div>
      </div></div>`;
  },

  // 8. Tasdiqlash
  flowConfirm() {
    const d = this.draft;
    const price = getPrice(d.vehicle, d.region, d.duration);
    const vehicleName = (VEHICLES.find(v=>v.id===d.vehicle)||{}).name || '';
    const durObj = DURATIONS.find(x=>x.id===d.duration) || {};
    const payObj = PAY_METHODS.find(p=>p.id===d.pay_method) || {};
    d.price = price;
    if (d.forSelf === undefined) d.forSelf = true;
    // Bonus chegirma faqat: o'ziga + karta to'lov. Aks holda tozalaymiz.
    if (d.forSelf === false || d.pay_method !== 'card') d.bonus_used = 0;
    this.saveDraft();
    const myPhone = this.user.phone || '';
    this.root.innerHTML = this.flowHeader('confirm', 'Tasdiqlash') + `
      <h2 class="flow-q">${tt('Arizani tasdiqlang')}</h2>
      <p class="flow-sub">${tt("Ma'lumotlarni tekshiring")}</p>

      <div class="client-card">
        <div class="cc-title">${tt('Polis kim uchun?')}</div>
        <div class="cc-toggle">
          <button class="cc-opt ${d.forSelf?'on':''}" onclick="App.setForSelf(true)">${tt("O'zim uchun")}</button>
          <button class="cc-opt ${!d.forSelf?'on':''}" onclick="App.setForSelf(false)">${tt('Boshqa odam uchun')}</button>
        </div>
        ${d.forSelf ? `
          <div class="cc-me">${I.phone}<span>${fmtPhone(myPhone)}</span></div>
        ` : `
          <div class="field" style="margin-top:12px"><label>${tt('Mijoz telefon raqami')}</label>
            <div class="phone-input">
              <span class="phone-prefix">+998</span>
              <input id="otherPhone" type="tel" inputmode="numeric" maxlength="9" placeholder="90 123 45 67"
                value="${esc(d.otherPhoneRaw||'')}" oninput="App.onOtherPhone(this)">
            </div>
          </div>
          <div class="field"><label>${tt('Mijoz ismi')} <span class="opt">(${tt('ixtiyoriy')})</span></label>
            <input class="inp" id="otherName" placeholder="Ism Familiya" value="${esc(d.otherName||'')}" oninput="App.draft.otherName=this.value;App.saveDraftSoon()">
          </div>
          <p class="cc-hint">${tt("Do'stingiz yoki boshqa odam uchun polis — uning raqamini kiriting")}</p>
          <div id="directBonusPreview"></div>
        `}
      </div>

      <div class="summary-card">
        <div class="sum-row"><span>${tt('Ariza turi')}</span><b>${d.app_type==='renew'?tt('Yangilash'):tt('Yangi polis')}</b></div>
        <div class="sum-row"><span>${tt('Avtomobil')}</span><b>${esc(vehicleName)}</b></div>
        <div class="sum-row"><span>${tt('Hudud')}</span><b>${esc(tt(d.region||''))}</b></div>
        <div class="sum-row"><span>${tt('Muddat')}</span><b>${durObj.label||''} · ${durObj.sub||''}</b></div>
        <div class="sum-row"><span>${tt('Davlat raqami')}</span><b>${esc((d.tex&&d.tex.plate)||'')}</b></div>
        <div class="sum-row"><span>${this.isUnlimited()?tt('Avtomobil egasi'):tt('Haydovchilar')}</span><b>${this.isUnlimited()?'1':(d.drivers||[]).length} ${tt('ta')}</b></div>
        <div class="sum-row"><span>${tt("To'lov")}</span><b>${payObj.label||''}</b></div>
        ${d.bonus_used ? `<div class="sum-row"><span>${tt('Bonus chegirma')}</span><b style="color:var(--green-700)">−${fmtSom(d.bonus_used)}</b></div>` : ''}
        <div class="sum-divider"></div>
        <div class="sum-total"><span>${tt('Jami narx')}</span><b>${fmtSom(Math.max(0, price - (d.bonus_used||0)))}</b></div>
      </div>

      <div id="bonusDiscount"></div>

      <button class="btn btn-primary btn-block btn-lg" id="submitBtn" style="margin-top:20px" onclick="App.submitApplication()">
        ${tt('Arizani yuborish')}
      </button>
      <p class="confirm-note">${tt("Yuborish orqali siz ma'lumotlaringiz to'g'riligini tasdiqlaysiz")}</p>
      </div></div>`;
    this.renderBonusDiscount();
    this.renderDirectBonusPreview();
  },
  // "Boshqa odam uchun" tanlanganda — shu ariza uchun olinadigan bonusni yorqin ko'rsatish
  async renderDirectBonusPreview() {
    const d = this.draft;
    const box = document.getElementById('directBonusPreview');
    if (!box) return;
    if (d.forSelf !== false) return;
    try {
      const est = await ClientAPI.refEstimate(d.region, d.vehicle, d.price, 'direct');
      if (!box.isConnected) return; // foydalanuvchi "O'zim uchun"ga qaytgan bo'lishi mumkin
      if (!est.enabled || !est.amount) { box.innerHTML = ''; return; }
      box.innerHTML = `
        <div class="bonus-amount-card ac-gold">
          <div class="dbc-badge">🎁 SIZGA BONUS</div>
          <div class="dbc-top">
            <div class="dbc-ic">${I.trophy}</div>
            <div class="dbc-txt">
              <span class="dbc-lab">Bu sug'urta uchun sizga</span>
              <b class="dbc-amt">${fmtSom(est.amount)}</b>
              <span class="dbc-sub">polis tayyor bo'lgach bonus balansingizga qo'shiladi</span>
            </div>
          </div>
        </div>`;
    } catch { box.innerHTML = ''; }
  },
  // Karta to'lovda bonusni chegirma sifatida taklif qilish
  async renderBonusDiscount() {
    const d = this.draft;
    const box = document.getElementById('bonusDiscount');
    if (!box) return;
    if (d.forSelf === false || d.pay_method !== 'card') { box.innerHTML = ''; return; }
    try {
      const [cfg, ub] = await Promise.all([
        this._refCfg ? Promise.resolve(this._refCfg) : ClientAPI.refConfig(),
        ClientAPI.refUser(this.user.phone),
      ]);
      this._refCfg = cfg;
      if (!cfg.enabled || !cfg.allow_discount || !(ub.balance > 0)) { box.innerHTML = ''; return; }
      const on = (d.bonus_used || 0) > 0;
      box.innerHTML = `
        <div class="bonus-use-card">
          <div class="buc-txt"><b>Bonusdan foydalanish</b><span>Balans: ${fmtSom(ub.balance)}</span></div>
          <button class="toggle ${on?'on':''}" onclick="App.toggleBonusUse(${!on}, ${ub.balance})"><span class="toggle-knob"></span></button>
        </div>`;
    } catch (e) { box.innerHTML = ''; }
  },
  toggleBonusUse(on, balance) {
    const price = this.draft.price || 0;
    this.draft.bonus_used = on ? Math.min(balance, price) : 0;
    this.saveDraft();
    this.flowConfirm();
  },
  setForSelf(v) { this.draft.forSelf = v; this.saveDraft(); this.flowConfirm(); },
  onOtherPhone(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 9);
    el.value = v;
    this.draft.otherPhoneRaw = v;
    this.saveDraftSoon();
  },

  async submitApplication() {
    const btn = document.getElementById('submitBtn');
    setLoading(btn, true, 'Yuborilmoqda...');
    const d = this.draft;
    try {
      const fd = new FormData();
      // Mijoz — o'zi yoki boshqa odam (do'st) uchun
      let clientPhone = this.user.phone;
      let clientName = (this.user.name || this.user.full_name || '');
      if (d.forSelf === false) {
        const raw = (d.otherPhoneRaw || '').replace(/\D/g, '');
        if (raw.length !== 9) { setLoading(btn, false); return toast('Mijoz telefon raqamini to\'liq kiriting (9 raqam)', 'err'); }
        clientPhone = '+998' + raw;
        clientName = d.otherName || '';
      }
      fd.append('client_phone', clientPhone);
      fd.append('client_name', clientName);
      // Referral: do'st uchun qilinsa — men referrerman; yoki havola (?ref=) orqali kelgan
      let referredBy = null;
      if (d.forSelf === false) referredBy = this.user.phone;
      else {
        const rl = localStorage.getItem('oson_ref');
        if (rl && rl !== clientPhone) referredBy = rl;
      }
      if (referredBy && referredBy !== clientPhone) {
        fd.append('referred_by', referredBy);
        fd.append('referred_via', d.forSelf === false ? 'direct' : 'link');
      }
      // Bonusni chegirma sifatida (faqat karta to'lovda)
      if (d.forSelf !== false && d.bonus_used > 0 && d.pay_method === 'card') {
        fd.append('bonus_used', String(d.bonus_used));
      }
      fd.append('app_type', d.app_type || 'new');
      fd.append('vehicle', d.vehicle || '');
      fd.append('region', d.region || '');
      fd.append('duration', d.duration || '');
      fd.append('price', String(d.price || 0));
      fd.append('pay_method', d.pay_method || '');
      fd.append('owner_doc', this.isUnlimited() ? 'passport' : (d.owner_doc || ''));
      fd.append('driver_count', String((d.drivers||[]).length));
      // drivers — faqat MATN (rasmlar alohida fayl sifatida ketadi)
      const driversText = (d.drivers || []).map(dr => ({
        jshshir: dr.jshshir || '', seria: dr.seria || '', name: dr.name || '',
        license: dr.license || '', doc_type: dr.doc_type || 'id',
      }));
      fd.append('drivers', JSON.stringify(driversText));
      const t = d.tex || {};
      fd.append('tex_plate', t.plate || '');
      fd.append('tex_seria', t.seria || '');
      fd.append('tex_model', t.model || '');
      fd.append('tex_year', t.year || '');
      fd.append('tex_vin', t.vin || '');
      fd.append('tex_stir', t.stir || '');
      // Avtomobil egasining pasporti (Gross portali uchun shart)
      const own = d.owner || {};
      fd.append('owner_seria', own.seria || '');
      fd.append('owner_jshshir', own.jshshir || '');
      if (own.photo) {
        fd.append('photo_owner_passport', dataURLtoBlob(own.photo), 'owner_passport.jpg');
      }
      // rasmlar — dataURL -> Blob
      if (d.texPhotoData) {
        fd.append('photo_tex_front', dataURLtoBlob(d.texPhotoData), 'tex_front.jpg');
      }
      if (d.texBackPhotoData) {
        fd.append('photo_tex_back', dataURLtoBlob(d.texBackPhotoData), 'tex_back.jpg');
      }
      if (d.oldPolicyData) {
        fd.append('photo_renew_policy', dataURLtoBlob(d.oldPolicyData), 'policy.jpg');
      }
      // Haydovchi/egasi hujjat rasmlari (oldi va orqasi) — backend kutgan nomlar bilan
      (d.drivers || []).forEach((dr, i) => {
        if (dr._frontData) fd.append('driver_photo_' + i, dataURLtoBlob(dr._frontData), 'doc_' + i + '_front.jpg');
        if (dr._backData)  fd.append('driver_photo_back_' + i, dataURLtoBlob(dr._backData), 'doc_' + i + '_back.jpg');
      });
      // Cheklanmagan sug'urtada — egasi pasporti maydonlariga ham
      if (this.isUnlimited() && d.drivers[0]) {
        if (d.drivers[0]._frontData) fd.append('photo_owner_front', dataURLtoBlob(d.drivers[0]._frontData), 'owner_front.jpg');
        if (d.drivers[0]._backData)  fd.append('photo_owner_back', dataURLtoBlob(d.drivers[0]._backData), 'owner_back.jpg');
      }
      const res = await ClientAPI.submitApp(fd);
      const appId = (res && (res.id || (res.app && res.app.id))) || null;
      this.clearDraft();
      this.go('/status/' + (appId || ''));
      setTimeout(()=>toast('Ariza muvaffaqiyatli yuborildi!', 'ok'), 300);
    } catch (e) {
      setLoading(btn, false);
      toast(e.message || 'Yuborishda xatolik', 'err');
    }
  },

  // ============================================================
  // ARIZALARIM
  // ============================================================
  async viewMyApps() {
    document.body.className = '';
    this.root.innerHTML = this.topbar('Arizalarim') + `
      <div class="app-shell"><div class="wrap app-main app-view">
        <div id="appsList">${this.loadingBlock()}</div>
      </div></div>${this.bottomNav('apps')}`;
    try {
      const r = await ClientAPI.myApps(this.user.phone);
      const list = Array.isArray(r) ? r : (r.items || r.apps || r.applications || []);
      const box = document.getElementById('appsList');
      if (!list.length) {
        box.innerHTML = this.emptyBlock(I.doc, 'Arizalar yo\'q', 'Birinchi arizangizni yuboring', 'Yangi ariza', 'App.startNewApp()');
        return;
      }
      list.sort((a,b)=> new Date(b.created_at||b.createdAt||0) - new Date(a.created_at||a.createdAt||0));
      box.innerHTML = list.map(a => this.appListItem(a)).join('');
    } catch (e) {
      document.getElementById('appsList').innerHTML = this.errorBlock(e.message);
    }
  },
  appListItem(a) {
    const st = a.status || 'new';
    const vehicleName = (VEHICLES.find(v=>v.id===a.vehicle)||{}).name || a.vehicle || '';
    const num = a.app_number || a.number || ('#' + String(a.id||'').slice(-5));
    return `
      <div class="applist-item" onclick="App.go('/status/${a.id}')">
        <div class="ali-ic">${a.vehicle==='yuk'?I.truck:I.car}</div>
        <div class="ali-body">
          <div class="ali-top">
            <span class="ali-num">${esc(String(num))}</span>
            ${statusBadge(st)}
          </div>
          <div class="ali-veh">${esc(vehicleName)} · ${esc(a.region||'')}</div>
          <div class="ali-meta">
            <span>${fmtSom(a.price||0)}</span>
            <span>${fmtDate(a.created_at||a.createdAt)}</span>
          </div>
        </div>
        <div class="ali-arrow">${I.arrowRight}</div>
      </div>`;
  },

  // ============================================================
  // ARIZA HOLATI (timeline)
  // ============================================================
  async viewStatus(id) {
    document.body.className = '';
    this.root.innerHTML = this.topbar('Ariza holati', '/apps') + `
      <div class="app-shell"><div class="wrap app-main app-view">
        <div id="statusBox">${this.loadingBlock()}</div>
      </div></div>${this.bottomNav('apps')}`;
    if (!id) { document.getElementById('statusBox').innerHTML = this.errorBlock('Ariza topilmadi'); return; }
    try {
      const r = await ClientAPI.appDetail(id);
      const a = r.app || r;
      this.renderStatus(a);
    } catch (e) {
      document.getElementById('statusBox').innerHTML = this.errorBlock(e.message);
    }
  },
  renderStatus(a) {
    const st = a.status || 'new';
    // Ariza detali endpointi `_id` qaytaradi (`id` emas) — sharh/chat/raqam
    // uchun ikkalasini ham hisobga olamiz, aks holda sharh yuborilmaydi.
    const appId = a.id || a._id || '';
    const num = a.app_number || a.number || ('#' + String(appId).slice(-5));
    const isRejected = st === 'rejected';
    const isReady = st === 'policy_ready' || st === 'completed';
    const curIdx = FLOW_STEPS.indexOf(st);
    const policyUrl = a.policy_file ? `${UPLOADS}/${a.policy_file}` : (a.policy_url || '');

    const banner = isRejected
      ? `<div class="status-banner err"><div class="sb-ic">${I.x}</div><div><h3>${tt('Rad etildi')}</h3><p>${esc(a.reject_reason||a.reason||tt('Iltimos, qaytadan ariza yuboring'))}</p></div></div>`
      : isReady
        ? `<div class="status-banner ok"><div class="sb-ic">${I.check}</div><div><h3>${tt('Tayyor!')}</h3><p>${tt("Polisingiz tayyor — yuklab oling")}</p></div></div>`
        : `<div class="status-banner wait"><div class="sb-ic">${I.clock}</div><div><h3>${tt(STATUS_LABEL[st]||'Jarayonda')}</h3><p>${tt("Arizangiz ko'rib chiqilmoqda")}</p></div></div>`;

    const timeline = FLOW_STEPS.map((s, i) => {
      const done = i <= curIdx && !isRejected;
      const active = i === curIdx && !isRejected;
      const last = i === FLOW_STEPS.length-1;
      return `
        <div class="tl-step">
          <div class="tl-marker">
            <div class="tl-dot ${done?'done':''} ${active?'active':''}">${done?I.check:''}</div>
            ${!last?`<div class="tl-line ${i<curIdx?'done':''}"></div>`:''}
          </div>
          <div class="tl-content ${active?'active':''}">
            <div class="tl-title">${tt(STATUS_LABEL[s])}</div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('statusBox').innerHTML = `
      ${banner}
      <div class="status-meta-card">
        <div class="smc-row"><span>${tt('Ariza raqami')}</span><b>${esc(String(num))}</b></div>
        <div class="smc-row"><span>${tt('Holat')}</span>${statusBadge(st)}</div>
      </div>

      ${policyUrl && isReady ? `
        <a class="policy-dl" href="${policyUrl}" target="_blank" download>
          <div class="pd-ic">${I.pdf}</div>
          <div class="pd-body"><h4>${tt('Polis hujjati')}</h4><p>PDF · ${tt('Yuklab olish')}</p></div>
          <div class="pd-arrow">${I.download}</div>
        </a>` : ''}

      ${(() => {
        const links = Array.isArray(a.payment_links) ? a.payment_links : [];
        const last = links.length ? links[links.length - 1] : null;
        if (!last || !(st === 'payment_pending' || st === 'approved')) return '';
        if (last.provider === 'sms') {
          return `<div class="pay-sms-note">${I.phone}<span>${tt("To'lov uchun SMS orqali havola yuborildi — telefoningizni tekshiring")}</span></div>`;
        }
        if (!last.link) return '';
        return `
        <a class="pay-link-btn" href="${esc(last.link)}" target="_blank">
          ${I.card}<span>${tt("To'lovni amalga oshirish")} — ${fmtSom(last.amount||a.price||0)}</span>
        </a>`;
      })()}

      <h3 class="section-h">${tt('Jarayon bosqichlari')}</h3>
      <div class="timeline">${timeline}</div>

      ${isReady && !a.review_submitted ? `
      <div class="review-card">
        <h3 class="section-h">${tt('Xizmatimizni baholang')}</h3>
        <div class="review-stars" id="reviewStars">
          ${[1,2,3,4,5].map(n=>`<span class="rv-star" data-n="${n}" onclick="App.setReviewStar(${n})">★</span>`).join('')}
        </div>
        <textarea class="inp" id="reviewText" rows="3" placeholder="${tt('Fikringizni yozing')} (${tt('ixtiyoriy')})"></textarea>
        <button class="btn btn-primary btn-block" id="reviewSubmitBtn" style="margin-top:10px" onclick="App.submitReview('${appId}')">${tt('Yuborish')}</button>
      </div>` : ''}

      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="App.go('/chat/${appId}')">
        ${I.chat} ${tt("Operator bilan bog'lanish")}
      </button>`;
    this._reviewRating = 0;
  },
  setReviewStar(n) {
    this._reviewRating = n;
    document.querySelectorAll('#reviewStars .rv-star').forEach((el, i) => {
      el.classList.toggle('on', i < n);
    });
  },
  async submitReview(appId) {
    if (!this._reviewRating) return toast('Yulduzcha bilan baholang', 'err');
    const btn = document.getElementById('reviewSubmitBtn');
    setLoading(btn, true);
    try {
      await ClientAPI.submitReview({
        phone: this.user.phone, app_id: appId,
        rating: this._reviewRating,
        text: document.getElementById('reviewText').value.trim(),
        name: this.user.name || this.user.full_name || '',
      });
      toast('Rahmat! Sharhingiz yuborildi', 'ok');
      const card = document.querySelector('.review-card');
      if (card) card.remove();
    } catch (e) {
      setLoading(btn, false);
      toast(e.message, 'err');
    }
  },

  // ============================================================
  // CHAT
  // ============================================================
  async viewChat(id) {
    document.body.className = 'no-scroll';
    this.chatAppId = id;
    this.root.innerHTML = this.topbar('Operator bilan chat', '/status/'+id) + `
      <div class="chat-shell">
        <div class="chat-messages" id="chatMsgs">${this.loadingBlock()}</div>
        <div class="chat-input-bar">
          <input class="chat-inp" id="chatInp" placeholder="Xabar yozing..." onkeydown="if(event.key==='Enter')App.sendChat()">
          <button class="chat-send" onclick="App.sendChat()">${I.send}</button>
        </div>
      </div>`;
    this.loadChat();
  },
  async loadChat() {
    try {
      const r = await ClientAPI.messages(this.chatAppId);
      const list = Array.isArray(r) ? r : (r.items || r.messages || []);
      const box = document.getElementById('chatMsgs');
      if (!box) return;
      if (!list.length) {
        box.innerHTML = `<div class="chat-empty">${I.chat}<p>Hozircha xabarlar yo'q.<br>Savolingizni yozing.</p></div>`;
      } else {
        box.innerHTML = list.map(m => {
          const mine = m.sender === 'client' || m.from === 'client' || m.is_client;
          return `<div class="chat-bubble ${mine?'mine':'them'}">
            <div class="cb-text">${esc(m.message||m.text||'')}</div>
            <div class="cb-time">${fmtTime(m.created_at||m.createdAt)}</div>
          </div>`;
        }).join('');
        box.scrollTop = box.scrollHeight;
      }
    } catch (e) {
      const box = document.getElementById('chatMsgs');
      if (box) box.innerHTML = this.errorBlock(e.message);
    }
  },
  async sendChat() {
    const inp = document.getElementById('chatInp');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    try {
      await ClientAPI.sendMessage(this.chatAppId, text);
      this.loadChat();
    } catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // BILDIRISHNOMALAR
  // ============================================================
  async viewNotifications() {
    document.body.className = '';
    this.root.innerHTML = this.topbar('Bildirishnomalar') + `
      <div class="app-shell"><div class="wrap app-main app-view">
        <div id="notifList">${this.loadingBlock()}</div>
      </div></div>${this.bottomNav('notifications')}`;
    try {
      const r = await ClientAPI.notifications(this.user.phone);
      const list = Array.isArray(r) ? r : (r.items || r.notifications || []);
      const box = document.getElementById('notifList');
      if (!list.length) {
        box.innerHTML = this.emptyBlock(I.bell, 'Bildirishnoma yo\'q', 'Yangiliklar shu yerda ko\'rinadi');
      } else {
        list.sort((a,b)=> new Date(b.created_at||b.createdAt||0) - new Date(a.created_at||a.createdAt||0));
        box.innerHTML = list.map(n => {
          const d = n.data || {};
          const appId = n.app_id || d.app_id;
          const media = d.image ? `<img class="ni-media" src="${esc(d.image)}" onclick="event.stopPropagation()">`
            : d.video ? `<video class="ni-media" src="${esc(d.video)}" controls onclick="event.stopPropagation()"></video>` : '';
          return `
          <div class="notif-item ${n.is_read?'':'unread'}" ${appId?`onclick="App.go('/status/${appId}')"`:''}>
            <div class="ni-ic">${I.bell}</div>
            <div class="ni-body">
              <h4>${esc(n.title||'Bildirishnoma')}</h4>
              <p>${esc(n.message||n.body||'')}</p>
              ${media}
              <span class="ni-time">${fmtDate(n.created_at||n.createdAt)}</span>
            </div>
            ${n.is_read?'':'<span class="ni-dot"></span>'}
          </div>`;
        }).join('');
      }
      // o'qilgan deb belgilash
      ClientAPI.markRead(this.user.phone).catch(()=>{});
      this.notifCount = 0;
    } catch (e) {
      document.getElementById('notifList').innerHTML = this.errorBlock(e.message);
    }
  },

  // ============================================================
  // PROFIL
  // ============================================================
  viewProfile() {
    document.body.className = '';
    const u = this.user || {};
    const name = u.name || u.full_name || '';
    const accent = this.getAccentPref();
    const ACCENTS = [
      ['green', '#14856A', 'Yashil'],
      ['blue',  '#1768AC', "Ko'k"],
    ];
    this.root.innerHTML = this.topbar('Profil') + `
      <div class="app-shell"><div class="wrap app-main app-view">
        <div class="profile-head">
          <div class="profile-avatar">${initials(name, u.phone)}</div>
          <h3>${esc(name||'Mijoz')}</h3>
          <p>${fmtPhone(u.phone||'')}</p>
        </div>

        <div class="profile-section">
          <div class="ps-item" onclick="App.editProfile()">
            <div class="psi-ic" style="background:var(--green-100);color:var(--green-700)">${I.edit}</div>
            <div class="psi-body"><h4>${tt("Ma'lumotlarni tahrirlash")}</h4><p>${tt('Ism va aloqa')}</p></div>
            ${I.arrowRight}
          </div>
          <div class="ps-item" onclick="App.go('/apps')">
            <div class="psi-ic" style="background:#DBEAFE;color:#1E40AF">${I.doc}</div>
            <div class="psi-body"><h4>${tt('Arizalarim')}</h4><p>${tt('Barcha arizalar')}</p></div>
            ${I.arrowRight}
          </div>
          <div class="ps-item" onclick="App.openSupport()">
            <div class="psi-ic" style="background:#F3E8FF;color:#6B21A8">${I.help}</div>
            <div class="psi-body"><h4>${tt('Yordam')}</h4><p>${tt('Savol va aloqa')}</p></div>
            ${I.arrowRight}
          </div>
        </div>

        <div class="profile-section appearance-card">
          <h4 class="ps-title">${tt("Ko'rinish")}</h4>
          <div class="appear-row">
            <span class="appear-lab">${tt('Til')}</span>
            <div class="cc-toggle lang-pills">
              <button class="cc-opt ${getLang()!=='ru'?'on':''}" onclick="App.setLang('uz')">O'zbek</button>
              <button class="cc-opt ${getLang()==='ru'?'on':''}" onclick="App.setLang('ru')">Русский</button>
            </div>
          </div>
          <div class="appear-row">
            <span class="appear-lab">${tt('Rang')}</span>
            <div class="accent-swatches">
              ${ACCENTS.map(([id, hex, lab]) => `
                <button class="accent-dot ${accent===id?'sel':''}" style="background:${hex}" onclick="App.setAccent('${id}')" aria-label="${lab}" title="${lab}">${accent===id?I.check:''}</button>
              `).join('')}
            </div>
          </div>
        </div>

        <button class="btn btn-ghost btn-block btn-danger" onclick="App.confirmLogout()">${I.logout} ${tt('Chiqish')}</button>
      </div></div>${this.bottomNav('profile')}`;
  },
  setLang(l) {
    setLangPref(l);
    this.route();
  },
  editProfile() {
    const u = this.user || {};
    const name = u.name || u.full_name || '';
    showModal(`
      <h3 class="modal-title">Ma'lumotlarni tahrirlash</h3>
      <div class="field"><label>F.I.Sh</label>
        <input class="inp" id="pf_name" value="${esc(name)}" placeholder="Familiya Ism"></div>
      <div class="field"><label>Telefon</label>
        <input class="inp" value="${fmtPhone(u.phone||'')}" disabled></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" id="pfSave" onclick="App.saveProfile()">Saqlash</button>
      </div>`);
  },
  async saveProfile() {
    const name = document.getElementById('pf_name').value.trim();
    if (!name) return toast('Ismni kiriting', 'err');
    const btn = document.getElementById('pfSave');
    setLoading(btn, true);
    try {
      await ClientAPI.updateMe({ name, full_name: name });
      this.user.name = name; this.user.full_name = name;
      localStorage.setItem(LS.CLIENT_USER, JSON.stringify(this.user));
      closeModal();
      toast('Saqlandi', 'ok');
      this.viewProfile();
    } catch (e) { setLoading(btn, false); toast(e.message, 'err'); }
  },
  openSupport() {
    const tg = (this.appSettings && this.appSettings.contact_admin_tg_url) || BOT_LINK;
    showModal(`
      <h3 class="modal-title">Yordam</h3>
      <p style="color:var(--ink-2);margin-bottom:16px">Savollaringiz bo'lsa biz bilan bog'laning:</p>
      <a class="support-link support-tg" href="${tg}" target="_blank" rel="noopener">${telegramLogoSVG()}<span>Telegram orqali yozish</span></a>
      <a class="support-link" href="tel:+998907772477">${I.phone}<span>+998 90 777 24 77</span></a>
      <div class="modal-actions"><button class="btn btn-ghost btn-block" onclick="closeModal()">Yopish</button></div>`);
  },
  confirmLogout() {
    showModal(`
      <h3 class="modal-title">Chiqish</h3>
      <p style="color:var(--ink-2);margin-bottom:20px">Hisobingizdan chiqmoqchimisiz?</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-danger-solid" onclick="closeModal();App.logout()">Chiqish</button>
      </div>`);
  },

  // ============================================================
  // YORDAMCHI BLOKLAR
  // ============================================================
  // Rasm yuklash zonasi uchun ikkita aniq tugma:
  //  • "Kamera"  — ilova ichidagi HAQIQIY kamerani ochadi (getUserMedia orqali).
  //    Bu capture="environment" hint'iga tayanmaydi — ba'zi brauzerlar (masalan
  //    Telegram ichki brauzeri) uni e'tiborsiz qoldirib, galereyani ochadi.
  //  • "Galereya" — xotiradan rasm tanlaydi (oddiy fayl input).
  // camId endi ishlatilmaydi (moslik uchun parametr qoldirildi).
  uzCamButton(camId, onchangeExpr, galId) {
    return `<div class="uz-actions">
        <button type="button" class="uz-act-btn cam" onclick="event.stopPropagation();App.openCamera(function(event){ ${onchangeExpr} })">${I.camera}<span>Kamera</span></button>
        <button type="button" class="uz-act-btn gal" onclick="event.stopPropagation();document.getElementById('${galId}').click()">${I.upload}<span>Galereya</span></button>
      </div>`;
  },

  // Ilova ichidagi kamera (getUserMedia). Rasm olingach, mavjud onchange
  // handleriga sintetik hodisa ({target:{files:[file]}}) bilan uzatiladi —
  // shuning uchun siqish/OCR/preview mantiqi o'zgarishsiz ishlaydi.
  openCamera(onCapture) {
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia) return this._legacyCapture(onCapture);

    let root = document.getElementById('cam-root');
    if (!root) { root = document.createElement('div'); root.id = 'cam-root'; document.body.appendChild(root); }
    root.innerHTML = `
      <style>
        .cam-overlay{position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column}
        .cam-video{flex:1;width:100%;min-height:0;object-fit:cover;background:#000}
        .cam-hint{position:absolute;top:calc(16px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);color:#fff;font-size:13.5px;font-weight:600;background:rgba(0,0,0,.45);padding:8px 16px;border-radius:99px}
        .cam-bar{display:flex;align-items:center;justify-content:space-between;padding:22px 30px calc(26px + env(safe-area-inset-bottom));background:#000;gap:20px}
        .cam-shot{width:74px;height:74px;border-radius:50%;background:#fff;border:5px solid rgba(255,255,255,.35);cursor:pointer;flex-shrink:0;transition:transform .1s}
        .cam-shot:active{transform:scale(.92)}
        .cam-btn{width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.16);border:none;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .cam-btn svg{width:24px;height:24px}
      </style>
      <div class="cam-overlay">
        <div class="cam-hint">Hujjatni ramkaga to'liq joylang</div>
        <video class="cam-video" autoplay playsinline muted></video>
        <div class="cam-bar">
          <button class="cam-btn cam-cancel" type="button" aria-label="Bekor">${I.x}</button>
          <button class="cam-shot" type="button" aria-label="Suratga olish"></button>
          <button class="cam-btn cam-flip" type="button" aria-label="Kamerani almashtirish">${I.refresh}</button>
        </div>
      </div>`;

    const video = root.querySelector('.cam-video');
    let stream = null, facing = 'environment';
    const stop = () => { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } };
    const close = () => { stop(); root.innerHTML = ''; };
    const start = async () => {
      stop();
      try {
        stream = await md.getUserMedia({ video: { facingMode: { ideal: facing } }, audio: false });
        video.srcObject = stream;
      } catch (e) {
        close();
        toast('Kameraga ruxsat berilmadi — galereyadan tanlang', 'error');
        this._legacyCapture(onCapture);
      }
    };
    root.querySelector('.cam-cancel').onclick = close;
    root.querySelector('.cam-flip').onclick = () => { facing = facing === 'environment' ? 'user' : 'environment'; start(); };
    root.querySelector('.cam-shot').onclick = () => {
      const w = video.videoWidth, h = video.videoHeight;
      if (!stream || !w || !h) return;
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (!blob) { toast('Rasm olinmadi, qayta urining', 'error'); return; }
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        close();
        try { onCapture({ target: { files: [file] } }); } catch (e) {}
      }, 'image/jpeg', 0.92);
    };
    start();
  },

  // Zaxira: getUserMedia mavjud bo'lmasa — eski capture-input usuli
  _legacyCapture(onCapture) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.setAttribute('capture', 'environment');
    inp.style.display = 'none';
    inp.onchange = (e) => { try { onCapture(e); } finally { inp.remove(); } };
    document.body.appendChild(inp);
    inp.click();
  },
  loadingBlock() { return `<div class="load-block"><div class="spinner"></div></div>`; },
  emptyBlock(icon, title, sub, btnText, btnAction) {
    return `<div class="empty-block">
      <div class="eb-ic">${icon}</div>
      <h3>${title}</h3><p>${sub}</p>
      ${btnText?`<button class="btn btn-primary" onclick="${btnAction}">${btnText}</button>`:''}
    </div>`;
  },
  errorBlock(msg) {
    return `<div class="empty-block">
      <div class="eb-ic err">${I.x}</div>
      <h3>Xatolik</h3><p>${esc(msg||'Qaytadan urinib ko\'ring')}</p>
      <button class="btn btn-ghost" onclick="App.route()">${I.refresh} Qayta yuklash</button>
    </div>`;
  },
};
