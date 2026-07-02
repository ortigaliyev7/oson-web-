/* ============================================================
   MIJOZ ILOVASI (SPA) — router + auth + dashboard
   ============================================================ */

const App = {
  root: null,
  user: null,
  draft: null,        // ariza qoralamasi
  notifCount: 0,

  init() {
    this.root = document.getElementById('app');
    this.appSettings = {};
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
    this.route();
    this.loadSettings();
    this.initPWA();
  },
  async loadSettings() {
    try {
      const s = await ClientAPI.settings();
      this.appSettings = s || {};
      if (location.hash.includes('/new/drivers')) this.flowDrivers();
    } catch (e) { /* sozlama yuklanmasa default */ }
  },

  // === PWA: ilovani o'rnatishni taklif qilish ===
  initPWA() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
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

  saveDraft() { try { localStorage.setItem(LS.DRAFT, JSON.stringify(this.draft || {})); } catch(e){} },
  saveDraftSoon() { clearTimeout(this._saveT); this._saveT = setTimeout(() => this.saveDraft(), 400); },
  clearDraft() { this.draft = null; localStorage.removeItem(LS.DRAFT); },

  logout() {
    localStorage.removeItem(LS.CLIENT_TOKEN);
    localStorage.removeItem(LS.CLIENT_USER);
    this.user = null;
    this.clearDraft();
    this.go('/');
  },

  isAuthed() { return !!localStorage.getItem(LS.CLIENT_TOKEN) && !!this.user; },

  route() {
    const hash = (location.hash || '#/').slice(1);
    const [path, ...rest] = hash.split('/').filter(Boolean);

    // Login sahifasidan chiqilsa — Telegram session pollingni to'xtatish
    if (path !== 'login') this.stopSessionPoll();

    // Himoyalangan sahifalar
    const protectedViews = ['dashboard','new','apps','status','profile','notifications','chat'];
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
      case 'profile':  return this.viewProfile();
      default:         return this.viewLanding();
    }
  },

  // Topbar (ichki sahifalar)
  topbar(title, backTo) {
    const back = backTo
      ? `<div class="app-back" onclick="App.go('${backTo}')">${I.arrowLeft}<span>Orqaga</span></div>`
      : `<div class="logo"><div class="logo-mark">${logoMarkSVG()}</div></div>`;
    return `<div class="app-topbar"><div class="wrap app-topbar-inner">
      ${back}
      ${title ? `<div class="app-title">${esc(title)}</div>` : ''}
      <div style="width:80px"></div>
    </div></div>`;
  },

  // Pastki navigatsiya
  bottomNav(active) {
    const items = [
      { k:'dashboard', ic:I.home, lab:'Asosiy', path:'/dashboard' },
      { k:'apps', ic:I.doc, lab:'Arizalar', path:'/apps' },
      { k:'notifications', ic:I.bell, lab:'Xabar', path:'/notifications', badge:this.notifCount },
      { k:'profile', ic:I.user, lab:'Profil', path:'/profile' },
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
        <a href="#features">Imkoniyatlar</a>
        <a href="#how">Qanday ishlaydi</a>
        <a href="#contact">Aloqa</a>
      </div>
      <button class="btn btn-primary btn-sm" onclick="App.go('/login')">Kirish</button>
    </div></nav>

    <header class="hero"><div class="hero-bg"></div><div class="wrap hero-grid">
      <div class="hero-text">
        <div class="hero-eyebrow">${I.shieldCheck} O'zbekistonda raqamli sug'urta</div>
        <h1>Avto sug'urta <span class="accent">bir necha daqiqada</span></h1>
        <p class="hero-sub">Ofisga borib navbatda turmang. Hujjatni suratga oling, biz polisingizni rasmiylashtiramiz va to'g'ridan-to'g'ri sug'urta kompaniyasiga davlat narxida to'laysiz.</p>
        <div class="hero-cta">
          <button class="btn btn-primary btn-lg" onclick="App.go('/login')">${I.arrowRight} Boshlash</button>
          <a href="#how" class="btn btn-outline btn-lg">Qanday ishlaydi</a>
        </div>
        <div class="hero-trust">
          <div><div class="t-num">3 daq</div><div class="t-lab">O'rtacha vaqt</div></div>
          <div><div class="t-num">14 ta</div><div class="t-lab">Barcha hudud</div></div>
          <div><div class="t-num">100%</div><div class="t-lab">Xavfsiz</div></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="phone"><div class="phone-screen"><div class="phone-notch"></div>
          ${this.phoneMockContent()}
        </div></div>
        <div class="phone-float float-1"><div class="pf-ic" style="background:var(--green-100);color:var(--green-700)">${I.shieldCheck}</div>Polis tayyor</div>
        <div class="phone-float float-2"><div class="pf-ic" style="background:#E0F7FF;color:#0052FF">${I.card}</div>To'lov qabul qilindi</div>
        <div class="phone-float float-3"><div class="pf-ic" style="background:var(--gold-l);color:var(--gold)">${I.clock}</div>3 daqiqada</div>
      </div>
    </div></header>

    <section class="section" id="features"><div class="wrap">
      <div class="section-head">
        <div class="section-eyebrow">Imkoniyatlar</div>
        <h2>Hammasi bitta ilovada</h2>
        <p>Sug'urta rasmiylashtirish uchun kerak bo'lgan barcha narsa — qulay va tez</p>
      </div>
      <div class="features-grid">
        ${[
          {ic:I.phone, t:'Telegram orqali kirish', d:"Telefon raqamingizni ulang — tasdiqlash kodi avtomatik keladi. SMS to'lovsiz va parolsiz."},
          {ic:I.camera, t:'Suratga oling', d:'Texpassport rasmini oling — ma\'lumotlar avtomatik aniqlanadi. Qo\'lda kiritish shart emas.'},
          {ic:I.clock, t:'Tezkor narx', d:'Avto turi, hudud va muddatni tanlang — narx darhol ko\'rsatiladi. Yashirin to\'lov yo\'q.'},
          {ic:I.refresh, t:'Bir qadamda yangilash', d:'Eski polis rasmini yuklang — qolgan ma\'lumotlar saqlanadi.'},
          {ic:I.card, t:'Qulay to\'lov', d:'Payme, Click yoki bank kartasi orqali to\'g\'ridan-to\'g\'ri kompaniyaga.'},
          {ic:I.pdf, t:'PDF polis', d:'Tayyor polis PDF formatda. Xohlagan vaqtda yuklab oling va ko\'rsating.'},
        ].map(f => `<div class="feature">
          <div class="feature-ic">${f.ic}</div>
          <h3>${f.t}</h3><p>${f.d}</p>
        </div>`).join('')}
      </div>
    </div></section>

    <section class="section" id="how" style="background:#fff"><div class="wrap">
      <div class="section-head">
        <div class="section-eyebrow">Jarayon</div>
        <h2>To'rt oddiy qadam</h2>
        <p>Arizadan polisgacha — soddalashtirilgan jarayon</p>
      </div>
      <div class="steps-rail">
        ${[
          {t:'Kirish', d:'Telefon raqamingiz orqali tizimga kiring'},
          {t:'Ariza to\'ldirish', d:'Avto ma\'lumotlari va hujjat rasmlarini yuboring'},
          {t:'To\'lov', d:'Payme, Click yoki karta orqali to\'lang'},
          {t:'Polisni oling', d:'Tayyor polisni PDF formatda yuklab oling'},
        ].map((s,i) => `<div class="step-card">
          <div class="step-num">${i+1}</div>
          <h3>${s.t}</h3><p>${s.d}</p>
        </div>`).join('')}
      </div>
    </div></section>

    <section class="section"><div class="wrap">
      <div class="cta-banner">
        <h2>Hoziroq boshlang</h2>
        <p>Bir necha daqiqada sug'urta polisingizni rasmiylashtiring. Tez, qulay va ishonchli.</p>
        <button class="btn btn-white btn-lg" onclick="App.go('/login')">${I.arrowRight} Ariza topshirish</button>
      </div>
    </div></section>

    <footer class="footer" id="contact"><div class="wrap">
      <div class="footer-grid">
        <div>
          <div class="logo"><div class="logo-mark">${logoMarkSVG()}</div>Oson Sug'urtam</div>
          <p>O'zbekistonda avtomobil sug'urtasini onlayn rasmiylashtirish xizmati. «EVAZ» MChJ.</p>
        </div>
        <div>
          <h4>Xizmatlar</h4>
          <div class="footer-links">
            <a href="#features">Yangi polis</a>
            <a href="#features">Polisni yangilash</a>
            <a href="#how">Qanday ishlaydi</a>
          </div>
        </div>
        <div>
          <h4>Aloqa</h4>
          <div class="footer-links">
            <a href="tel:+998907772477">+998 90 777 24 77</a>
            <a href="${BOT_LINK}" target="_blank" rel="noopener">Telegram orqali yozish</a>
            <a href="privacy-policy.html">Maxfiylik siyosati</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 «EVAZ» MChJ</span>
        <span>Farg'ona viloyati, O'zbekiston</span>
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
        <div style="font-size:13px;opacity:.8;margin-top:4px">Avto sug'urta</div>
      </div>
      <div style="margin-top:auto;background:rgba(255,255,255,.12);border-radius:16px;padding:16px;backdrop-filter:blur(8px)">
        <div style="font-size:12px;opacity:.8">Ariza #A-1042</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
          <div style="width:28px;height:28px;background:#2BB673;border-radius:50%;display:grid;place-items:center">${I.check}</div>
          <div style="font-weight:600;font-size:14px">Polis tayyor</div>
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
          <h2>Sug'urta endi<br>oson va tez</h2>
          <p>Telegram orqali bir tugma bilan kiring va bir necha daqiqada polisingizni rasmiylashtiring.</p>
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

  loginPhoneStep() {
    return `
      <div class="app-back" onclick="App.go('/')" style="margin-bottom:20px">${I.arrowLeft}<span>Bosh sahifa</span></div>
      <h1>Tizimga kirish</h1>
      <p class="sub">Telegram orqali bir tugma bilan kiring — telefon raqamini yozish shart emas</p>

      <div class="tg-login-hero">
        <div class="tg-login-logo">${telegramLogoSVG()}</div>
        <h3>Telegram orqali kirish</h3>
        <p>Telegram'da "Boshlash" va "Raqamni ulash" tugmalarini bossangiz — raqamingiz avtomatik bog'lanadi va kod darrov keladi.</p>
      </div>

      <div class="tg-steps tg-steps-compact">
        <div class="tg-step"><span class="tg-step-n">1</span><div>Pastdagi tugmani bosing — Telegram ochiladi</div></div>
        <div class="tg-step"><span class="tg-step-n">2</span><div><b>"Boshlash"</b> va <b>"📱 Raqamni ulash"</b>ni bosing</div></div>
        <div class="tg-step"><span class="tg-step-n">3</span><div>Kod keladi — bu yerda avtomatik davom etadi</div></div>
      </div>

      <a class="btn btn-tg btn-block btn-lg tg-login-btn disabled" id="tgLoginBtn" target="_blank" rel="noopener"
         onclick="App.onTgLoginClick(event)">
        ${telegramLogoSVG()} <span>Telegram orqali kirish</span>
      </a>

      <div class="login-alt">
        <a onclick="App.showPhoneEntry()">Telegram'siz, telefon raqami bilan kirish</a>
      </div>`;
  },

  showPhoneEntry() {
    this.stopSessionPoll();
    const box = document.getElementById('authBox');
    box.innerHTML = `
      <div class="app-back" onclick="App.viewLogin()" style="margin-bottom:20px">${I.arrowLeft}<span>Orqaga</span></div>
      <h1>Telefon bilan kirish</h1>
      <p class="sub">Telefon raqamingizni kiriting — tasdiqlash kodi yuboramiz</p>
      <div class="field">
        <label class="label">Telefon raqam</label>
        <div class="phone-input">
          <span class="phone-prefix">+998</span>
          <input id="phoneInput" type="tel" inputmode="numeric" maxlength="9" placeholder="90 123 45 67"
            value="${this.loginPhone}" oninput="App.onPhoneInput(this)">
        </div>
      </div>
      <div class="tg-info">
        <div class="tg-info-ic">${telegramLogoSVG()}</div>
        <div class="tg-info-txt">
          <b>Kod Telegram orqali keladi</b>
          <span>Avval Telegram'da raqamingizni ulagan bo'lsangiz, kod darrov keladi</span>
        </div>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="sendBtn" onclick="App.sendCode()">Kod olish ${I.arrowRight}</button>`;
    setTimeout(() => { const i = document.getElementById('phoneInput'); if (i) i.focus(); }, 100);
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
    try {
      const r = await ClientAPI.startSession();
      this.sessionToken = r.token;
      window.open(`${BOT_LINK}?start=${r.token}`, '_blank');
      this.renderTelegramWaiting();
      this.pollSession();
    } catch (e) {
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
        if (s && s.ready && s.phone) {
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
    const digits = (this.loginPhone || '').replace(/\D/g, '');
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
        <h1 class="tg-title">Kodni kiriting</h1>
        <p class="tg-sub"><b>${esc(fmtPhone(this.loginFullPhone))}</b> raqamiga yuborilgan<br>6 xonali kodni kiriting</p>
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
      localStorage.setItem(LS.CLIENT_TOKEN, r.token);
      this.user = r.user || { phone: this.loginFullPhone };
      localStorage.setItem(LS.CLIENT_USER, JSON.stringify(this.user));
      toast('Xush kelibsiz!', 'success');
      this.go('/dashboard');
    } catch (e) {
      toast(e.message || 'Kod noto\'g\'ri', 'error');
      setLoading(btn, false);
      cells.forEach(c => c.value = '');
      if (cells[0]) cells[0].focus();
    }
  },

  // ============================================================
  // DASHBOARD
  // ============================================================
  async viewDashboard() {
    document.body.className = '';
    const name = (this.user && (this.user.name || this.user.full_name)) || '';
    const firstName = name ? name.split(/\s+/)[0] : 'Mijoz';
    this.root.innerHTML = `
      ${this.topbar('')}
      <div class="app-shell"><div class="wrap app-main app-view">
        <div class="greeting">Assalomu alaykum,</div>
        <div class="greeting-name">${esc(firstName)}!</div>

        <div class="hero-card">
          <h2>Sug'urta polisini rasmiylashtiring</h2>
          <p>Bir necha daqiqada, ofisga bormasdan</p>
          <div class="hc-shield">${I.shieldCheck}</div>
        </div>

        <div class="action-card" onclick="App.startNewApp()">
          <div class="ac-plus">${I.plus}</div>
          <div><h3>Yangi ariza</h3><p>3-5 daqiqada to'ldiring</p></div>
          <div class="ac-arrow">${I.arrowRight}</div>
        </div>

        <div class="tiles">
          <div class="tile" onclick="App.go('/apps')">
            <div class="tile-ic" style="background:#DBEAFE;color:#1E40AF">${I.doc}</div>
            <h4>Arizalarim</h4><p>Holatlarni kuzating</p>
          </div>
          <div class="tile" onclick="App.go('/notifications')">
            <div class="tile-ic" style="background:var(--gold-l);color:var(--gold)">${I.bell}</div>
            ${this.notifCount?`<span class="tile-badge">${this.notifCount}</span>`:''}
            <h4>Bildirishnoma</h4><p>Yangiliklar</p>
          </div>
          <div class="tile" onclick="App.startRenew()">
            <div class="tile-ic" style="background:var(--green-100);color:var(--green-700)">${I.refresh}</div>
            <h4>Polisni yangilash</h4><p>Tez yangilash</p>
          </div>
          <div class="tile" onclick="App.go('/profile')">
            <div class="tile-ic" style="background:#F3E8FF;color:#6B21A8">${I.user}</div>
            <h4>Profil</h4><p>Sozlamalar</p>
          </div>
        </div>

        <div class="card card-pad" style="margin-top:20px;display:flex;gap:16px;align-items:center;background:var(--green-50);border-color:var(--green-100)">
          <div style="width:48px;height:48px;color:var(--green-700);flex-shrink:0">${I.shieldCheck}</div>
          <div>
            <h4 style="font-size:15px;margin-bottom:2px">100% xavfsiz</h4>
            <p style="font-size:13.5px;color:var(--ink-2)">Ma'lumotlaringiz shifrlangan kanallar orqali himoyalangan</p>
          </div>
        </div>
      </div></div>
      ${this.bottomNav('dashboard')}`;
    this.refreshNotifCount();
  },

  async refreshNotifCount() {
    if (!this.user || !this.user.phone) return;
    try {
      const r = await ClientAPI.notifications(this.user.phone);
      const list = Array.isArray(r) ? r : (r.items || r.notifications || []);
      this.notifCount = list.filter(n => !n.read).length;
      // badge yangilash
      document.querySelectorAll('.bn-badge').forEach(b => {});
    } catch {}
  },

  startNewApp() {
    this.draft = { app_type: 'new', drivers: [] };
    this.saveDraft();
    this.go('/new/type');
  },
  startRenew() {
    this.draft = { app_type: 'renew', drivers: [] };
    this.saveDraft();
    this.go('/new/vehicle');
  },

  // ============================================================
  // YANGI ARIZA — ko'p bosqichli oqim
  // ============================================================
  flowSteps() {
    // renew bo'lsa "type" o'tkazib yuboriladi
    const base = this.draft && this.draft.app_type === 'renew'
      ? ['vehicle','region','duration','tex','oldpolicy','drivers','payment','confirm']
      : ['type','vehicle','region','duration','tex','drivers','payment','confirm'];
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
        <div class="flow-back" onclick="App.flowPrev('${step}')">${I.arrowLeft}<span>Orqaga</span></div>
        <div class="flow-progress">
          <div class="fp-track"><div class="fp-fill" style="width:${pct}%"></div></div>
          <div class="fp-label">${idx+1} / ${total} qadam</div>
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
      <h2 class="flow-q">Qanday ariza?</h2>
      <p class="flow-sub">Yangi polis yoki mavjudini yangilash</p>
      <div class="choice-list">
        <div class="choice ${d.app_type==='new'?'sel':''}" onclick="App.selectAndGo(this,'app_type','new','/new/vehicle')">
          <div class="choice-ic" style="background:var(--green-100);color:var(--green-700)">${I.plus}</div>
          <div class="choice-txt"><h4>Yangi polis</h4><p>Birinchi marta rasmiylashtirish</p></div>
          <div class="choice-rad"></div>
        </div>
        <div class="choice ${d.app_type==='renew'?'sel':''}" onclick="App.selectAndGo(this,'app_type','renew','/new/vehicle')">
          <div class="choice-ic" style="background:#DBEAFE;color:#1E40AF">${I.refresh}</div>
          <div class="choice-txt"><h4>Polisni yangilash</h4><p>Eski polis asosida tez yangilash</p></div>
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
    this.go('/new/vehicle');
  },

  // 2. Avto turi
  flowVehicle() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('vehicle', 'Avtomobil turi') + `
      <h2 class="flow-q">Avtomobil turini tanlang</h2>
      <p class="flow-sub">Sug'urta narxi turga bog'liq</p>
      <div class="choice-list">
        ${VEHICLES.map(v => `
          <div class="choice ${d.vehicle===v.id?'sel':''}" onclick="App.selectAndGo(this,'vehicle','${v.id}','/new/region')">
            <div class="choice-ic" style="background:var(--green-100);color:var(--green-700)">${v.id==='yuk'?I.truck:I.car}</div>
            <div class="choice-txt"><h4>${v.name}</h4><p>${v.desc}</p></div>
            <div class="choice-rad"></div>
          </div>`).join('')}
      </div>
      </div></div>`;
  },

  // 3. Hudud
  flowRegion() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('region', 'Hudud') + `
      <h2 class="flow-q">Hududingizni tanlang</h2>
      <p class="flow-sub">Avtomobil ro'yxatdan o'tgan hudud</p>
      <div class="region-grid">
        ${REGIONS.map((r, i) => `
          <div class="region-chip ${d.region===r.name?'sel':''}" data-i="${i}" onclick="App.pickRegion(${i})">
            ${esc(r.name)}
          </div>`).join('')}
      </div>
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
      <h2 class="flow-q">Sug'urta muddati</h2>
      <p class="flow-sub">Muddat va qoplamani tanlang</p>
      <div class="dur-list">
        ${DURATIONS.map(dur => {
          const price = getPrice(d.vehicle, d.region, dur.id);
          return `
          <div class="dur-card ${d.duration===dur.id?'sel':''}" onclick="App.selectAndGo(this,'duration','${dur.id}','/new/tex')">
            ${dur.popular?`<span class="dur-pop">Mashhur</span>`:''}
            <div class="dur-main">
              <div class="dur-label">${dur.label}</div>
              <div class="dur-sub">${dur.sub}</div>
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
      <h2 class="flow-q">Avtomobil ma'lumotlari</h2>
      <p class="flow-sub">Texpassport rasmini oling — ma'lumotlar avtomatik aniqlanadi</p>

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

      <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="App.texNext()">Davom etish</button>
      </div></div>`;
    if (d.texPhotoData) this.showTexPreview('front', d.texPhotoData);
    if (d.texBackPhotoData) this.showTexPreview('back', d.texBackPhotoData);
  },
  texField(k, v) { this.draft.tex = this.draft.tex||{}; this.draft.tex[k] = v; this.saveDraftSoon(); },

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
      this.saveDraft();
      if (status) {
        if (filled > 0) {
          status.className = 'ocr-status ok';
          status.innerHTML = `${I.check}<span>${filled} ta ma'lumot aniqlandi — tekshiring va to'ldiring</span>`;
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
    // Rasm asosiy: faqat old tomon rasmi majburiy. Qolgan ma'lumotlar OCR/admin orqali.
    if (!this.draft.texPhotoData) return toast('Texpassport old tomoni rasmini yuklang', 'err');
    this.saveDraft();
    this.flowNext('tex');
  },

  // 5b. Eski polis (faqat renew)
  flowOldPolicy() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('oldpolicy', 'Eski polis') + `
      <h2 class="flow-q">Eski polisingiz</h2>
      <p class="flow-sub">Mavjud polis rasmini yuklang</p>
      <div class="upload-zone" id="oldUpload" onclick="document.getElementById('oldFile').click()">
        <input type="file" id="oldFile" accept="image/*" hidden onchange="App.onOldPolicy(event)">
        <div id="oldPreview">
          <div class="uz-ic">${I.doc}</div>
          <div class="uz-title">Eski polis rasmini yuklang</div>
          <div class="uz-hint">Ma'lumotlar tezroq to'ldiriladi</div>
        </div>
        ${this.uzCamButton('oldFileCam', "App.onOldPolicy(event)", 'oldFile')}
      </div>
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:24px" onclick="App.oldNext()">Davom etish</button>
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
    });
  },
  showOldPreview(dataUrl) {
    const box = document.getElementById('oldPreview');
    if (box) box.innerHTML = `<img src="${dataUrl}" class="uz-img" alt="polis">
      <div class="uz-change">${I.refresh}<span>Rasmni almashtirish</span></div>`;
  },
  oldNext() {
    if (!this.draft.oldPolicyData) return toast('Eski polis rasmini yuklang', 'err');
    this.flowNext('oldpolicy');
  },

  // 6. Haydovchilar
  isUnlimited() { return /cheklovsiz/i.test(this.draft.duration || ''); },

  flowDrivers() {
    const d = this.draft;
    const unlimited = this.isUnlimited();
    d.drivers = d.drivers || [];
    if (unlimited) { d.drivers = [d.drivers[0] || {}]; }
    else if (d.drivers.length === 0) { d.drivers.push({}); }
    const title = unlimited ? 'Avtomobil egasi' : 'Haydovchilar';
    const sub = unlimited
      ? "Cheklanmagan sug'urta — avtomobil egasining pasporti (yoki ID kartasi) suratga olinadi"
      : "Cheklangan sug'urta — har bir haydovchi hujjati suratga olinadi (5 tagacha)";
    this.root.innerHTML = this.flowHeader('drivers', title) + `
      <h2 class="flow-q">${title}</h2>
      <p class="flow-sub">${sub}</p>
      <div id="driversList">${this.renderDrivers()}</div>
      ${(!unlimited && d.drivers.length < 5) ? `<button class="btn btn-ghost btn-block" onclick="App.addDriver()">${I.plus} Haydovchi qo'shish</button>` : ''}
      <button class="btn btn-primary btn-block btn-lg" style="margin-top:16px" onclick="App.driversNext()">Davom etish</button>
      </div></div>`;
    d.drivers.forEach((dr, i) => {
      if (dr._frontData) this.showDocPhoto(i, 'front', dr._frontData);
      if (dr._backData) this.showDocPhoto(i, 'back', dr._backData);
    });
  },
  renderDrivers() {
    const unlimited = this.isUnlimited();
    return this.draft.drivers.map((dr, i) => `
      <div class="driver-card">
        <div class="driver-head">
          <span>${unlimited ? 'Avtomobil egasi' : 'Haydovchi ' + (i+1)}</span>
          ${(!unlimited && this.draft.drivers.length > 1) ? `<button class="driver-del" onclick="App.delDriver(${i})">${I.x}</button>` : ''}
        </div>
        <p class="doc-hint">ID karta yoki biometrik pasport — JSHSHIR va seriya avtomatik o'qiladi</p>
        <div class="doc-uploads">
          <div class="upload-zone doc-up" id="docUp${i}_front" onclick="document.getElementById('docFile${i}_front').click()">
            <input type="file" id="docFile${i}_front" accept="image/*" hidden onchange="App.onDocPhoto(${i},'front',event)">
            <div id="docPrev${i}_front"><div class="uz-ic">${I.camera}</div><div class="uz-title">Old tomoni</div><div class="uz-hint">ID / biometrik</div></div>
            ${this.uzCamButton(`docFile${i}_front_cam`, `App.onDocPhoto(${i},'front',event)`, `docFile${i}_front`)}
          </div>
          <div class="upload-zone doc-up" id="docUp${i}_back" onclick="document.getElementById('docFile${i}_back').click()">
            <input type="file" id="docFile${i}_back" accept="image/*" hidden onchange="App.onDocPhoto(${i},'back',event)">
            <div id="docPrev${i}_back"><div class="uz-ic">${I.camera}</div><div class="uz-title">Orqa tomoni</div><div class="uz-hint">ID karta uchun</div></div>
            ${this.uzCamButton(`docFile${i}_back_cam`, `App.onDocPhoto(${i},'back',event)`, `docFile${i}_back`)}
          </div>
        </div>
        <div id="docStatus${i}" class="ocr-status" style="display:none;margin-bottom:14px"></div>
        <div class="field"><label>JSHSHIR (14 raqam)</label>
          <input class="inp" id="dr_jshshir${i}" inputmode="numeric" placeholder="00000000000000" value="${esc(dr.jshshir||'')}" oninput="App.driverField(${i},'jshshir',this.value)"></div>
        <div class="field"><label>Pasport seriya</label>
          <input class="inp" id="dr_seria${i}" placeholder="AB1234567" value="${esc(dr.seria||'')}" oninput="App.driverField(${i},'seria',this.value)"></div>
        <div class="field"><label>F.I.Sh <span class="opt">(ixtiyoriy)</span></label>
          <input class="inp" id="dr_name${i}" placeholder="Familiya Ism Sharif" value="${esc(dr.name||'')}" oninput="App.driverField(${i},'name',this.value)"></div>
      </div>`).join('');
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
        if (filled > 0) { status.className='ocr-status ok'; status.innerHTML=`${I.check}<span>${filled} ta ma'lumot aniqlandi</span>`; }
        else { status.className='ocr-status warn'; status.innerHTML=`<span>Aniqlanmadi — qo'lda kiriting</span>`; }
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
    this.draft.coverage = this.isUnlimited() ? 'unlimited' : 'limited';
    this.flowNext('drivers');
  },

  // 7. To'lov usuli
  flowPayment() {
    const d = this.draft;
    this.root.innerHTML = this.flowHeader('payment', "To'lov usuli") + `
      <h2 class="flow-q">To'lov usulini tanlang</h2>
      <p class="flow-sub">Sug'urta kompaniyasiga to'lov</p>
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
    this.saveDraft();
    const myPhone = this.user.phone || '';
    this.root.innerHTML = this.flowHeader('confirm', 'Tasdiqlash') + `
      <h2 class="flow-q">Arizani tasdiqlang</h2>
      <p class="flow-sub">Ma'lumotlarni tekshiring</p>

      <div class="client-card">
        <div class="cc-title">Polis kim uchun?</div>
        <div class="cc-toggle">
          <button class="cc-opt ${d.forSelf?'on':''}" onclick="App.setForSelf(true)">O'zim uchun</button>
          <button class="cc-opt ${!d.forSelf?'on':''}" onclick="App.setForSelf(false)">Boshqa odam uchun</button>
        </div>
        ${d.forSelf ? `
          <div class="cc-me">${I.phone}<span>${fmtPhone(myPhone)}</span></div>
        ` : `
          <div class="field" style="margin-top:12px"><label>Mijoz telefon raqami</label>
            <div class="phone-input">
              <span class="phone-prefix">+998</span>
              <input id="otherPhone" type="tel" inputmode="numeric" maxlength="9" placeholder="90 123 45 67"
                value="${esc(d.otherPhoneRaw||'')}" oninput="App.onOtherPhone(this)">
            </div>
          </div>
          <div class="field"><label>Mijoz ismi <span class="opt">(ixtiyoriy)</span></label>
            <input class="inp" id="otherName" placeholder="Ism Familiya" value="${esc(d.otherName||'')}" oninput="App.draft.otherName=this.value;App.saveDraftSoon()">
          </div>
          <p class="cc-hint">Do'stingiz yoki boshqa odam uchun polis — uning raqamini kiriting</p>
        `}
      </div>

      <div class="summary-card">
        <div class="sum-row"><span>Ariza turi</span><b>${d.app_type==='renew'?'Yangilash':'Yangi polis'}</b></div>
        <div class="sum-row"><span>Avtomobil</span><b>${esc(vehicleName)}</b></div>
        <div class="sum-row"><span>Hudud</span><b>${esc(d.region||'')}</b></div>
        <div class="sum-row"><span>Muddat</span><b>${durObj.label||''} · ${durObj.sub||''}</b></div>
        <div class="sum-row"><span>Davlat raqami</span><b>${esc((d.tex&&d.tex.plate)||'')}</b></div>
        <div class="sum-row"><span>${this.isUnlimited()?'Avtomobil egasi':'Haydovchilar'}</span><b>${this.isUnlimited()?'1 ta':(d.drivers||[]).length+' ta'}</b></div>
        <div class="sum-row"><span>To'lov</span><b>${payObj.label||''}</b></div>
        <div class="sum-divider"></div>
        <div class="sum-total"><span>Jami narx</span><b>${fmtSom(price)}</b></div>
      </div>

      <button class="btn btn-primary btn-block btn-lg" id="submitBtn" style="margin-top:20px" onclick="App.submitApplication()">
        Arizani yuborish
      </button>
      <p class="confirm-note">Yuborish orqali siz ma'lumotlaringiz to'g'riligini tasdiqlaysiz</p>
      </div></div>`;
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
        jshshir: dr.jshshir || '', seria: dr.seria || '', name: dr.name || ''
      }));
      fd.append('drivers', JSON.stringify(driversText));
      const t = d.tex || {};
      fd.append('tex_plate', t.plate || '');
      fd.append('tex_seria', t.seria || '');
      fd.append('tex_model', t.model || '');
      fd.append('tex_year', t.year || '');
      fd.append('tex_vin', t.vin || '');
      fd.append('tex_stir', t.stir || '');
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
    const num = a.app_number || a.number || ('#' + String(a.id||'').slice(-5));
    const isRejected = st === 'rejected';
    const isReady = st === 'policy_ready' || st === 'completed';
    const curIdx = FLOW_STEPS.indexOf(st);
    const policyUrl = a.policy_file ? `${UPLOADS}/${a.policy_file}` : (a.policy_url || '');

    const banner = isRejected
      ? `<div class="status-banner err"><div class="sb-ic">${I.x}</div><div><h3>Rad etildi</h3><p>${esc(a.reject_reason||a.reason||'Iltimos, qaytadan ariza yuboring')}</p></div></div>`
      : isReady
        ? `<div class="status-banner ok"><div class="sb-ic">${I.check}</div><div><h3>Tayyor!</h3><p>Polisingiz tayyor — yuklab oling</p></div></div>`
        : `<div class="status-banner wait"><div class="sb-ic">${I.clock}</div><div><h3>${STATUS_LABEL[st]||'Jarayonda'}</h3><p>Arizangiz ko'rib chiqilmoqda</p></div></div>`;

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
            <div class="tl-title">${STATUS_LABEL[s]}</div>
          </div>
        </div>`;
    }).join('');

    document.getElementById('statusBox').innerHTML = `
      ${banner}
      <div class="status-meta-card">
        <div class="smc-row"><span>Ariza raqami</span><b>${esc(String(num))}</b></div>
        <div class="smc-row"><span>Holat</span>${statusBadge(st)}</div>
      </div>

      ${policyUrl && isReady ? `
        <a class="policy-dl" href="${policyUrl}" target="_blank" download>
          <div class="pd-ic">${I.pdf}</div>
          <div class="pd-body"><h4>Polis hujjati</h4><p>PDF · Yuklab olish</p></div>
          <div class="pd-arrow">${I.download}</div>
        </a>` : ''}

      ${a.payment_link && (st==='payment_pending'||st==='approved') ? `
        <a class="pay-link-btn" href="${esc(a.payment_link)}" target="_blank">
          ${I.card}<span>To'lovni amalga oshirish — ${fmtSom(a.price||0)}</span>
        </a>` : ''}

      <h3 class="section-h">Jarayon bosqichlari</h3>
      <div class="timeline">${timeline}</div>

      <button class="btn btn-ghost btn-block" style="margin-top:8px" onclick="App.go('/chat/${a.id}')">
        ${I.chat} Operator bilan bog'lanish
      </button>`;
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
        list.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
        box.innerHTML = list.map(n => `
          <div class="notif-item ${n.read?'':'unread'}" ${n.app_id?`onclick="App.go('/status/${n.app_id}')"`:''}>
            <div class="ni-ic">${I.bell}</div>
            <div class="ni-body">
              <h4>${esc(n.title||'Bildirishnoma')}</h4>
              <p>${esc(n.message||n.body||'')}</p>
              <span class="ni-time">${fmtDate(n.created_at)}</span>
            </div>
            ${n.read?'':'<span class="ni-dot"></span>'}
          </div>`).join('');
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
            <div class="psi-body"><h4>Ma'lumotlarni tahrirlash</h4><p>Ism va aloqa</p></div>
            ${I.arrowRight}
          </div>
          <div class="ps-item" onclick="App.go('/apps')">
            <div class="psi-ic" style="background:#DBEAFE;color:#1E40AF">${I.doc}</div>
            <div class="psi-body"><h4>Arizalarim</h4><p>Barcha arizalar</p></div>
            ${I.arrowRight}
          </div>
          <div class="ps-item" onclick="App.openSupport()">
            <div class="psi-ic" style="background:#F3E8FF;color:#6B21A8">${I.help}</div>
            <div class="psi-body"><h4>Yordam</h4><p>Savol va aloqa</p></div>
            ${I.arrowRight}
          </div>
        </div>

        <button class="btn btn-ghost btn-block btn-danger" onclick="App.confirmLogout()">${I.logout} Chiqish</button>
      </div></div>${this.bottomNav('profile')}`;
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
  // Rasm yuklash zonasi uchun ikkita aniq tugma: "Kamera" to'g'ridan-to'g'ri
  // kamerani ochadi (capture="environment"), "Galereya" esa capture'siz inputni
  // ochib xotiradan rasm tanlash imkonini beradi.
  uzCamButton(camId, onchangeExpr, galId) {
    return `<input type="file" id="${camId}" accept="image/*" capture="environment" hidden onchange="${onchangeExpr}">
      <div class="uz-actions">
        <button type="button" class="uz-act-btn cam" onclick="event.stopPropagation();document.getElementById('${camId}').click()">${I.camera}<span>Kamera</span></button>
        <button type="button" class="uz-act-btn gal" onclick="event.stopPropagation();document.getElementById('${galId}').click()">${I.upload}<span>Galereya</span></button>
      </div>`;
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
