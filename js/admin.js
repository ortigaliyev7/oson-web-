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
    this.route();
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
    return { head:'Rahbar', worker:'Xodim', operator:'Operator', accountant:'Hisobchi', recruiter:'Rekruter', executive:'Menejer' }[r] || r;
  },
  ROLES: [
    { id:'worker', label:'Xodim' },
    { id:'accountant', label:'Hisobchi' },
    { id:'recruiter', label:'Rekruter' },
    { id:'executive', label:'Menejer' },
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
      const content = `
        <h1 class="adm-h1">Statistika</h1>
        <div class="stat-grid">
          ${this.statCard(I.inbox, 'Jami arizalar', s.total||0, 'var(--green-600)', 'var(--green-50)')}
          ${this.statCard(I.clock, 'Bugun', s.todayCount||0, '#1E40AF', '#DBEAFE')}
          ${this.statCard(I.wallet, 'Tushum', fmtSom(s.totalRevenue||0), 'var(--gold)', 'var(--gold-l)')}
          ${this.statCard(I.chart, 'Daromad', fmtSom(s.totalIncome||0), '#6B21A8', '#F3E8FF')}
        </div>

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
    } catch (e) {
      this.root.innerHTML = this.shell('dashboard', this.errorBlock(e.message));
    }
  },
  statCard(ic, label, value, color, bg) {
    return `<div class="stat-card">
      <div class="sc-ic" style="background:${bg};color:${color}">${ic}</div>
      <div class="sc-val">${value}</div>
      <div class="sc-lab">${label}</div>
    </div>`;
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
    return byDay.slice(-14).map(d => {
      const v = d.count || d.total || 0;
      const h = Math.round((v/max)*100);
      const label = (d.date || d.day || '').slice(5);
      return `<div class="dc-col">
        <div class="dc-bar-wrap"><div class="dc-bar" style="height:${Math.max(h,4)}%" title="${v}"></div></div>
        <div class="dc-label">${label}</div>
      </div>`;
    }).join('');
  },

  // ============================================================
  // ARIZALAR ro'yxati (real-time polling)
  // ============================================================
  async viewApps() {
    document.body.className = 'admin-body';
    if (!document.querySelector('.adm-layout')) {
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
  setFilter(f) { this.filter = f; this.renderFilters(); this.renderApps(); },

  renderApps() {
    const box = document.getElementById('admAppsList');
    if (!box) return;
    let list = this.apps.slice();
    if (this.filter !== 'all') list = list.filter(a => a.status === this.filter);
    list.sort((a,b)=> new Date(b.created_at||b.createdAt||0) - new Date(a.created_at||a.createdAt||0));
    if (!list.length) {
      box.innerHTML = this.emptyBlock(I.inbox, 'Arizalar yo\'q', 'Bu turkumda ariza topilmadi');
      return;
    }
    box.innerHTML = `<div class="adm-app-grid">${list.map(a => this.adminAppCard(a)).join('')}</div>`;
  },
  adminAppCard(a) {
    const st = a.status || 'new';
    const vehicleName = (VEHICLES.find(v=>v.id===a.vehicle)||{}).name || a.vehicle || '';
    const num = a.app_number || a.number || ('#'+String(a.id||a._id||'').slice(-5));
    const name = a.client_name || 'Mijoz';
    return `
      <div class="adm-app-card" onclick="Admin.go('/app/${a.id||a._id}')">
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
            </div>
          </div>

          ${drivers.length ? `
          <div class="adm-card">
            <h3 class="adm-card-title">Haydovchilar (${drivers.length})</h3>
            <div class="detail-drivers">
              ${drivers.map((d,i)=>`<div class="dd-item">
                <span class="dd-num">${i+1}</span>
                <div><b>${esc(d.name||'—')}</b><span>${esc(d.license||'')}</span></div>
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
      ['photo_owner_front','Egasi hujjati old'],
      ['photo_owner_back','Egasi hujjati orqa'],
      ['photo_renew_policy','Eski polis'],
    ];
    const out = [];
    map.forEach(([k,lab])=>{ if (a[k]) out.push({ url:`${UPLOADS}/${a[k]}`, label:lab }); });
    // haydovchi rasmlari
    (a.drivers||[]).forEach((d,i)=>{
      if (a[`driver_photo_${i}`]) out.push({ url:`${UPLOADS}/${a[`driver_photo_${i}`]}`, label:`Haydovchi ${i+1}` });
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
      <div class="field"><label>To'lov summasi (so'm)</label>
        <input class="inp" id="payAmount" inputmode="numeric" value="${a.price||0}"></div>
      <div class="field"><label>To'lov havolasi (link)</label>
        <input class="inp" id="payLink" placeholder="https://payme.uz/... yoki click.uz/..."></div>
      <div class="field"><label>Izoh (ixtiyoriy)</label>
        <input class="inp" id="payNote" placeholder="To'lov haqida"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="closeModal()">Bekor</button>
        <button class="btn btn-primary" id="payBtn" onclick="Admin.sendPaymentLink()">Yuborish</button>
      </div>`);
  },
  async sendPaymentLink() {
    const amount = document.getElementById('payAmount').value;
    const link = document.getElementById('payLink').value.trim();
    const note = document.getElementById('payNote').value.trim();
    if (!link) return toast('To\'lov havolasini kiriting', 'err');
    const btn = document.getElementById('payBtn');
    setLoading(btn, true);
    try {
      await AdminAPI.paymentLink(this.curAppId, { amount:Number(amount)||0, link, note });
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
      const r = await req('/payroll', { token: adminToken() });
      const data = r.payroll || r;
      const myBonus = await req('/payroll/my-bonus', { token: adminToken() }).catch(()=>null);
      const content = `
        <h1 class="adm-h1">Ish haqi</h1>
        ${myBonus ? `
        <div class="stat-grid">
          ${this.statCard(I.wallet, 'Joriy oy', fmtSom(myBonus.total||myBonus.amount||0), 'var(--green-600)', 'var(--green-50)')}
          ${this.statCard(I.checkCircle, 'Yakunlangan', (myBonus.completed_count||myBonus.count||0)+' ta', '#1E40AF', '#DBEAFE')}
          ${this.statCard(I.trophy, 'Bonus', fmtSom(myBonus.bonus||0), 'var(--gold)', 'var(--gold-l)')}
        </div>` : ''}
        ${this.renderPayrollTable(data)}`;
      this.root.innerHTML = this.shell('payroll', content);
    } catch (e) {
      this.root.innerHTML = this.shell('payroll', this.errorBlock(e.message));
    }
  },
  renderPayrollTable(data) {
    const rows = data.admins || data.workers || (Array.isArray(data) ? data : []);
    if (!rows.length) return `<div class="adm-card"><p class="muted-text" style="text-align:center;padding:24px">Ma'lumot yo'q</p></div>`;
    return `<div class="adm-card">
      <h3 class="adm-card-title">Xodimlar bo'yicha</h3>
      <div class="payroll-table">
        <div class="pt-head"><span>Xodim</span><span>Arizalar</span><span>Summa</span></div>
        ${rows.map(w => `<div class="pt-row">
          <div class="pt-name"><div class="pt-av">${initials(w.full_name||w.name)}</div>${esc(w.full_name||w.name||'')}</div>
          <span>${w.count||w.completed_count||0} ta</span>
          <b>${fmtSom(w.total||w.amount||w.salary||0)}</b>
        </div>`).join('')}
      </div>
    </div>`;
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
          <div><b>${s.commission_percent_base||0}%</b><span>Komissiya</span></div>
        </div>
        ${!isHead ? `<div class="staff-actions">
          <button class="btn btn-ghost btn-sm" onclick='Admin.openStaffForm(${JSON.stringify(s).replace(/'/g,"&#39;")})'>${I.edit} Tahrir</button>
          <button class="btn btn-ghost btn-sm ${blocked?'':'staff-block'}" onclick="Admin.toggleStaffStatus('${s.id}','${blocked?'active':'blocked'}')">
            ${blocked?'Faollashtirish':'Bloklash'}
          </button>
        </div>` : `<div class="staff-head-badge">${I.shieldCheck} Bosh administrator</div>`}
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
          ${this.ROLES.map(r=>`<option value="${r.id}" ${s.role===r.id?'selected':''}>${r.label}</option>`).join('')}
        </select></div>
      <div class="field"><label>Komissiya foizi (%)</label>
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
      const s = await AdminAPI.settings();
      const maintenance = !!s.maintenance_mode;
      const renewal = s.renewal_enabled !== false;
      const content = `
        <h1 class="adm-h1">Sozlamalar</h1>

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
        </div>`;
      this.root.innerHTML = this.shell('settings', content);
    } catch (e) {
      this.root.innerHTML = this.shell('settings', this.errorBlock(e.message));
    }
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
