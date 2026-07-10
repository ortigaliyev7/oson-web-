/* ============================================================
   ADMIN PANEL (SPA)
   ============================================================ */

const Admin = {
  root: null,
  admin: null,
  apps: [],
  filter: 'all',
  pollTimer: null,

  init() {
    this.root = document.getElementById('admin');
    const a = localStorage.getItem(LS.ADMIN_USER);
    if (a) { try { this.admin = JSON.parse(a); } catch {} }
    window.addEventListener('hashchange', () => this.route());
    // Token yaroqsiz (401) bo'lsa — tozalab, login'ga qaytaramiz (osilib qolmasligi uchun)
    window.addEventListener('oson:session-expired', () => {
      if (this._sessionEnding) return;
      if (localStorage.getItem(LS.ADMIN_TOKEN)) {
        this._sessionEnding = true;
        this.stopPolling();
        toast('Sessiya muddati tugadi. Iltimos, qaytadan kiring.', 'err');
        localStorage.removeItem(LS.ADMIN_TOKEN);
        localStorage.removeItem(LS.ADMIN_USER);
        this.admin = null;
        this.go('/login');
        setTimeout(() => { this._sessionEnding = false; }, 1500);
      }
    });
    this.route();
    if (this.isAuthed()) this.initSocket();
  },

  // === REAL VAQT (Socket.io) — yangi ariza, status, mijoz xabari darhol keladi ===
  async initSocket() {
    if (this._socket) return;
    try {
      const io = await loadSocketIO();
      const socket = io(SOCKET, { transports: ['websocket', 'polling'] });
      this._socket = socket;
      socket.on('connect', () => socket.emit('join_admin'));

      socket.on('new_application', (app) => {
        playNotifSound();
        toast(`🆕 Yangi ariza: ${app.client_name || app.client_phone || ''}`, 'success');
        if (location.hash.includes('/apps')) this.loadApps(false);
      });
      socket.on('app_updated', (d) => {
        if (location.hash.includes('/apps')) this.loadApps(false);
        if (location.hash === `#/app/${d.app_id}` && this.curAppId === d.app_id) this.viewAppDetail(d.app_id);
      });
      socket.on('client_message', (m) => {
        playNotifSound();
        toast(`💬 Mijozdan yangi xabar`, '');
        if (this.curAppId && location.hash === `#/app/${this.curAppId}`) this.loadAdminChat();
      });
    } catch (e) { /* real vaqt ixtiyoriy */ }
  },

  go(path) { location.hash = path; },
  isAuthed() { return !!localStorage.getItem(LS.ADMIN_TOKEN) && !!this.admin; },

  logout() {
    this.stopPolling();
    localStorage.removeItem(LS.ADMIN_TOKEN);
    localStorage.removeItem(LS.ADMIN_USER);
    this.admin = null;
    this.go('/login');
  },

  route() {
    const hash = (location.hash || '#/').slice(1);
    const [path, ...rest] = hash.split('/').filter(Boolean);

    if (path !== 'login' && !this.isAuthed()) { this.stopPolling(); return this.viewLogin(); }
    window.scrollTo(0, 0);

    switch (path) {
      case undefined: case '': return this.go('/apps');
      case 'login':   this.stopPolling(); return this.viewLogin();
      case 'dashboard': return this.viewDashboard();
      case 'apps':    return this.viewApps();
      case 'app':     return this.viewAppDetail(rest[0]);
      case 'payroll': return this.viewPayroll();
      case 'staff':   return this.viewStaff();
      case 'paymethods': return this.viewPayMethods();
      case 'bonus':   return this.viewBonus();
      case 'broadcast': return this.viewBroadcast();
      case 'settings': return this.viewSettings();
      case 'profile': return this.viewProfile();
      default:        return this.go('/apps');
    }
  },

  // ============================================================
  // LOGIN
  // ============================================================
  viewLogin() {
    document.body.className = 'admin-body admin-login-bg';
    this.root.innerHTML = `
      <div class="admin-login">
        <div class="al-card">
          <div class="al-logo">${logoMarkSVG()}</div>
          <h1>Admin panel</h1>
          <p>Oson Sug'urtam boshqaruv tizimi</p>
          <div class="field" style="margin-top:24px">
            <label>Login</label>
            <input class="inp" id="al_user" placeholder="username" autocomplete="username"
              onkeydown="if(event.key==='Enter')document.getElementById('al_pass').focus()">
          </div>
          <div class="field">
            <label>Parol</label>
            <input class="inp" id="al_pass" type="password" placeholder="••••••••" autocomplete="current-password"
              onkeydown="if(event.key==='Enter')Admin.doLogin()">
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="al_btn" style="margin-top:20px" onclick="Admin.doLogin()">
            Kirish
          </button>
        </div>
        <p class="al-foot">© 2026 «EVAZ» MChJ</p>
      </div>`;
  },

  async doLogin() {
    const username = document.getElementById('al_user').value.trim();
    const password = document.getElementById('al_pass').value;
    if (!username || !password) return toast('Login va parolni kiriting', 'err');
    const btn = document.getElementById('al_btn');
    setLoading(btn, true, 'Kirish...');
    try {
      const r = await AdminAPI.login(username, password);
      localStorage.setItem(LS.ADMIN_TOKEN, r.token);
      this.admin = r.admin;
      localStorage.setItem(LS.ADMIN_USER, JSON.stringify(r.admin));
      this.initSocket();
      this.go('/apps');
    } catch (e) {
      setLoading(btn, false);
      toast(e.message || 'Login yoki parol xato', 'err');
    }
  },

  // ============================================================
  // QOBIG' (sidebar + topbar)
  // ============================================================
  perms() { return (this.admin && this.admin.permissions) || []; },
  can(p) { return this.admin && (this.admin.role === 'head' || this.perms().includes(p)); },

  shell(active, content) {
    const nav = [
      { k:'apps', ic:I.inbox, lab:'Arizalar', path:'/apps' },
      { k:'dashboard', ic:I.chart, lab:'Statistika', path:'/dashboard' },
    ];
    if (this.can('view_payroll') || this.admin.role === 'head' || this.admin.role === 'worker')
      nav.push({ k:'payroll', ic:I.wallet, lab:'Ish haqi', path:'/payroll' });
    // Faqat rahbar (head) uchun boshqaruv bo'limlari
    if (this.admin.role === 'head' || this.can('manage_employees')) {
      nav.push({ k:'staff', ic:I.users, lab:'Xodimlar', path:'/staff' });
    }
    if (this.admin.role === 'head') {
      nav.push({ k:'paymethods', ic:I.card, lab:"To'lov usullari", path:'/paymethods' });
      nav.push({ k:'bonus', ic:I.trophy, lab:'Bonuslar', path:'/bonus' });
      nav.push({ k:'broadcast', ic:I.bell, lab:'Xabarnoma', path:'/broadcast' });
      nav.push({ k:'settings', ic:I.settings, lab:'Sozlamalar', path:'/settings' });
    }
    nav.push({ k:'profile', ic:I.user, lab:'Profil', path:'/profile' });

    const name = this.admin.full_name || this.admin.username;
    const work = this.admin.work_status || 'offline';

    return `
      <div class="adm-layout">
        <aside class="adm-sidebar">
          <div class="adm-brand">
            <div class="adm-brand-logo">${logoMarkSVG()}</div>
            <div class="adm-brand-txt"><b>Oson Sug'urtam</b><span>Admin</span></div>
          </div>
          <nav class="adm-nav">
            ${nav.map(n => `
              <a class="adm-nav-item ${active===n.k?'active':''}" onclick="Admin.go('${n.path}')">
                ${n.ic}<span>${n.lab}</span>
              </a>`).join('')}
          </nav>
          <div class="adm-user">
            <div class="adm-user-av">${initials(name)}</div>
            <div class="adm-user-info">
              <b>${esc(name)}</b>
              <span class="adm-role">${this.roleLabel(this.admin.role)}</span>
            </div>
          </div>
          <button class="adm-logout" onclick="Admin.logout()">${I.logout}<span>Chiqish</span></button>
        </aside>

        <div class="adm-main">
          <header class="adm-topbar">
            <button class="adm-burger" onclick="document.querySelector('.adm-sidebar').classList.toggle('open')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/></svg>
            </button>
            <div class="adm-work-toggle">
              <span class="adm-work-dot ${work}"></span>
              <select class="adm-work-sel" onchange="Admin.setWork(this.value)">
                <option value="online" ${work==='online'?'selected':''}>Onlayn</option>
                <option value="busy" ${work==='busy'?'selected':''}>Band</option>
                <option value="offline" ${work==='offline'?'selected':''}>Oflayn</option>
              </select>
            </div>
          </header>
          <main class="adm-content">${content}</main>
        </div>
      </div>`;
  },

  roleLabel(r) {
    return { head:'Bosh admin', worker:'Xodim', operator:'Operator', accountant:'Buxgalter', recruiter:'HR menejer', executive:'Menejer' }[r] || r;
  },
  ROLES: [
    { id:'worker', label:'Xodim' },
    { id:'recruiter', label:"HR menejer (yollash/bo'shatish huquqi bilan)" },
    { id:'accountant', label:'Buxgalter' },
    { id:'executive', label:'Menejer (kuzatuvchi)' },
  ],
  // Bosh admin bo'lmagan menejer (masalan HR menejer) faqat shu rollarni
  // yarata/tahrirlay oladi — buxgalter va menejer faqat bosh admin tomonidan
  ROLES_NONHEAD: [
    { id:'worker', label:'Xodim' },
    { id:'recruiter', label:"HR menejer (yollash/bo'shatish huquqi bilan)" },
  ],

  async setWork(status) {
    try {
      await AdminAPI.setWorkStatus(status);
      this.admin.work_status = status;
      localStorage.setItem(LS.ADMIN_USER, JSON.stringify(this.admin));
      document.querySelector('.adm-work-dot').className = 'adm-work-dot ' + status;
      toast('Holat yangilandi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // STATISTIKA (dashboard)
  // ============================================================
  async viewDashboard() {
    document.body.className = 'admin-body';
    this.root.innerHTML = this.shell('dashboard', this.loadingBlock());
    try {
      const s = await req('/stats', { token: adminToken() });
      let owedCards = '';
      if (this.admin.role === 'head') {
        try {
          const [pr, rb] = await Promise.all([
            req('/payroll', { token: adminToken() }).catch(()=>null),
            req('/referral/admin/overview', { token: adminToken() }).catch(()=>null),
          ]);
          const unpaidPayroll = pr && pr.totals ? (pr.totals.total_unpaid||0) : 0;
          const unpaidBonus = rb ? (rb.total_unpaid||0) : 0;
          if (pr || rb) {
            owedCards = `
              <div class="stat-grid">
                ${this.statCard(I.wallet, "Hodimlarga to'lanmagan", unpaidPayroll, '#B91C1C', '#FEE2E2', true)}
                ${this.statCard(I.trophy, "Mijozlarga to'lanmagan bonus", unpaidBonus, '#B91C1C', '#FEE2E2', true)}
              </div>`;
          }
        } catch (e) {}
      }
      // Umumiy tushum/daromad — faqat bosh admin (backend shunga qarab yuboradi)
      const hasFinance = s.totalRevenue !== undefined;
      const content = `
        <h1 class="adm-h1">Statistika</h1>
        <div class="stat-grid">
          ${this.statCard(I.inbox, 'Jami arizalar', s.total||0, 'var(--green-600)', 'var(--green-50)')}
          ${this.statCard(I.clock, 'Bugun', s.todayCount||0, '#1E40AF', '#DBEAFE')}
          ${hasFinance ? this.statCard(I.wallet, 'Tushum', s.totalRevenue||0, 'var(--gold)', 'var(--gold-l)', true) : ''}
          ${hasFinance ? this.statCard(I.chart, 'Daromad', s.totalIncome||0, '#6B21A8', '#F3E8FF', true) : ''}
        </div>
        ${owedCards}

        <div class="adm-card">
          <h3 class="adm-card-title">Status bo'yicha</h3>
          <div class="status-bars">
            ${this.renderStatusBars(s.byStatus || {}, s.total || 1)}
          </div>
        </div>

        ${s.byDay && s.byDay.length ? `
        <div class="adm-card">
          <h3 class="adm-card-title">So'nggi kunlar</h3>
          <div class="day-chart">${this.renderDayChart(s.byDay)}</div>
        </div>` : ''}`;
      this.root.innerHTML = this.shell('dashboard', content);
      this.animateCounts();
    } catch (e) {
      this.root.innerHTML = this.shell('dashboard', this.errorBlock(e.message));
    }
  },
  statCard(ic, label, value, color, bg, isCurrency) {
    const shown = isCurrency ? fmtSom(value) : value;
    return `<div class="stat-card">
      <div class="sc-ic" style="background:${bg};color:${color}">${ic}</div>
      <div class="sc-val" data-target="${value}" data-cur="${isCurrency?1:0}">${shown}</div>
      <div class="sc-lab">${label}</div>
    </div>`;
  },
  animateCounts() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.sc-val[data-target]').forEach(el => {
      const target = parseFloat(el.getAttribute('data-target')) || 0;
      if (target <= 0) return;
      const cur = el.getAttribute('data-cur') === '1';
      const dur = 850, start = performance.now();
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(target * eased);
        el.textContent = cur ? fmtSom(val) : val.toLocaleString('ru-RU');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },
  renderStatusBars(byStatus, total) {
    const order = ['new','in_review','approved','payment_pending','paid','policy_ready','completed','rejected'];
    return order.filter(s => byStatus[s]).map(s => {
      const count = byStatus[s] || 0;
      const pct = Math.round((count/total)*100);
      const c = STATUS_COLOR[s] || {bg:'#eee',fg:'#666'};
      return `<div class="sb-row">
        <div class="sb-label"><span class="sb-dot" style="background:${c.fg}"></span>${STATUS_LABEL[s]||s}</div>
        <div class="sb-track"><div class="sb-fill" style="width:${pct}%;background:${c.fg}"></div></div>
        <div class="sb-count">${count}</div>
      </div>`;
    }).join('') || '<p class="muted-text">Ma\'lumot yo\'q</p>';
  },
  renderDayChart(byDay) {
    const max = Math.max(...byDay.map(d => d.count || d.total || 0), 1);
    return byDay.slice(-14).map((d, i) => {
      const v = d.count || d.total || 0;
      const h = Math.round((v/max)*100);
      const label = (d.date || d.day || '').slice(5);
      return `<div class="dc-col">
        <div class="dc-bar-wrap"><div class="dc-bar" style="height:${Math.max(h,4)}%;animation-delay:${i*45}ms" title="${v}"></div></div>
        <div class="dc-label">${label}</div>
      </div>`;
    }).join('');
  },

  // ============================================================
  // ARIZALAR ro'yxati (real-time polling)
  // ============================================================
  async viewApps() {
    document.body.className = 'admin-body';
    this._animateApps = true;
    this._appsSig = null;
    if (!document.getElementById('admAppsList')) {
      this.root.innerHTML = this.shell('apps', `
        <div class="adm-apps-head">
          <h1 class="adm-h1">Arizalar</h1>
          <button class="btn btn-ghost btn-sm" onclick="Admin.loadApps(true)">${I.refresh} Yangilash</button>
        </div>
        <div class="adm-filters" id="admFilters"></div>
        <div id="admAppsList">${this.loadingBlock()}</div>`);
    }
    await this.loadApps(true);
    this.startPolling();
  },

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (location.hash.includes('/apps')) this.loadApps(false);
    }, 12000);
  },
  stopPolling() { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; } },

  async loadApps(showLoad) {
    const listBox = document.getElementById('admAppsList');
    if (showLoad && listBox) listBox.innerHTML = this.loadingBlock();
    try {
      const r = await AdminAPI.allApps();
      this.apps = (r.items || r.apps || (Array.isArray(r)?r:[]));
      this.renderFilters();
      this.renderApps();
    } catch (e) {
      if (listBox) listBox.innerHTML = this.errorBlock(e.message);
    }
  },

  renderFilters() {
    const counts = { all: this.apps.length };
    this.apps.forEach(a => { counts[a.status] = (counts[a.status]||0)+1; });
    const filters = [
      { k:'all', lab:'Hammasi' },
      { k:'new', lab:'Yangi' },
      { k:'in_review', lab:"Ko'rilmoqda" },
      { k:'approved', lab:'Tasdiqlangan' },
      { k:'payment_pending', lab:"To'lov" },
      { k:'paid', lab:"To'langan" },
      { k:'policy_ready', lab:'Tayyor' },
      { k:'completed', lab:'Yakunlangan' },
    ];
    const box = document.getElementById('admFilters');
    if (!box) return;
    box.innerHTML = filters.map(f => `
      <button class="filter-chip ${this.filter===f.k?'active':''}" onclick="Admin.setFilter('${f.k}')">
        ${f.lab}${counts[f.k]?`<span class="fc-count">${counts[f.k]}</span>`:''}
      </button>`).join('');
  },
  setFilter(f) { this.filter = f; this._animateApps = true; this.renderFilters(); this.renderApps(); },

  renderApps() {
    const box = document.getElementById('admAppsList');
    if (!box) return;
    let list = this.apps.slice();
    if (this.filter !== 'all') list = list.filter(a => a.status === this.filter);
    list.sort((a,b)=> new Date(b.created_at||b.createdAt||0) - new Date(a.created_at||a.createdAt||0));
    // Aqlli render: ma'lumot o'zgarmagan bo'lsa qayta chizmaymiz (poll'da miltilamasligi uchun)
    const sig = this.filter + '|' + list.map(a => `${a.id||a._id}:${a.status}:${a.updated_at||a.updatedAt||''}`).join(',');
    if (sig === this._appsSig && box.querySelector('.adm-app-grid')) return;
    this._appsSig = sig;
    if (!list.length) {
      box.innerHTML = this.emptyBlock(I.inbox, 'Arizalar yo\'q', 'Bu turkumda ariza topilmadi');
      return;
    }
    // Animatsiya faqat foydalanuvchi harakatida (sahifa ochish/filtr), poll'da emas
    const anim = this._animateApps ? ' anim' : '';
    this._animateApps = false;
    box.innerHTML = `<div class="adm-app-grid${anim}">${list.map((a,i) => this.adminAppCard(a, i)).join('')}</div>`;
  },
  adminAppCard(a, i) {
    const st = a.status || 'new';
    const vehicleName = (VEHICLES.find(v=>v.id===a.vehicle)||{}).name || a.vehicle || '';
    const num = a.app_number || a.number || ('#'+String(a.id||a._id||'').slice(-5));
    const name = a.client_name || 'Mijoz';
    const delay = (typeof i === 'number' && i < 14) ? ` style="animation-delay:${i*35}ms"` : '';
    return `
      <div class="adm-app-card"${delay} onclick="Admin.go('/app/${a.id||a._id}')">
        <div class="aac-top">
          <span class="aac-num">${esc(String(num))}</span>
          ${statusBadge(st)}
        </div>
        <div class="aac-client">
          <div class="aac-av">${initials(name, a.client_phone)}</div>
          <div class="aac-cinfo">
            <b>${esc(name)}</b>
            <span>${fmtPhone(a.client_phone||'')}</span>
          </div>
        </div>
        <div class="aac-details">
          <div class="aac-d"><span>Avto</span><b>${esc(vehicleName)}</b></div>
          <div class="aac-d"><span>Hudud</span><b>${esc(a.region||'')}</b></div>
          <div class="aac-d"><span>Narx</span><b>${fmtSom(a.price||0)}</b></div>
        </div>
        <div class="aac-foot">
          <span>${fmtDate(a.created_at||a.createdAt)}</span>
          ${I.arrowRight}
        </div>
      </div>`;
  },

  // helper bloklar
  loadingBlock() { return `<div class="load-block"><div class="spinner"></div></div>`; },
  emptyBlock(icon, title, sub) {
    return `<div class="empty-block"><div class="eb-ic">${icon}</div><h3>${title}</h3><p>${sub}</p></div>`;
  },
  errorBlock(msg) {
    return `<div class="empty-block"><div class="eb-ic err">${I.x}</div><h3>Xatolik</h3><p>${esc(msg||'')}</p>
      <button class="btn btn-ghost" onclick="Admin.route()">${I.refresh} Qayta</button></div>`;
  },

  // ============================================================
  // ARIZA DETALI (asosiy ish maydoni)
  // ============================================================
  async viewAppDetail(id) {
    document.body.className = 'admin-body';
    this.stopPolling();
    this.root.innerHTML = this.shell('apps', `
      <div class="adm-detail-back" onclick="Admin.go('/apps')">${I.arrowLeft}<span>Arizalar ro'yxati</span></div>
      <div id="admDetail">${this.loadingBlock()}</div>`);
    if (!id) { document.getElementById('admDetail').innerHTML = this.errorBlock('Ariza topilmadi'); return; }
    this.curAppId = id;
    try {
      const r = await AdminAPI.appDetail(id);
      this.curApp = r.app || r;
      this.renderAppDetail(this.curApp);
    } catch (e) {
      document.getElementById('admDetail').innerHTML = this.errorBlock(e.message);
    }
  },

  renderAppDetail(a) {
    const st = a.status || 'new';
    const vehicleName = (VEHICLES.find(v=>v.id===a.vehicle)||{}).name || a.vehicle || '';
    const durObj = DURATIONS.find(x=>x.id===a.duration) || {};
    const payObj = PAY_METHODS.find(p=>p.id===a.pay_method) || {};
    const num = a.app_number || a.number || ('#'+String(a.id||a._id||'').slice(-5));
    const name = a.client_name || 'Mijoz';
    const tex = a.tex || a;
    const drivers = a.drivers || [];
    const photos = this.collectPhotos(a);

    document.getElementById('admDetail').innerHTML = `
      <div class="adm-detail-head">
        <div>
          <div class="adh-num">${esc(String(num))}</div>
          <div class="adh-date">${fmtDate(a.created_at||a.createdAt)}</div>
        </div>
        ${statusBadge(st)}
      </div>

      <div class="adm-detail-grid">
        <!-- chap: ma'lumotlar -->
        <div class="adm-detail-col">
          <div class="adm-card">
            <h3 class="adm-card-title">Mijoz</h3>
            <div class="detail-client">
              <div class="dc-av">${initials(name, a.client_phone)}</div>
              <div>
                <b>${esc(name)}</b>
                <a href="tel:${esc(a.client_phone||'')}" class="dc-phone">${fmtPhone(a.client_phone||'')}</a>
              </div>
            </div>
          </div>

          <div class="adm-card">
            <h3 class="adm-card-title">Ariza tafsilotlari</h3>
            <div class="detail-rows">
              <div class="dr"><span>Turi</span><b>${a.app_type==='renew'?'Yangilash':'Yangi polis'}</b></div>
              <div class="dr"><span>Avtomobil</span><b>${esc(vehicleName)}</b></div>
              <div class="dr"><span>Hudud</span><b>${esc(a.region||'')}</b></div>
              <div class="dr"><span>Muddat</span><b>${durObj.label||''} ${durObj.sub||''}</b></div>
              <div class="dr"><span>To'lov usuli</span><b>${payObj.label||esc(a.pay_method||'')}</b></div>
              <div class="dr"><span>Narx</span><b class="dr-price">${fmtSom(a.price||0)}</b></div>
            </div>
          </div>

          <div class="adm-card">
            <h3 class="adm-card-title">Avtomobil ma'lumotlari</h3>
            <div class="detail-rows">
              <div class="dr"><span>Davlat raqami</span><b>${esc(tex.tex_plate||tex.plate||'—')}</b></div>
              <div class="dr"><span>Seriya</span><b>${esc(tex.tex_seria||tex.seria||'—')}</b></div>
              <div class="dr"><span>Model</span><b>${esc(tex.tex_model||tex.model||'—')}</b></div>
              <div class="dr"><span>Yil</span><b>${esc(tex.tex_year||tex.year||'—')}</b></div>
              <div class="dr"><span>VIN</span><b>${esc(tex.tex_vin||tex.vin||'—')}</b></div>
              <div class="dr"><span>STIR</span><b>${esc(tex.tex_stir||tex.stir||'—')}</b></div>
              <div class="dr"><span>Egasi pasport seriyasi</span><b>${esc(a.owner_seria||a.owner_jshshir||'—')}</b></div>
            </div>
          </div>

          ${drivers.length ? `
          <div class="adm-card">
            <h3 class="adm-card-title">Haydovchilar (${drivers.length})</h3>
            <div class="detail-drivers">
              ${drivers.map((d,i)=>`<div class="dd-item">
                <span class="dd-num">${i+1}</span>
                <div><b>${esc(d.name||'Haydovchi '+(i+1))}</b>
                  <span>${[d.jshshir?`JSHSHIR: ${esc(d.jshshir)}`:'', d.seria?`Seriya: ${esc(d.seria)}`:'', d.license?`Guvohnoma: ${esc(d.license)}`:'', d.doc_type==='bio'?'Biometrik pasport':''].filter(Boolean).join(' · ') || 'Ma\'lumot kiritilmagan'}</span>
                </div>
              </div>`).join('')}
            </div>
          </div>` : ''}

          ${photos.length ? `
          <div class="adm-card">
            <h3 class="adm-card-title">Hujjatlar (${photos.length})</h3>
            <div class="detail-photos">
              ${photos.map(p=>`<a href="${p.url}" target="_blank" class="dp-thumb">
                <img src="${p.url}" alt="${p.label}" loading="lazy">
                <span>${p.label}</span>
              </a>`).join('')}
            </div>
          </div>` : ''}
        </div>

        <!-- o'ng: amallar -->
        <div class="adm-detail-col">
          <div class="adm-card adm-actions-card">
            <h3 class="adm-card-title">Amallar</h3>
            ${this.renderActions(a, st)}
          </div>

          <div class="adm-card">
            <h3 class="adm-card-title">Operator chat</h3>
            <div class="adm-chat" id="admChat">${this.loadingBlock()}</div>
            <div class="adm-chat-input">
              <input class="inp" id="admChatInp" placeholder="Mijozga xabar..." onkeydown="if(event.key==='Enter')Admin.sendMsg()">
              <button class="btn btn-primary btn-sm" onclick="Admin.sendMsg()">${I.send}</button>
            </div>
          </div>
        </div>
      </div>`;

    this.loadAdminChat();
  },

  collectPhotos(a) {
    const map = [
      ['photo_tex_front','Texpassport old'],
      ['photo_tex_back','Texpassport orqa'],
      ['photo_owner_passport','Egasi pasporti'],
      ['photo_owner_front','Egasi hujjati old'],
      ['photo_owner_back','Egasi hujjati orqa'],
      ['photo_renew_policy','Eski polis'],
    ];
    const out = [];
    map.forEach(([k,lab])=>{ if (a[k]) out.push({ url:`${UPLOADS}/${a[k]}`, label:lab }); });
    // haydovchi hujjat rasmlari (har bir haydovchi ichida saqlanadi: d.photo / d.photo_back)
    (a.drivers||[]).forEach((d,i)=>{
      if (d.photo) out.push({ url:`${UPLOADS}/${d.photo}`, label:`Haydovchi ${i+1} — old tomon` });
      if (d.photo_back) out.push({ url:`${UPLOADS}/${d.photo_back}`, label:`Haydovchi ${i+1} — orqa tomon` });
    });
    // umumiy photos massiv
    if (Array.isArray(a.photos)) a.photos.forEach((p,i)=> out.push({ url:`${UPLOADS}/${p}`, label:`Rasm ${i+1}` }));
    return out;
  },

  renderActions(a, st) {
    const id = a.id || a._id;
    let html = '';

    if (st === 'new' || st === 'in_review' || st === 'assigned') {
      html += `<button class="btn btn-primary btn-block" onclick="Admin.approveApp()">${I.check} Tasdiqlash</button>`;
      html += `<button class="btn btn-outline-danger btn-block" onclick="Admin.rejectApp()">${I.x} Rad etish</button>`;
    }
    if (st === 'approved') {
      html += `<button class="btn btn-primary btn-block" onclick="Admin.openPaymentLink()">${I.card} To'lov havolasi yuborish</button>`;
    }
    if (st === 'payment_pending') {
      html += `<button class="btn btn-primary btn-block" onclick="Admin.markPaid()">${I.check} To'landi deb belgilash</button>`;
      html += `<button class="btn btn-ghost btn-block" onclick="Admin.openPaymentLink()">${I.edit} To'lov havolasini o'zgartirish</button>`;
    }
    if (st === 'paid' || st === 'policy_preparing') {
      html += `<button class="btn btn-primary btn-block" onclick="Admin.openFinalize()">${I.upload} Polisni yuklash (yakunlash)</button>`;
    }
    if (st === 'policy_ready') {
      html += `<div class="action-done">${I.checkCircle} Polis tayyor — mijozga yuborildi</div>`;
      html += `<button class="btn btn-ghost btn-block" onclick="Admin.openFinalize()">${I.refresh} Polisni qayta yuklash</button>`;
    }
    if (st === 'completed') {
      html += `<div class="action-done">${I.checkCircle} Ariza yakunlandi</div>`;
    }
    if (st === 'rejected') {
      html += `<div class="action-rejected">${I.x} Rad etilgan: ${esc(a.reject_reason||a.reason||'')}</div>`;
    }

    // Gross robot — polisni portalda rasmiylashtirish
    if (['approved','payment_pending','paid','policy_preparing','policy_ready'].includes(st)) {
      const gs = a.gross_status;
      const label = gs === 'confirmed' ? "Gross'da qayta rasmiylashtirish" : "Gross'da rasmiylashtirish";
      html += `<button class="btn btn-gross btn-block" onclick="Admin.openGross()">${I.shieldCheck} ${label}</button>`;
      if (gs === 'error' && a.gross_error) {
        html += `<div class="gross-inline-err">${I.x} ${esc(a.gross_error)}</div>`;
      } else if (gs === 'confirmed' && a.gross_policy_number) {
        html += `<div class="gross-inline-ok">${I.checkCircle} Gross polisi: ${esc(a.gross_policy_number)}</div>`;
      }
    }

    // status o'zgartirish (qo'lda)
    html += `<div class="status-change">
      <label>Statusni qo'lda o'zgartirish</label>
      <select class="inp" id="stSelect" onchange="Admin.changeStatus(this.value)">
        ${Object.keys(STATUS_LABEL).filter(s=>s!=='pending').map(s=>
          `<option value="${s}" ${s===st?'selected':''}>${STATUS_LABEL[s]}</option>`).join('')}
      </select>
    </div>`;
    return html;
  },

  async approveApp() {
    if (!confirm('Arizani tasdiqlaysizmi?')) return;
    try { await AdminAPI.approve(this.curAppId); toast('Tasdiqlandi', 'ok'); this.viewAppDetail(this.curAppId); }
    catch (e) { toast(e.message, 'err'); }
  },
  rejectApp() {
    showModal(`
      <h3 class="modal-title">Arizani rad etish</h3>
      <div class="field"><label>Sabab</label>
        <textarea class="inp" id="rejReason" rows="3" placeholder="Rad etish sababini yozing..."></textarea></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-danger-solid" id="rejBtn" onclick="Admin.doReject()">Rad etish</button>
      </div>`);
  },
  async doReject() {
    const reason = document.getElementById('rejReason').value.trim();
    if (!reason) return toast('Sababni kiriting', 'err');
    const btn = document.getElementById('rejBtn');
    setLoading(btn, true);
    try { await AdminAPI.reject(this.curAppId, reason); closeModal(); toast('Rad etildi', 'ok'); this.viewAppDetail(this.curAppId); }
    catch (e) { setLoading(btn, false); toast(e.message, 'err'); }
  },
  openPaymentLink() {
    const a = this.curApp;
    showModal(`
      <h3 class="modal-title">To'lov havolasi</h3>
      <div class="field"><label>To'lov turi</label>
        <select class="inp" id="payProvider">
          <option value="payme">Payme</option>
          <option value="click">Click</option>
          <option value="card">Bank kartasi</option>
          <option value="sms">SMS to'lov</option>
        </select></div>
      <div class="field"><label>To'lov summasi (so'm)</label>
        <input class="inp" id="payAmount" inputmode="numeric" value="${a.price||0}"></div>
      <div class="field"><label>To'lov havolasi (link)</label>
        <input class="inp" id="payLink" placeholder="https://payme.uz/... yoki click.uz/..." oninput="Admin.detectPayProvider(this.value)"></div>
      <div class="field"><label>Izoh (ixtiyoriy)</label>
        <input class="inp" id="payNote" placeholder="To'lov haqida"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" id="payBtn" onclick="Admin.sendPaymentLink()">Yuborish</button>
      </div>`);
  },
  detectPayProvider(link) {
    const sel = document.getElementById('payProvider');
    if (!sel) return;
    if (/payme/i.test(link)) sel.value = 'payme';
    else if (/click/i.test(link)) sel.value = 'click';
  },
  async sendPaymentLink() {
    const provider = document.getElementById('payProvider').value;
    const amount = document.getElementById('payAmount').value;
    const link = document.getElementById('payLink').value.trim();
    const note = document.getElementById('payNote').value.trim();
    if (!link) return toast('To\'lov havolasini kiriting', 'err');
    const btn = document.getElementById('payBtn');
    setLoading(btn, true);
    try {
      await AdminAPI.paymentLink(this.curAppId, { provider, amount:Number(amount)||0, link, note });
      closeModal(); toast('To\'lov havolasi yuborildi', 'ok'); this.viewAppDetail(this.curAppId);
    } catch (e) { setLoading(btn, false); toast(e.message, 'err'); }
  },
  async markPaid() {
    if (!confirm('To\'lov amalga oshdi deb belgilaysizmi?')) return;
    try { await AdminAPI.setStatus(this.curAppId, 'paid'); toast('To\'landi deb belgilandi', 'ok'); this.viewAppDetail(this.curAppId); }
    catch (e) { toast(e.message, 'err'); }
  },
  openFinalize() {
    showModal(`
      <h3 class="modal-title">Polisni yuklash</h3>
      <p style="color:var(--ink-2);font-size:13.5px;margin-bottom:14px">Tayyor polis faylini (PDF yoki rasm) yuklang. Mijozga avtomatik yuboriladi.</p>
      <div class="field"><label>Polis raqami (ixtiyoriy)</label>
        <input class="inp" id="finNumber" placeholder="POL-12345"></div>
      <div class="upload-zone" onclick="document.getElementById('finFile').click()" style="margin:12px 0">
        <input type="file" id="finFile" accept="application/pdf,image/*" hidden onchange="Admin.onFinFile(event)">
        <div id="finPreview">
          <div class="uz-ic">${I.upload}</div>
          <div class="uz-title">Polis faylini tanlang</div>
          <div class="uz-hint">PDF yoki rasm</div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" id="finBtn" onclick="Admin.doFinalize()">Yakunlash</button>
      </div>`);
  },
  onFinFile(e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    this._finFile = f;
    document.getElementById('finPreview').innerHTML =
      `<div class="uz-ic" style="color:var(--green-600)">${I.checkCircle}</div>
       <div class="uz-title">${esc(f.name)}</div>
       <div class="uz-hint">${(f.size/1024).toFixed(0)} KB · almashtirsh uchun bosing</div>`;
  },
  async doFinalize() {
    if (!this._finFile) return toast('Polis faylini tanlang', 'err');
    const btn = document.getElementById('finBtn');
    setLoading(btn, true, 'Yuklanmoqda...');
    try {
      const fd = new FormData();
      fd.append('policy_file', this._finFile, this._finFile.name);
      const num = document.getElementById('finNumber').value.trim();
      if (num) fd.append('policy_number', num);
      await AdminAPI.finalize(this.curAppId, fd);
      this._finFile = null;
      closeModal(); toast('Polis yuklandi va yakunlandi!', 'ok'); this.viewAppDetail(this.curAppId);
    } catch (e) { setLoading(btn, false); toast(e.message, 'err'); }
  },
  async changeStatus(status) {
    try { await AdminAPI.setStatus(this.curAppId, status); toast('Status yangilandi', 'ok'); this.viewAppDetail(this.curAppId); }
    catch (e) { toast(e.message, 'err'); this.viewAppDetail(this.curAppId); }
  },

  // =========================================================================
  // GROSS ROBOT — portalda polisni yarim-avtomatik rasmiylashtirish
  // =========================================================================
  _gross: null,

  async openGross() {
    this._gross = { step: 'loading', captcha: null, data: null, screenshot: null, error: null, fields: null };
    this.renderGross();
    try {
      const [job, st] = await Promise.all([
        GrossAPI.job(this.curAppId),
        GrossAPI.status().catch(() => ({})),
      ]);
      this._gross.fields = job.fields || { passportSeria:'', techSeria:'', plate:'' };
      // Oldingi natija bo'lsa — ko'rsatamiz
      if (job.gross_status === 'pulled' && job.gross_pulled_data) {
        this._gross.data = job.gross_pulled_data;
        this._gross.screenshot = job.gross_screenshot;
        this._gross.step = 'review';
      } else {
        this._gross.step = st && st.has_session ? 'form' : 'login-intro';
      }
    } catch (e) {
      this._gross.step = 'login-intro';
      this._gross.error = e.message;
    }
    this.renderGross();
  },

  renderGross() {
    const g = this._gross || {};
    const shot = g.screenshot ? `<a href="${grossFileUrl(g.screenshot)}" target="_blank" class="gross-shot-link">${I.eye} Robot skrinshotini ko'rish</a>` : '';
    const errBox = g.error ? `<div class="gross-err">${I.x} ${esc(g.error)}${shot}</div>` : '';
    let inner = '';

    if (g.step === 'loading') {
      inner = `<div style="padding:24px;text-align:center">${this.loadingBlock ? this.loadingBlock() : 'Yuklanmoqda...'}</div>`;
    }
    else if (g.step === 'login-intro') {
      inner = `
        <p class="gross-help">Robot osago.gross.uz portaliga kirishi kerak. Portalda CAPTCHA bo'lgani uchun rasmni siz kiritasiz.</p>
        ${errBox}
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal()">Yopish</button>
          ${g.error ? `<button class="btn btn-ghost" onclick="Admin.grossRestart()">${I.refresh} Qaytadan boshlash</button>` : ''}
          <button class="btn btn-primary" id="gConnBtn" onclick="Admin.grossConnect()">Portalga ulanish</button>
        </div>`;
    }
    else if (g.step === 'login') {
      inner = `
        <p class="gross-help">Rasmda ko'rsatilgan CAPTCHA kodini kiriting:</p>
        ${g.captcha ? `<div class="gross-captcha"><img src="${g.captcha}" alt="captcha"></div>` : `<p class="gross-help" style="color:var(--red-600,#b91c1c)">CAPTCHA rasmi topilmadi — kodni portal ko'rsatgan joydan kiriting.</p>`}
        <div class="field"><label>CAPTCHA</label>
          <input class="inp" id="gCaptcha" autocomplete="off" placeholder="Masalan: 4821" onkeydown="if(event.key==='Enter')Admin.grossDoLogin()"></div>
        ${errBox}
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
          <button class="btn btn-ghost" onclick="Admin.grossRestart()">${I.refresh} Qaytadan boshlash</button>
          <button class="btn btn-primary" id="gLoginBtn" onclick="Admin.grossDoLogin()">Kirish</button>
        </div>`;
    }
    else if (g.step === 'form') {
      const f = g.fields || {};
      const sessionLost = g.error && /sessiya|qaytadan kirish/i.test(g.error);
      inner = `
        <p class="gross-help">Robot avval avto raqami va texpassport seriyasini kiritib "Маълумот юклаш" bosadi. Portal qolganini davlat bazasidan o'zi tortadi. Kerak bo'lsa tahrirlang:</p>
        <div class="field"><label>Avto davlat raqami</label>
          <input class="inp" id="gPlate" value="${esc(f.plate||'')}" placeholder="01A234BC"></div>
        <div class="field-row">
          <div class="field"><label>Texpassport seriyasi (3 harf)</label>
            <input class="inp" id="gTech" value="${esc(f.techSeria||'')}" placeholder="AAF"></div>
          <div class="field"><label>Raqami (7 raqam)</label>
            <input class="inp" id="gNum" value="${esc(f.techNumber||'')}" placeholder="1234567"></div>
        </div>
        ${errBox}
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
          <button class="btn btn-ghost" onclick="Admin.grossRestart()">${I.refresh} Qaytadan boshlash</button>
          ${sessionLost ? '' : `<button class="btn btn-primary" id="gLookupBtn" onclick="Admin.grossLookup()">Ma'lumotlarni tortib olish</button>`}
        </div>`;
    }
    else if (g.step === 'review') {
      const d = g.data || {};
      const rows = (d.fields && Object.keys(d.fields).length)
        ? Object.entries(d.fields).map(([k,v])=>`<div class="dr"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')
        : `<pre class="gross-raw">${esc((d.raw||'').slice(0,1500))}</pre>`;
      inner = `
        <p class="gross-help">Portal tortib chiqargan ma'lumotlar. Tekshiring va to'g'ri bo'lsa yakuniy rasmiylashtiring:</p>
        <div class="gross-review detail-rows">${rows}</div>
        ${shot}
        ${errBox}
        <div class="gross-warn">${I.help} Diqqat: "Rasmiylashtirish" bosilgach polis yakuniy rasmiylashtiriladi.</div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
          <button class="btn btn-ghost" onclick="Admin.grossLookup()">${I.refresh} Qayta tortish</button>
          <button class="btn btn-primary" id="gConfirmBtn" onclick="Admin.grossConfirm()">${I.checkCircle} Tasdiqlab rasmiylashtirish</button>
        </div>`;
    }
    else if (g.step === 'done') {
      inner = `
        <div class="gross-done">${I.checkCircle}
          <h3>Polis rasmiylashtirildi!</h3>
          ${g.policyNumber ? `<p>Polis raqami: <b>${esc(g.policyNumber)}</b></p>` : ''}
          <p>PDF arizaga biriktirildi va mijozga yuborildi.</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-primary" onclick="closeModal();Admin.viewAppDetail(Admin.curAppId)">Yopish</button>
        </div>`;
    }

    showModal(`<h3 class="modal-title">${I.shieldCheck} Gross'da rasmiylashtirish</h3>${inner}`);
  },

  async grossConnect() {
    const btn = document.getElementById('gConnBtn') || document.getElementById('gLoginBtn');
    setLoading(btn, true, 'Ulanmoqda...');
    try {
      const r = await GrossAPI.loginStart();
      if (r.already_logged_in) { this._gross.step = 'form'; this._gross.error = null; return this.renderGross(); }
      if (!r.ok) { this._gross.error = r.error || 'Portalga ulanib bo\'lmadi'; this._gross.step = 'login-intro'; return this.renderGross(); }
      this._gross.captcha = r.captcha || null;
      this._gross.error = null;
      this._gross.step = 'login';
      this.renderGross();
    } catch (e) { setLoading(btn, false); this._gross.error = e.message; this.renderGross(); }
  },

  // Noldan qaytadan boshlash — eski sessiyani tozalab, yangi CAPTCHA bilan qayta kirish
  async grossRestart() {
    this._gross = { step: 'loading', captcha: null, data: null, screenshot: null, error: null, fields: this._gross && this._gross.fields };
    this.renderGross();
    try { await GrossAPI.logout(); } catch {}
    this._gross.step = 'login-intro';
    this.renderGross();
    // Darhol yangi CAPTCHA yuklaymiz
    this.grossConnect();
  },

  async grossDoLogin() {
    const captcha = (document.getElementById('gCaptcha')?.value || '').trim();
    const btn = document.getElementById('gLoginBtn');
    setLoading(btn, true, 'Kirilmoqda...');
    try {
      const r = await GrossAPI.loginSubmit(captcha);
      if (r.ok) { this._gross.error = null; this._gross.step = 'form'; toast('Portalga kirildi', 'ok'); return this.renderGross(); }
      // Xato — yangi captcha bo'lsa ko'rsatamiz
      this._gross.captcha = r.captcha || this._gross.captcha;
      this._gross.error = r.error || 'Kirish amalga oshmadi';
      this._gross.step = 'login';
      this.renderGross();
    } catch (e) { setLoading(btn, false); this._gross.error = e.message; this.renderGross(); }
  },

  async grossLookup() {
    // form step'da inputlardan o'qiymiz; review step'da mavjud fields'dan
    const plateEl = document.getElementById('gPlate');
    if (plateEl) {
      this._gross.fields = {
        plate: plateEl.value.trim(),
        techSeria: (document.getElementById('gTech')?.value || '').trim(),
        techNumber: (document.getElementById('gNum')?.value || '').trim(),
        ownerPassport: (this._gross.fields && this._gross.fields.ownerPassport) || '',
      };
    }
    const btn = document.getElementById('gLookupBtn') || document.getElementById('gConfirmBtn');
    setLoading(btn, true, 'Tortilmoqda...');
    try {
      const r = await GrossAPI.lookup(this.curAppId, this._gross.fields);
      if (r.need_login) { this._gross.error = r.error; this._gross.step = 'login-intro'; return this.renderGross(); }
      if (!r.ok) { this._gross.error = r.error || 'Ma\'lumot tortilmadi'; this._gross.screenshot = r.screenshot; this._gross.step = 'form'; return this.renderGross(); }
      this._gross.data = r.data;
      this._gross.screenshot = r.screenshot;
      this._gross.error = null;
      this._gross.step = 'review';
      this.renderGross();
    } catch (e) { setLoading(btn, false); this._gross.error = e.message; this.renderGross(); }
  },

  async grossConfirm() {
    if (!confirm("Polis yakuniy rasmiylashtiriladi. Ma'lumotlar to'g'riligiga ishonchingiz komilmi?")) return;
    const btn = document.getElementById('gConfirmBtn');
    setLoading(btn, true, 'Rasmiylashtirilmoqda...');
    try {
      const r = await GrossAPI.confirm(this.curAppId);
      if (r.need_lookup) { this._gross.error = r.error; this._gross.step = 'form'; return this.renderGross(); }
      if (r.need_login) { this._gross.error = r.error; this._gross.step = 'login-intro'; return this.renderGross(); }
      if (!r.ok) { this._gross.error = r.error || 'Rasmiylashtirish amalga oshmadi'; this._gross.screenshot = r.screenshot; this._gross.step = 'review'; return this.renderGross(); }
      this._gross.policyNumber = r.policyNumber;
      this._gross.step = 'done';
      toast('Polis rasmiylashtirildi!', 'ok');
      this.renderGross();
    } catch (e) { setLoading(btn, false); this._gross.error = e.message; this.renderGross(); }
  },

  // admin chat
  async loadAdminChat() {
    try {
      const r = await AdminAPI.messages(this.curAppId);
      const list = Array.isArray(r) ? r : (r.messages || []);
      const box = document.getElementById('admChat');
      if (!box) return;
      if (!list.length) { box.innerHTML = `<p class="muted-text" style="text-align:center;padding:20px">Xabarlar yo'q</p>`; return; }
      box.innerHTML = list.map(m => {
        const mine = m.sender === 'admin' || m.from === 'admin' || m.is_admin;
        return `<div class="adm-bubble ${mine?'mine':'them'}">
          <div>${esc(m.message||m.text||'')}</div>
          <span>${fmtTime(m.created_at||m.createdAt)}</span>
        </div>`;
      }).join('');
      box.scrollTop = box.scrollHeight;
    } catch (e) {
      const box = document.getElementById('admChat');
      if (box) box.innerHTML = `<p class="muted-text">${esc(e.message)}</p>`;
    }
  },
  async sendMsg() {
    const inp = document.getElementById('admChatInp');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    try { await AdminAPI.message(this.curAppId, text); this.loadAdminChat(); }
    catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // ISH HAQI (payroll)
  // ============================================================
  async viewPayroll() {
    document.body.className = 'admin-body';
    this.root.innerHTML = this.shell('payroll', this.loadingBlock());
    try {
      const isHead = this.admin.role === 'head';
      const [data, myBonus, rateCfg] = await Promise.all([
        req('/payroll', { token: adminToken() }),
        req('/payroll/my-bonus', { token: adminToken() }).catch(()=>null),
        isHead ? req('/payroll/commission-config', { token: adminToken() }).catch(()=>null) : Promise.resolve(null),
      ]);
      this._payrollPeriod = data.period;
      this._bonusRateCfg = rateCfg ? rateCfg.config : null;
      const content = `
        <h1 class="adm-h1">Ish haqi${data.period ? ` — ${esc(data.period)}` : ''}</h1>
        ${myBonus && !isHead ? `
        <div class="stat-grid">
          ${this.statCard(I.wallet, 'Joriy oy', fmtSom(myBonus.total||myBonus.amount||0), 'var(--green-600)', 'var(--green-50)')}
          ${this.statCard(I.checkCircle, 'Yakunlangan', (myBonus.completed_count||myBonus.count||0)+' ta', '#1E40AF', '#DBEAFE')}
          ${this.statCard(I.trophy, 'Bonus', fmtSom(myBonus.bonus||0), 'var(--gold)', 'var(--gold-l)')}
        </div>` : ''}
        ${isHead ? `
        <div class="stat-grid">
          ${this.statCard(I.wallet, 'Jami hisoblangan', fmtSom(data.totals?.total_payroll||0), 'var(--green-600)', 'var(--green-50)')}
          ${this.statCard(I.bell, "To'lanmagan", fmtSom(data.totals?.total_unpaid||0), '#B91C1C', '#FEE2E2')}
        </div>` : ''}
        ${this.renderPayrollTable(data, isHead)}
        ${isHead && this._bonusRateCfg ? this.renderBonusRatesCard(this._bonusRateCfg) : ''}`;
      this.root.innerHTML = this.shell('payroll', content);
      this.animateCounts();
    } catch (e) {
      this.root.innerHTML = this.shell('payroll', this.errorBlock(e.message));
    }
  },
  renderBonusRatesCard(cfg) {
    const ZONES = [
      ['tsh_yengil', 'Toshkent · Yengil'],
      ['tsh_yuk', 'Toshkent · Yuk'],
      ['other_yengil', 'Viloyat · Yengil'],
      ['other_yuk', 'Viloyat · Yuk'],
    ];
    const ROLES = [['worker','Xodim'],['head','Bosh admin'],['accountant','Buxgalter']];
    return `<div class="adm-card" style="max-width:680px">
      <h3 class="adm-card-title">Xodimlar bonusi (hudud va avto bo'yicha)</h3>
      <p style="color:var(--ink-2);font-size:13px;margin-bottom:14px">Har bir ariza narxidan foiz (%) — hudud va avto turiga qarab, har rol uchun alohida</p>
      <div class="bonus-rates-grid">
        <div class="brg-row brg-head"><span></span>${ROLES.map(([,l])=>`<span>${l}</span>`).join('')}</div>
        ${ZONES.map(([key,label]) => `
        <div class="brg-row">
          <span class="brg-lab">${label}</span>
          ${ROLES.map(([rk]) => `<input class="inp" id="bcr_${key}_${rk}" inputmode="numeric" value="${(cfg[key]&&cfg[key][rk])||0}">`).join('')}
        </div>`).join('')}
      </div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="Admin.saveBonusRates()">Saqlash</button>
    </div>`;
  },
  async saveBonusRates() {
    const ZONES = ['tsh_yengil','tsh_yuk','other_yengil','other_yuk'];
    const ROLES = ['worker','head','accountant'];
    const config = {};
    for (const z of ZONES) {
      config[z] = {};
      for (const r of ROLES) {
        const v = Number(document.getElementById(`bcr_${z}_${r}`).value);
        config[z][r] = Math.max(0, Math.min(100, isNaN(v) ? 0 : v));
      }
    }
    try {
      await AdminAPI.bonusRatesSave(config);
      toast('Bonus stavkalari saqlandi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  renderPayrollTable(data, isHead) {
    const rows = data.items || data.admins || data.workers || (Array.isArray(data) ? data : []);
    if (!rows.length) return `<div class="adm-card"><p class="muted-text" style="text-align:center;padding:24px">Ma'lumot yo'q</p></div>`;
    return `<div class="adm-card">
      <h3 class="adm-card-title">Xodimlar bo'yicha</h3>
      <div class="payroll-table ${isHead?'pt-head-mode':''}">
        <div class="pt-head"><span>Xodim</span><span>Arizalar</span><span>Jami</span>${isHead?'<span>To\'lanmagan</span><span></span>':''}</div>
        ${rows.map(w => `<div class="pt-row">
          <div class="pt-name"><div class="pt-av">${initials(w.full_name||w.name)}</div>${esc(w.full_name||w.name||'')}</div>
          <span>${w.completed||w.count||w.completed_count||0} ta</span>
          <b>${fmtSom(w.total_salary||w.total||w.amount||w.salary||0)}</b>
          ${isHead ? `
            <b class="${(w.unpaid||0)>0?'pt-unpaid':'pt-paid'}">${fmtSom(w.unpaid||0)}</b>
            ${(w.unpaid||0)>0 ? `<button class="btn btn-primary btn-sm" onclick="Admin.payrollPay('${w.admin_id}','${esc(w.full_name||'')}',${w.unpaid})">To'landi</button>` : `<span class="pt-ok">${I.checkCircle}</span>`}
          ` : ''}
        </div>`).join('')}
      </div>
    </div>`;
  },
  async payrollPay(adminId, name, unpaid) {
    if (!confirm(`${esc(name)} uchun ${fmtSom(unpaid)} to'lab berdingizmi?`)) return;
    try {
      await req('/payroll/pay', { method:'POST', body:{ admin_id: adminId }, token: adminToken() });
      toast("To'landi deb belgilandi", 'ok');
      this.viewPayroll();
    } catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // XODIMLAR (staff management)
  // ============================================================
  async viewStaff() {
    document.body.className = 'admin-body';
    this.root.innerHTML = this.shell('staff', `
      <div class="adm-apps-head">
        <h1 class="adm-h1">Xodimlar</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.openStaffForm()">${I.plus} Yangi xodim</button>
      </div>
      <div id="staffList">${this.loadingBlock()}</div>`);
    try {
      const r = await AdminAPI.staffList();
      const list = r.items || r.admins || (Array.isArray(r)?r:[]);
      const box = document.getElementById('staffList');
      if (!list.length) { box.innerHTML = this.emptyBlock(I.users, 'Xodimlar yo\'q', 'Birinchi xodimni qo\'shing'); return; }
      box.innerHTML = `<div class="staff-grid">${list.map(s=>this.staffCard(s)).join('')}</div>`;
    } catch (e) {
      document.getElementById('staffList').innerHTML = this.errorBlock(e.message);
    }
  },
  staffCard(s) {
    const blocked = s.account_status === 'blocked' || s.account_status === 'suspended';
    const isHead = s.role === 'head';
    // Bosh admin bo'lmagan menejer (masalan HR menejer) faqat xodim/recruiter'ni
    // tahrirlashi/bo'shatishi mumkin — buxgalter/menejer/bosh adminga tegmaydi
    const canManage = this.admin.role === 'head' || ['worker','recruiter'].includes(s.role);
    return `
      <div class="staff-card ${blocked?'blocked':''}">
        <div class="staff-top">
          <div class="staff-av">${initials(s.full_name||s.username)}</div>
          <div class="staff-info">
            <b>${esc(s.full_name||s.username)}</b>
            <span>@${esc(s.username)} · ${this.roleLabel(s.role)}</span>
          </div>
          <span class="staff-status ${blocked?'off':'on'}">${blocked?'Bloklangan':'Faol'}</span>
        </div>
        <div class="staff-stats">
          <div><b>${s.total_apps||0}</b><span>Arizalar</span></div>
          <div><b>${s.confirmed||0}</b><span>Tasdiq</span></div>
          <div><b>${s.commission_percent_base||0}%</b><span>Bonus</span></div>
        </div>
        ${isHead ? `<div class="staff-head-badge">${I.shieldCheck} Bosh administrator</div>` : canManage ? `<div class="staff-actions">
          <button class="btn btn-ghost btn-sm" onclick='Admin.openStaffForm(${JSON.stringify(s).replace(/'/g,"&#39;")})'>${I.edit} Tahrir</button>
          <button class="btn btn-ghost btn-sm ${blocked?'':'staff-block'}" onclick="Admin.toggleStaffStatus('${s.id}','${blocked?'active':'blocked'}')">
            ${blocked?'Faollashtirish':"Bo'shatish"}
          </button>
        </div>` : ''}
      </div>`;
  },
  openStaffForm(staff) {
    const edit = !!staff;
    const s = staff || {};
    showModal(`
      <h3 class="modal-title">${edit?'Xodimni tahrirlash':'Yangi xodim'}</h3>
      <div class="field"><label>F.I.Sh</label>
        <input class="inp" id="sf_name" value="${esc(s.full_name||'')}" placeholder="Familiya Ism"></div>
      <div class="field"><label>Login</label>
        <input class="inp" id="sf_user" value="${esc(s.username||'')}" placeholder="username" ${edit?'disabled':''}></div>
      <div class="field"><label>Parol ${edit?'<span class="opt">(o\'zgartirish uchun)</span>':''}</label>
        <input class="inp" id="sf_pass" type="password" placeholder="${edit?'Bo\'sh qoldiring':'Kamida 6 belgi'}"></div>
      <div class="field"><label>Rol</label>
        <select class="inp" id="sf_role">
          ${(this.admin.role==='head'?this.ROLES:this.ROLES_NONHEAD).map(r=>`<option value="${r.id}" ${s.role===r.id?'selected':''}>${r.label}</option>`).join('')}
        </select></div>
      <div class="field"><label>Qo'shimcha bonus foizi (%) <span class="opt">(ixtiyoriy)</span></label>
        <input class="inp" id="sf_comm" inputmode="numeric" value="${s.commission_percent_base||0}" placeholder="0"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" id="sfBtn" onclick="Admin.saveStaff('${edit?s.id:''}')">Saqlash</button>
      </div>`);
  },
  async saveStaff(id) {
    const full_name = document.getElementById('sf_name').value.trim();
    const username = document.getElementById('sf_user').value.trim();
    const password = document.getElementById('sf_pass').value;
    const role = document.getElementById('sf_role').value;
    const commission_percent_base = Number(document.getElementById('sf_comm').value) || 0;
    if (!full_name) return toast('F.I.Sh kiriting', 'err');
    const btn = document.getElementById('sfBtn');
    setLoading(btn, true);
    try {
      if (id) {
        const data = { full_name, role, commission_percent_base };
        if (password) data.password = password;
        await AdminAPI.staffUpdate(id, data);
      } else {
        if (!username) { setLoading(btn,false); return toast('Login kiriting', 'err'); }
        if (password.length < 6) { setLoading(btn,false); return toast('Parol kamida 6 belgi', 'err'); }
        await AdminAPI.staffCreate({ full_name, username, password, role, commission_percent_base });
      }
      closeModal(); toast('Saqlandi', 'ok'); this.viewStaff();
    } catch (e) { setLoading(btn, false); toast(e.message, 'err'); }
  },
  async toggleStaffStatus(id, status) {
    const action = status === 'blocked' ? 'bloklashni' : 'faollashtirishni';
    if (!confirm(`Xodimni ${action} tasdiqlaysizmi?`)) return;
    try { await AdminAPI.staffStatus(id, status); toast('Bajarildi', 'ok'); this.viewStaff(); }
    catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // TO'LOV USULLARI
  // ============================================================
  async viewPayMethods() {
    document.body.className = 'admin-body';
    this.root.innerHTML = this.shell('paymethods', `
      <div class="adm-apps-head">
        <h1 class="adm-h1">To'lov usullari</h1>
        <button class="btn btn-primary btn-sm" onclick="Admin.openPayMethodForm()">${I.plus} Qo'shish</button>
      </div>
      <div id="pmList">${this.loadingBlock()}</div>`);
    try {
      const r = await AdminAPI.payMethods();
      const list = r.items || (Array.isArray(r)?r:[]);
      const box = document.getElementById('pmList');
      if (!list.length) { box.innerHTML = this.emptyBlock(I.card, 'To\'lov usullari yo\'q', 'Birinchisini qo\'shing'); return; }
      box.innerHTML = `<div class="pm-grid">${list.map(m=>this.pmCard(m)).join('')}</div>`;
    } catch (e) {
      document.getElementById('pmList').innerHTML = this.errorBlock(e.message);
    }
  },
  pmCard(m) {
    return `
      <div class="pm-card" style="--pm-bg:${m.bg_color||'#E1F5EE'};--pm-fg:${m.color||'#0F6E56'}">
        <div class="pm-icon">${esc(m.icon||'💳')}</div>
        <div class="pm-body">
          <b>${esc(m.name)}</b>
          <span>${esc(m.code)}${m.type?' · '+esc(m.type):''}</span>
          ${m.payment_link?`<span class="pm-link">${esc(m.payment_link)}</span>`:''}
        </div>
        <div class="pm-side">
          <span class="pm-active ${m.is_active!==false?'on':'off'}">${m.is_active!==false?'Faol':'O\'chiq'}</span>
          <div class="pm-actions">
            <button class="icon-btn" onclick='Admin.openPayMethodForm(${JSON.stringify(m).replace(/'/g,"&#39;")})'>${I.edit}</button>
            <button class="icon-btn danger" onclick="Admin.deletePayMethod('${m.id||m._id}')">${I.x}</button>
          </div>
        </div>
      </div>`;
  },
  openPayMethodForm(m) {
    const edit = !!m;
    m = m || {};
    showModal(`
      <h3 class="modal-title">${edit?'To\'lov usulini tahrirlash':'Yangi to\'lov usuli'}</h3>
      <div class="field-row">
        <div class="field"><label>Kod</label>
          <input class="inp" id="pm_code" value="${esc(m.code||'')}" placeholder="payme" ${edit?'disabled':''}></div>
        <div class="field"><label>Ikona (emoji)</label>
          <input class="inp" id="pm_icon" value="${esc(m.icon||'💳')}" placeholder="💳"></div>
      </div>
      <div class="field"><label>Nomi</label>
        <input class="inp" id="pm_name" value="${esc(m.name||'')}" placeholder="Payme"></div>
      <div class="field"><label>To'lov havolasi (ixtiyoriy)</label>
        <input class="inp" id="pm_link" value="${esc(m.payment_link||'')}" placeholder="https://payme.uz/..."></div>
      <div class="field"><label>Izoh (ixtiyoriy)</label>
        <input class="inp" id="pm_desc" value="${esc(m.description||'')}" placeholder="Tavsif"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" id="pmBtn" onclick="Admin.savePayMethod('${edit?(m.id||m._id):''}')">Saqlash</button>
      </div>`);
  },
  async savePayMethod(id) {
    const code = document.getElementById('pm_code').value.trim();
    const name = document.getElementById('pm_name').value.trim();
    const icon = document.getElementById('pm_icon').value.trim() || '💳';
    const payment_link = document.getElementById('pm_link').value.trim();
    const description = document.getElementById('pm_desc').value.trim();
    if (!name) return toast('Nomini kiriting', 'err');
    const btn = document.getElementById('pmBtn');
    setLoading(btn, true);
    try {
      if (id) await AdminAPI.payMethodUpdate(id, { name, icon, payment_link, description });
      else {
        if (!code) { setLoading(btn,false); return toast('Kod kiriting', 'err'); }
        await AdminAPI.payMethodCreate({ code, name, icon, payment_link, description });
      }
      closeModal(); toast('Saqlandi', 'ok'); this.viewPayMethods();
    } catch (e) { setLoading(btn, false); toast(e.message, 'err'); }
  },
  async deletePayMethod(id) {
    if (!confirm('To\'lov usulini o\'chirasizmi?')) return;
    try { await AdminAPI.payMethodDelete(id); toast('O\'chirildi', 'ok'); this.viewPayMethods(); }
    catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // SOZLAMALAR
  // ============================================================
  async viewSettings() {
    document.body.className = 'admin-body';
    this.root.innerHTML = this.shell('settings', this.loadingBlock());
    try {
      const [s, backups, reviews] = await Promise.all([
        AdminAPI.settings(),
        AdminAPI.backupList().catch(() => ({ items: [] })),
        AdminAPI.reviewsList().catch(() => ({ items: [] })),
      ]);
      const maintenance = !!s.maintenance_mode;
      const renewal = s.renewal_enabled !== false;
      const reqLicense = s.require_driver_license === true;
      this._backups = backups.items || [];
      const pendingReviews = (reviews.items || []).filter(r => r.status === 'pending');
      const content = `
        <h1 class="adm-h1">Sozlamalar</h1>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-row">
            <div class="setting-txt">
              <h3>Haydovchilik guvohnomasini so'rash</h3>
              <p>Yoqilsa, ariza berishда mijozdan har bir haydovchining guvohnoma seriyasi ham so'raladi</p>
            </div>
            <button class="toggle ${reqLicense?'on':''}" id="tgLicense" onclick="Admin.toggleDriverLicense(${!reqLicense})">
              <span class="toggle-knob"></span>
            </button>
          </div>
        </div>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-row">
            <div class="setting-txt">
              <h3>Texnik ish rejimi</h3>
              <p>Yoqilsa, mijozlar ilovaga kira olmaydi (faqat texnik xizmat xabari ko'rinadi)</p>
            </div>
            <button class="toggle ${maintenance?'on':''}" id="tgMaint" onclick="Admin.toggleMaintenance(${!maintenance})">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="field" style="margin-top:14px">
            <label>Texnik xizmat xabari</label>
            <input class="inp" id="maintMsg" value="${esc(s.maintenance_message||'')}" placeholder="Ilova vaqtincha texnik xizmatда...">
          </div>
        </div>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-row">
            <div class="setting-txt">
              <h3>Polisni yangilash</h3>
              <p>O'chirilsa, mijozlar eski polisni yangilay olmaydi</p>
            </div>
            <button class="toggle ${renewal?'on':''}" id="tgRenew" onclick="Admin.toggleRenewal(${!renewal})">
              <span class="toggle-knob"></span>
            </button>
          </div>
          <div class="field" style="margin-top:14px">
            <label>O'chirilgan holatdagi xabar</label>
            <input class="inp" id="renewMsg" value="${esc(s.renewal_disabled_message||'')}" placeholder="Yangilash vaqtincha mavjud emas">
          </div>
        </div>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-txt" style="margin-bottom:12px">
            <h3>Yordam — Telegram havolasi</h3>
            <p>Mijoz "Yordam" bo'limida shu Telegram orqali murojaat qiladi (masalan, https://t.me/online_sugurtambot)</p>
          </div>
          <div class="field">
            <label>Telegram havolasi (https://t.me/...)</label>
            <input class="inp" id="supportTg" value="${esc(s.contact_admin_tg_url||'')}" placeholder="https://t.me/online_sugurtambot">
          </div>
          <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="Admin.saveSupportTg()">Saqlash</button>
        </div>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-txt" style="margin-bottom:12px">
            <h3>Yangi sharhlar (tasdiqlash kutmoqda) ${pendingReviews.length ? `<span class="flag-badge">${pendingReviews.length}</span>` : ''}</h3>
            <p>Mijozlar polis tayyor bo'lgach avtomatik so'ralgan sharhlar. Tasdiqlansa, pastdagi ro'yxatga qo'shiladi.</p>
          </div>
          <div id="pendingReviewsList">${this.renderPendingReviews(pendingReviews)}</div>
        </div>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-txt" style="margin-bottom:12px">
            <h3>Mijoz sharhlari (saytda ko'rinadi)</h3>
            <p>Faqat haqiqiy mijozlardan olingan sharhlarni qo'shing — bosh sahifada ishonch bloki sifatida chiqadi</p>
          </div>
          <div id="testiList">${this.renderTestimonialRows(Array.isArray(s.testimonials) ? s.testimonials : [])}</div>
          <button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="Admin.addTestimonialRow()">+ Sharh qo'shish</button>
          <button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="Admin.saveTestimonials()">Saqlash</button>
        </div>

        <div class="adm-card setting-card" style="max-width:600px">
          <div class="setting-txt" style="margin-bottom:12px">
            <h3>Zaxira nusxa (backup)</h3>
            <p>Ma'lumotlar bazasi har kuni avtomatik serverning o'z diskiga saqlanadi (oxirgi 14 kun). Tashqi joyga (kompyuteringizga) saqlab qo'yish uchun quyidagidan yuklab oling.</p>
          </div>
          <button class="btn btn-outline btn-sm" id="bkRunBtn" onclick="Admin.backupRun()">${I.refresh} Hozir zaxira olish</button>
          <div id="bkList" style="margin-top:14px">${this.renderBackupList()}</div>
        </div>`;
      this.root.innerHTML = this.shell('settings', content);
    } catch (e) {
      this.root.innerHTML = this.shell('settings', this.errorBlock(e.message));
    }
  },
  renderTestimonialRows(list) {
    if (!list.length) return `<p style="font-size:13px;color:var(--ink-2)">Hali sharh qo'shilmagan</p>`;
    return list.map((t, i) => `
      <div class="testi-row" style="display:flex;gap:8px;margin-top:${i?'10px':'0'};align-items:flex-start">
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          <input class="inp testi-name" value="${esc(t.name||'')}" placeholder="Mijoz ismi">
          <input class="inp testi-city" value="${esc(t.city||'')}" placeholder="Shahar (ixtiyoriy)">
          <textarea class="inp testi-text" rows="2" placeholder="Sharh matni">${esc(t.text||'')}</textarea>
        </div>
        <button class="btn btn-outline btn-sm" onclick="this.closest('.testi-row').remove()">${I.x}</button>
      </div>`).join('');
  },
  addTestimonialRow() {
    const wrap = document.getElementById('testiList');
    if (wrap.querySelector('p')) wrap.innerHTML = '';
    wrap.insertAdjacentHTML('beforeend', this.renderTestimonialRows([{}]).replace('margin-top:0', `margin-top:${wrap.children.length?'10px':'0'}`));
  },
  async saveTestimonials() {
    const rows = Array.from(document.querySelectorAll('#testiList .testi-row'));
    const testimonials = rows.map(r => ({
      name: r.querySelector('.testi-name').value.trim(),
      city: r.querySelector('.testi-city').value.trim(),
      text: r.querySelector('.testi-text').value.trim(),
    })).filter(t => t.text);
    try {
      await AdminAPI.setSetting('testimonials', testimonials);
      toast("Sharhlar saqlandi", 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async saveSupportTg() {
    const url = document.getElementById('supportTg').value.trim();
    if (url && !/^https?:\/\//i.test(url)) return toast('Havola https:// bilan boshlanishi kerak', 'err');
    try {
      await AdminAPI.setSetting('contact_admin_tg_url', url);
      toast('Telegram havolasi saqlandi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async toggleMaintenance(enabled) {
    const msg = document.getElementById('maintMsg').value.trim();
    try {
      await AdminAPI.setMaintenance(enabled, msg);
      document.getElementById('tgMaint').className = 'toggle ' + (enabled?'on':'');
      document.getElementById('tgMaint').setAttribute('onclick', `Admin.toggleMaintenance(${!enabled})`);
      toast(enabled?'Texnik rejim yoqildi':'Texnik rejim o\'chirildi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async toggleRenewal(enabled) {
    const msg = document.getElementById('renewMsg').value.trim();
    try {
      await AdminAPI.setRenewal(enabled, msg);
      document.getElementById('tgRenew').className = 'toggle ' + (enabled?'on':'');
      document.getElementById('tgRenew').setAttribute('onclick', `Admin.toggleRenewal(${!enabled})`);
      toast(enabled?'Yangilash yoqildi':'Yangilash o\'chirildi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async toggleDriverLicense(enabled) {
    try {
      await AdminAPI.setSetting('require_driver_license', !!enabled);
      const el = document.getElementById('tgLicense');
      el.className = 'toggle ' + (enabled?'on':'');
      el.setAttribute('onclick', `Admin.toggleDriverLicense(${!enabled})`);
      toast(enabled?'Guvohnoma so\'raladi':'Guvohnoma so\'ralmaydi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  renderPendingReviews(items) {
    if (!items.length) return `<p class="muted-text">Hozircha yangi sharh yo'q</p>`;
    return items.map(r => `
      <div class="pending-review-row">
        <div class="prr-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
        ${r.text ? `<p class="prr-text">"${esc(r.text)}"</p>` : `<p class="prr-text muted-text">Matnsiz, faqat baho</p>`}
        <div class="prr-meta">${esc(r.name||'Mijoz')} · ${fmtPhone(r.phone)} · ${fmtDate(r.createdAt)}</div>
        <div class="prr-actions">
          <button class="btn btn-primary btn-sm" onclick="Admin.reviewApprove('${r._id}')">Tasdiqlash</button>
          <button class="btn btn-ghost btn-sm" onclick="Admin.reviewReject('${r._id}')">Rad etish</button>
        </div>
      </div>`).join('');
  },
  async reviewApprove(id) {
    try {
      await AdminAPI.reviewApprove(id);
      toast('Tasdiqlandi va saytga qo\'shildi', 'ok');
      this.viewSettings();
    } catch (e) { toast(e.message, 'err'); }
  },
  async reviewReject(id) {
    try {
      await AdminAPI.reviewReject(id);
      toast('Rad etildi', 'ok');
      this.viewSettings();
    } catch (e) { toast(e.message, 'err'); }
  },
  renderBackupList() {
    const items = this._backups || [];
    if (!items.length) return `<p class="muted-text">Hozircha zaxira nusxa yo'q</p>`;
    return `<div class="bonus-list">${items.map(b => `
      <div class="bonus-user-row">
        <div><b>${esc(b.name)}</b><span>${fmtDate(b.createdAt)} · ${b.sizeKb} KB</span></div>
        <button class="btn btn-ghost btn-sm" onclick="Admin.backupDownload('${b.name}')">${I.download}</button>
      </div>`).join('')}</div>`;
  },
  async backupRun() {
    const btn = document.getElementById('bkRunBtn');
    setLoading(btn, true, 'Olinmoqda...');
    try {
      await AdminAPI.backupRun();
      toast('Zaxira nusxa olindi', 'ok');
      this.viewSettings();
    } catch (e) {
      setLoading(btn, false);
      toast(e.message, 'err');
    }
  },
  async backupDownload(name) {
    try {
      const blob = await AdminAPI.backupDownload(name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // BONUSLAR (referral) — bosh admin
  // ============================================================
  async viewBonus() {
    this.root.innerHTML = this.shell('bonus', this.loadingBlock());
    try {
      const [cfg, ov, rt] = await Promise.all([
        AdminAPI.refConfig(), AdminAPI.refOverview(), AdminAPI.refRating(),
      ]);
      this._refCfg = cfg;
      const RATES = [
        ['tsh_yengil', 'Toshkent · Yengil'],
        ['tsh_yuk', 'Toshkent · Yuk'],
        ['bsh_yengil', 'Viloyat · Yengil'],
        ['bsh_yuk', 'Viloyat · Yuk'],
      ];
      const rateRow = (table, prefix) => ([key, lab]) => {
        const r = (table && table[key]) || { mode:'percent', value:0 };
        return `<div class="bonus-rate-row">
          <span class="brr-lab">${lab}</span>
          <select class="inp brr-mode" id="${prefix}mode_${key}">
            <option value="percent" ${r.mode==='percent'?'selected':''}>Foiz %</option>
            <option value="fixed" ${r.mode==='fixed'?'selected':''}>So'm</option>
          </select>
          <input class="inp brr-val" id="${prefix}val_${key}" inputmode="numeric" value="${r.value||0}">
        </div>`;
      };
      const ovRows = ov.items.length ? ov.items.map(u => `
        <div class="bonus-user-row">
          <div onclick="Admin.bonusHistory('${u.phone}','${esc(u.name)}')" style="cursor:pointer">
            <b>${esc(u.name)} ${u.flagged?`<span class="flag-badge" title="Shubhali faoliyat — to'lashdan oldin tarixni tekshiring">⚠️ Tekshiring</span>`:''}</b>
            <span>${fmtPhone(u.phone)}</span>
          </div>
          <div class="bur-bal">${fmtSom(u.balance)}</div>
          <button class="btn btn-primary btn-sm" onclick="Admin.bonusPayout('${u.phone}', ${u.balance})">To'landi</button>
        </div>`).join('') : `<p class="muted-text" style="padding:14px">Hozircha to'lanadigan bonus yo'q</p>`;
      const rtRows = rt.items.length ? rt.items.map((u,i) => `
        <div class="bonus-rank-row" onclick="Admin.bonusHistory('${u.phone}','${esc(u.name)}')" style="cursor:pointer">
          <span class="brk-n">${i+1}</span>
          <div><b>${esc(u.name)}</b><span>${fmtPhone(u.phone)}</span></div>
          <div class="brk-c">${u.referral_count} ta · ${fmtSom(u.total_earned)}</div>
        </div>`).join('') : `<p class="muted-text" style="padding:14px">Hali taklif yo'q</p>`;

      const content = `
        <h1 class="adm-h1">Bonuslar (referral)</h1>

        <div class="adm-card setting-card" style="max-width:640px">
          <div class="setting-row">
            <div class="setting-txt"><h3>Bonus tizimi</h3><p>Mijoz do'stiga sug'urta qildirса bonus oladi</p></div>
            <button class="toggle ${cfg.enabled?'on':''}" id="tgBonus" onclick="Admin.bonusToggle('enabled',${!cfg.enabled})"><span class="toggle-knob"></span></button>
          </div>
          <div class="setting-row" style="margin-top:10px">
            <div class="setting-txt"><h3>Birinchi sug'urta uchun ham bonus</h3><p>Do'stning birinchi sug'urtasi uchun ham bonus berilsinmi</p></div>
            <button class="toggle ${cfg.first_insurance?'on':''}" id="tgFirst" onclick="Admin.bonusToggle('first_insurance',${!cfg.first_insurance})"><span class="toggle-knob"></span></button>
          </div>
          ${cfg.first_insurance ? `
          <div class="bonus-rate-row" style="margin-top:12px">
            <span class="brr-lab">Birinchi sug'urta stavkasi</span>
            <select class="inp brr-mode" id="rmode_first_insurance">
              <option value="percent" ${cfg.first_insurance_rate.mode==='percent'?'selected':''}>Foiz %</option>
              <option value="fixed" ${cfg.first_insurance_rate.mode==='fixed'?'selected':''}>So'm</option>
            </select>
            <input class="inp brr-val" id="rval_first_insurance" inputmode="numeric" value="${cfg.first_insurance_rate.value||0}">
          </div>` : ''}
          <div class="setting-row" style="margin-top:10px">
            <div class="setting-txt"><h3>Bonusni chegirma sifatida ishlatish</h3><p>Mijoz bonusини keyingi sug'urtaga chegirma qiladi (faqat karta to'lovda)</p></div>
            <button class="toggle ${cfg.allow_discount?'on':''}" id="tgDisc" onclick="Admin.bonusToggle('allow_discount',${!cfg.allow_discount})"><span class="toggle-knob"></span></button>
          </div>
        </div>

        <div class="adm-card setting-card" style="max-width:640px">
          <h3 class="adm-card-title">Taklif havolasi — bonus stavkalari (hudud × avto)</h3>
          <p style="color:var(--ink-2);font-size:13px;margin-bottom:12px">Mijoz o'z havolasini ulashib do'stini taklif qilsa. Har biri foiz (%) yoki qat'iy so'm summa</p>
          ${RATES.map(rateRow(cfg.rates, 'r')).join('')}
          <div class="field" style="margin-top:14px">
            <label>Bonus olish uchun murojaat (Telegram havolasi)</label>
            <input class="inp" id="refContact" value="${esc(cfg.payout_contact||'')}" placeholder="https://t.me/...">
          </div>
          <button class="btn btn-primary" style="margin-top:14px" onclick="Admin.bonusSaveConfig()">Saqlash</button>
        </div>

        <div class="adm-card setting-card" style="max-width:640px">
          <div class="setting-row">
            <div class="setting-txt"><h3>Boshqa odam uchun — alohida bonus</h3><p>Mijoz ilova ichida "Boshqa odam uchun" bo'limidan to'g'ridan-to'g'ri do'stiga sug'urta qilib bersa</p></div>
            <button class="toggle ${cfg.direct_enabled?'on':''}" id="tgDirect" onclick="Admin.bonusToggle('direct_enabled',${!cfg.direct_enabled})"><span class="toggle-knob"></span></button>
          </div>
          ${cfg.first_insurance ? `
          <div class="bonus-rate-row" style="margin-top:12px">
            <span class="brr-lab">Birinchi sug'urta stavkasi</span>
            <select class="inp brr-mode" id="drmode_first_insurance">
              <option value="percent" ${cfg.direct_first_insurance_rate.mode==='percent'?'selected':''}>Foiz %</option>
              <option value="fixed" ${cfg.direct_first_insurance_rate.mode==='fixed'?'selected':''}>So'm</option>
            </select>
            <input class="inp brr-val" id="drval_first_insurance" inputmode="numeric" value="${cfg.direct_first_insurance_rate.value||0}">
          </div>` : ''}
          <div style="margin-top:12px">${RATES.map(rateRow(cfg.direct_rates, 'dr')).join('')}</div>
          <button class="btn btn-primary" style="margin-top:14px" onclick="Admin.bonusSaveConfig()">Saqlash</button>
        </div>

        <div class="adm-card" style="max-width:640px">
          <div class="adm-card-title-row">
            <h3 class="adm-card-title">To'lanadigan bonuslar (${ov.items.length})</h3>
            <span class="bonus-total-unpaid">${fmtSom(ov.total_unpaid||0)}</span>
          </div>
          <div class="bonus-list">${ovRows}</div>
        </div>

        <div class="adm-card" style="max-width:640px">
          <h3 class="adm-card-title">🏆 Eng ko'p taklif qilganlar</h3>
          <div class="bonus-list">${rtRows}</div>
        </div>`;
      this.root.innerHTML = this.shell('bonus', content);
    } catch (e) {
      this.root.innerHTML = this.shell('bonus', this.errorBlock(e.message));
    }
  },
  async bonusToggle(key, val) {
    try {
      const patch = {}; patch[key] = val;
      await AdminAPI.refSaveConfig(patch);
      toast('Saqlandi', 'ok');
      // first_insurance yoqilsa/o'chirilsa stavka qatori ko'rinishi o'zgaradi — qayta chizamiz
      if (key === 'first_insurance') { this.viewBonus(); return; }
      const id = { enabled:'tgBonus', allow_discount:'tgDisc', direct_enabled:'tgDirect' }[key];
      const el = document.getElementById(id);
      el.className = 'toggle ' + (val?'on':'');
      el.setAttribute('onclick', `Admin.bonusToggle('${key}',${!val})`);
    } catch (e) { toast(e.message, 'err'); }
  },
  async bonusSaveConfig() {
    const keys = ['tsh_yengil','tsh_yuk','bsh_yengil','bsh_yuk'];
    const readRates = (prefix) => {
      const rates = {};
      keys.forEach(k => {
        const modeEl = document.getElementById(prefix+'mode_'+k);
        const valEl = document.getElementById(prefix+'val_'+k);
        if (!modeEl || !valEl) return;
        rates[k] = { mode: modeEl.value, value: Number(valEl.value) || 0 };
      });
      return rates;
    };
    const rates = readRates('r');
    const direct_rates = readRates('dr');
    const payout_contact = document.getElementById('refContact').value.trim();
    if (payout_contact && !/^https?:\/\//i.test(payout_contact)) return toast('Havola https:// bilan boshlanishi kerak', 'err');
    const body = { rates, direct_rates, payout_contact };
    const fiMode = document.getElementById('rmode_first_insurance');
    const fiVal = document.getElementById('rval_first_insurance');
    if (fiMode && fiVal) {
      body.first_insurance_rate = { mode: fiMode.value, value: Number(fiVal.value) || 0 };
    }
    const dfiMode = document.getElementById('drmode_first_insurance');
    const dfiVal = document.getElementById('drval_first_insurance');
    if (dfiMode && dfiVal) {
      body.direct_first_insurance_rate = { mode: dfiMode.value, value: Number(dfiVal.value) || 0 };
    }
    try {
      await AdminAPI.refSaveConfig(body);
      toast('Bonus sozlamalari saqlandi', 'ok');
    } catch (e) { toast(e.message, 'err'); }
  },
  async bonusPayout(phone, balance) {
    if (!confirm(`${fmtSom(balance)} bonusni to'lab berdingizmi? Balans 0 ga tushadi.`)) return;
    try {
      await AdminAPI.refPayout(phone);
      toast('To\'landi deb belgilandi', 'ok');
      this.viewBonus();
    } catch (e) { toast(e.message, 'err'); }
  },
  async bonusHistory(phone, name) {
    showModal(`<h3 class="modal-title">${esc(name)} — bonus tarixi</h3><div id="bonusHistBody" style="padding:8px 0">${this.loadingBlock ? this.loadingBlock() : 'Yuklanmoqda...'}</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="closeModal()">Yopish</button></div>`);
    try {
      const ub = await ClientAPI.refUser(phone);
      const txs = ub.transactions || [];
      const FLAG_LABELS = {
        ip_match: 'Referrer va do\'stning IP manzili bir xil',
        high_velocity: 'So\'nggi 24 soatda juda ko\'p bonus olgan',
      };
      const rows = txs.length ? txs.map(t => `
        <div class="bx-tx">
          <div><b>${t.type==='earned'?'Bonus qo\'shildi':t.type==='paid'?'To\'lab berildi':t.type==='discount'?'Chegirma':'—'}</b>
            <span>${fmtDate(t.createdAt)}</span>
            ${t.note ? `<span class="bx-tx-note">${esc(t.note)}</span>` : ''}
            ${t.flagged ? `<span class="flag-badge">⚠️ ${(t.flag_reasons||[]).map(r=>FLAG_LABELS[r]||r).join(', ')}</span>` : ''}</div>
          <div class="bx-amt ${t.amount<0?'neg':''}">${t.amount>0?'+':''}${fmtSom(Math.abs(t.amount))}</div>
        </div>`).join('') : `<p class="muted-text" style="text-align:center;padding:16px">Hozircha tranzaksiya yo'q</p>`;
      const body = document.getElementById('bonusHistBody');
      if (body) body.innerHTML = `
        <div style="display:flex;justify-content:space-between;padding:8px 2px 14px;border-bottom:1px solid var(--line);margin-bottom:6px">
          <span class="muted-text">Balans: <b style="color:var(--ink)">${fmtSom(ub.balance)}</b></span>
          <span class="muted-text">Jami ishlangan: <b style="color:var(--ink)">${fmtSom(ub.total_earned)}</b></span>
        </div>
        ${rows}`;
    } catch (e) {
      const body = document.getElementById('bonusHistBody');
      if (body) body.innerHTML = `<p class="muted-text" style="padding:14px">${esc(e.message)}</p>`;
    }
  },

  // ============================================================
  // OMMAVIY XABAR (BROADCAST)
  // ============================================================
  async viewBroadcast() {
    this.root.innerHTML = this.shell('broadcast', this.loadingBlock());
    try {
      const list = await AdminAPI.broadcastList();
      this._broadcasts = list.items || [];
      const content = `
        <h1 class="adm-h1">Ommaviy xabar</h1>

        <div class="adm-card setting-card" style="max-width:640px">
          <h3 class="adm-card-title">Yangi xabar yuborish</h3>
          <p style="color:var(--ink-2);font-size:13px;margin-bottom:12px">Barcha ro'yxatdan o'tgan mijozlarga yuboriladi (ilova ichi + Telegram)</p>
          <div class="field"><label>Sarlavha</label><input class="inp" id="bcTitle" placeholder="Masalan: Yangi aksiya!"></div>
          <div class="field"><label>Matn</label><textarea class="inp" id="bcMessage" rows="4" placeholder="Xabar matni..."></textarea></div>
          <div class="field"><label>Rasm (ixtiyoriy)</label><input class="inp" type="file" id="bcImage" accept="image/*"></div>
          <div class="field"><label>Qisqa video (ixtiyoriy)</label><input class="inp" type="file" id="bcVideo" accept="video/*"></div>
          <div class="field"><label>Video havolasi (ixtiyoriy)</label><input class="inp" id="bcVideoUrl" placeholder="https://..."></div>
          <button class="btn btn-primary" style="margin-top:14px" id="bcSendBtn" onclick="Admin.broadcastSend()">${I.send} Yuborish</button>
        </div>

        <div class="adm-card" style="max-width:640px">
          <h3 class="adm-card-title">Yuborilgan xabarlar (${this._broadcasts.length})</h3>
          <div id="bcList">${this.renderBroadcastList()}</div>
        </div>`;
      this.root.innerHTML = this.shell('broadcast', content);
    } catch (e) {
      this.root.innerHTML = this.shell('broadcast', this.errorBlock(e.message));
    }
  },
  renderBroadcastList() {
    const list = this._broadcasts || [];
    if (!list.length) return `<p class="muted-text" style="padding:14px">Hozircha xabar yuborilmagan</p>`;
    return list.map(b => `
      <div class="broadcast-row">
        ${b.image ? `<img class="broadcast-thumb" src="${grossFileUrl(b.image)}">` : (b.video ? `<video class="broadcast-thumb" src="${grossFileUrl(b.video)}" muted></video>` : '')}
        <div class="broadcast-info">
          <b>${esc(b.title)}</b>
          <span>${esc((b.message||'').slice(0,80))}${(b.message||'').length>80?'…':''}</span>
          <span class="muted-text">${fmtDate(b.createdAt)} · ${b.sent_count||0} ta mijozga yuborildi</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Admin.broadcastDelete('${b._id}')">${I.x}</button>
      </div>`).join('');
  },
  async broadcastSend() {
    const title = document.getElementById('bcTitle').value.trim();
    const message = document.getElementById('bcMessage').value.trim();
    if (!title || !message) return toast('Sarlavha va matnni kiriting', 'err');
    const imageFile = document.getElementById('bcImage').files[0];
    const videoFile = document.getElementById('bcVideo').files[0];
    const videoUrl = document.getElementById('bcVideoUrl').value.trim();
    const btn = document.getElementById('bcSendBtn');
    setLoading(btn, true, 'Yuborilmoqda...');
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('message', message);
      if (imageFile) fd.append('image', imageFile);
      if (videoFile) fd.append('video', videoFile);
      if (videoUrl) fd.append('video_url', videoUrl);
      await AdminAPI.broadcastSend(fd);
      toast('Xabar yuborilmoqda', 'ok');
      this.viewBroadcast();
    } catch (e) {
      setLoading(btn, false);
      toast(e.message, 'err');
    }
  },
  async broadcastDelete(id) {
    if (!confirm("Bu xabarni o'chirmoqchimisiz? Mijozlar kabinetidan va Telegramdan ham o'chadi.")) return;
    try {
      await AdminAPI.broadcastDelete(id);
      toast("O'chirildi", 'ok');
      this.viewBroadcast();
    } catch (e) { toast(e.message, 'err'); }
  },

  // ============================================================
  // PROFIL
  // ============================================================
  viewProfile() {
    document.body.className = 'admin-body';
    const a = this.admin;
    const content = `
      <h1 class="adm-h1">Profil</h1>
      <div class="adm-card" style="max-width:480px">
        <div class="adm-profile-head">
          <div class="aph-av">${initials(a.full_name||a.username)}</div>
          <div><b>${esc(a.full_name||a.username)}</b><span>${this.roleLabel(a.role)}</span></div>
        </div>
        <div class="detail-rows" style="margin-top:16px">
          <div class="dr"><span>Login</span><b>${esc(a.username)}</b></div>
          <div class="dr"><span>Rol</span><b>${this.roleLabel(a.role)}</b></div>
          <div class="dr"><span>Holat</span><b>${a.account_status==='active'?'Faol':a.account_status||'—'}</b></div>
        </div>
        <button class="btn btn-ghost btn-block btn-danger" style="margin-top:20px" onclick="Admin.logout()">${I.logout} Chiqish</button>
      </div>`;
    this.root.innerHTML = this.shell('profile', content);
  },
};
