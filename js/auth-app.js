// ===================== AUTH / UYGULAMA FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: state (index.html'de tanımlı)
// =========================================================================

// ===================== OTOMATİK LOGOUT =====================
const IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 saat
let _idleTimer = null;

function resetIdleTimer() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(() => {
    if (state.token) {
      doLogout();
      // Login sayfasında uyarı göster
      const err = document.getElementById('loginErr');
      if (err) err.textContent = 'Du har loggats ut automatiskt efter 2 timmars inaktivitet.';
    }
  }, IDLE_TIMEOUT);
}

function startIdleDetection() {
  ['mousemove','keydown','click','scroll','touchstart'].forEach(evt => {
    document.addEventListener(evt, resetIdleTimer, { passive: true });
  });
  resetIdleTimer();
}

function stopIdleDetection() {
  clearTimeout(_idleTimer);
  ['mousemove','keydown','click','scroll','touchstart'].forEach(evt => {
    document.removeEventListener(evt, resetIdleTimer);
  });
}
// ===========================================================

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  const btn = document.querySelector('.btn-login');
  const box = document.querySelector('.login-box');

  errEl.textContent = '';

  if (!username || !password) {
    errEl.textContent = 'Fyll i alla fält';
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Loggar in…';

  try {
    const r = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username, password})
    });
    const d = await r.json();
    if (!r.ok) {
      errEl.textContent = d.error || 'Fel';
      box.classList.remove('shake');
      void box.offsetWidth;
      box.classList.add('shake');
      btn.disabled = false;
      btn.textContent = 'Logga in';
      return;
    }
    state.token = d.token;
    state.user = d.user;
    localStorage.setItem('sfk_token', d.token);
    localStorage.setItem('sfk_user', JSON.stringify(d.user));
    showApp();
  } catch(e) {
    errEl.textContent = 'Anslutningsfel';
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    btn.disabled = false;
    btn.textContent = 'Logga in';
  }
}

function doLogout() {
  stopIdleDetection();
  state.token = null; state.user = null;
  localStorage.removeItem('sfk_token');
  localStorage.removeItem('sfk_user');
  // Açık kalan panelleri sıfırla
  ['instellningarPanel','githubPanel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  closeMobileMenu();
  document.getElementById('appPage').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
}

function authHeaders() {
  return {'Content-Type':'application/json','Authorization':'Bearer ' + state.token};
}

function showApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appPage').style.display = 'block';
  const u = state.user;
  const displayName = u.full_name || u.username;
  document.getElementById('userBadge').textContent = displayName;
  const mobileUserBadge = document.getElementById('mobileUserBadge');
  if (mobileUserBadge) mobileUserBadge.textContent = displayName;
  const rb = document.getElementById('roleBadge');
  rb.textContent = u.role === 'admin' ? 'Admin' : u.role === 'antrenor' ? 'Tränare' : u.role === 'klubbledare' ? 'Klubbledare' : 'Spelare';
  rb.className = 'role-badge role-' + u.role;
  const mobileRoleBadge = document.getElementById('mobileRoleBadge');
  if (mobileRoleBadge) { mobileRoleBadge.textContent = rb.textContent; mobileRoleBadge.className = rb.className; }

  // Avatar göster
  const headerAvatar = document.getElementById('headerAvatar');
  const mobileAvatar = document.getElementById('mobileAvatar');
  const mobileRefreshBtn = document.getElementById('mobileRefreshBtn');
  if (mobileRefreshBtn) mobileRefreshBtn.style.display = u.role === 'admin' ? 'block' : 'none';

  function setAvatar(src) {
    if (headerAvatar) { headerAvatar.src = src; headerAvatar.style.display = 'inline-block'; }
    if (mobileAvatar) { mobileAvatar.src = src; mobileAvatar.style.display = 'inline-block'; }
  }
  if (u.avatar_url) {
    setAvatar(u.avatar_url);
  } else if (u.role === 'oyuncu' && u.player_id) {
    fetch('/api/stats?action=mystats', {headers: authHeaders()})
      .then(r => r.json())
      .then(d => { if (d.thumbnail) setAvatar(d.thumbnail); })
      .catch(() => {});
  } else if (u.minfotboll_member_id) {
    fetch('/api/admin?action=fetchavatar&memberId=' + u.minfotboll_member_id, {headers: authHeaders()})
      .then(r => r.json())
      .then(d => { if (d.avatarUrl) setAvatar(d.avatarUrl); })
      .catch(() => {});
  }

  // Panel görünürlüğü
  document.getElementById('viewAdmin').style.display = (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') ? 'block' : 'none';
  document.getElementById('viewAntrenor').style.display = 'none';
  document.getElementById('viewOyuncu').style.display = u.role === 'oyuncu' ? 'block' : 'none';
  // Refresh token butonu sadece admin'e görünsün
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.style.display = u.role === 'admin' ? 'inline-block' : 'none';

  const today = new Date().toISOString().slice(0,10);
  ['adminTo','statsTo','trTo','oyuncuTo','oyuncuFrom'].forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value) el.value = id.includes('To') ? today : '2025-01-01';
  });

  if (u.role === 'admin') { loadUsers(); populateCvPlayerSelect(); adminTab('dashboard'); }
  if (u.role === 'antrenor') {
    loadUsers();
    populateCvPlayerSelect();
    // Tränare sadece Spelare yaratabileceği için diğer rolleri gizle
    const newRole = document.getElementById('newRole');
    if (newRole) {
      [...newRole.options].forEach(opt => {
        opt.style.display = opt.value !== 'oyuncu' ? 'none' : '';
      });
      newRole.value = 'oyuncu';
      togglePlayerSelect();
    }
  }
  if (u.role === 'klubbledare') {
    loadUsers();
    populateCvPlayerSelect();
    // Klubbledare sadece tränare + oyuncu oluşturabilir
    const newRole = document.getElementById('newRole');
    if (newRole) {
      [...newRole.options].forEach(opt => {
        opt.style.display = (opt.value === 'admin' || opt.value === 'klubbledare') ? 'none' : '';
      });
      newRole.value = 'antrenor';
    }
  }
  if (u.role === 'admin') {
    // Admin tüm rolleri görebilir
    const newRole = document.getElementById('newRole');
    if (newRole) {
      [...newRole.options].forEach(opt => opt.style.display = '');
    }
  }
  if (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') {
    // Önce takım listesini yükle (antrenör için _activeTeamsCache dolsun)
    // Sonra liga ve oyuncu filtrelerini yükle
    loadActiveTeamDropdown().then(() => {
      loadLeagueFilters().then(() => {
        initMultiDropdown('statsLeagueBtn', 'statsLeagueList');
      });
      initPlayerFilter();
    });
  }
  if (u.role === 'oyuncu') {
    loadOyuncuLeagueFilters().then(() => {
      initMultiDropdown('oyuncuLeagueBtn', 'oyuncuLeagueList');
    });
  }
  // MyClub närvaro butonu
  const myclubNavBtn = document.getElementById('myclubNavBtn');
  if (myclubNavBtn) myclubNavBtn.style.display = (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') ? 'inline-block' : 'none';

  // Tab görünürlükleri
  const usersTab = document.getElementById('usersTab');
  if (usersTab) usersTab.style.display = (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') ? 'inline-block' : 'none';
  // Omklädningsrum ve Parametrar sadece admin
  const omkTab = document.getElementById('omkladningsrumTab');
  const paramTab = document.getElementById('parametrarTab');
  const dashTab = document.getElementById('dashboardTab');
  if (omkTab) omkTab.style.display = (u.role === 'admin' || u.role === 'klubbledare') ? 'inline-block' : 'none';
  if (paramTab) paramTab.style.display = u.role === 'admin' ? 'inline-block' : 'none';
  if (dashTab) dashTab.style.display = u.role === 'admin' ? 'inline-block' : 'none';
  // Matcher ve Stats: admin, antrenor, klubbledare
  const matchesTab = document.querySelector('#viewAdmin .tab[onclick*="matches"]');
  const statsTab = document.querySelector('#viewAdmin .tab[onclick*="stats"]');
  if (matchesTab) matchesTab.style.display = (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') ? 'inline-block' : 'none';
  if (statsTab) statsTab.style.display = (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') ? 'inline-block' : 'none';
  // Email kontrolü — boşsa uyarı modal göster
  checkNotificationEmail(u);

  // Oyuncu için tarih alanlarını doldur
  if (u.role === 'oyuncu') {
    const today = new Date().toISOString().slice(0,10);
    const oyuncuTo = document.getElementById('oyuncuTo');
    const oyuncuMatchTo = document.getElementById('oyuncuMatchTo');
    if (oyuncuTo) oyuncuTo.value = today;
    if (oyuncuMatchTo) oyuncuMatchTo.value = today;
  }
  if (u.role === 'oyuncu') loadMyStats();

  // Otomatik logout başlat
  startIdleDetection();
}

function setStatus(msg, show=true) {
  document.getElementById('statusText').textContent = msg;
  document.getElementById('statusBar').style.display = show ? 'flex' : 'none';
}

function setError(msg) {
  const b = document.getElementById('errorBox');
  b.textContent = msg || '';
  b.style.display = msg ? 'block' : 'none';
}

function checkNotificationEmail(u) {
  // Oyuncu rolüne sorma
  if (!u || u.role === 'oyuncu') return;
  // Email zaten varsa sorma
  if (u.notification_email) return;
  // Bu kullanıcıya bu oturumda zaten sorulduysa sorma
  const key = 'emailChecked_' + u.id;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  // Modal göster
  const modal = document.getElementById('emailReminderModal');
  if (modal) modal.style.display = 'flex';
}

async function saveNotificationEmail() {
  const input = document.getElementById('notificationEmailInput');
  const msg = document.getElementById('notificationEmailMsg');
  const email = input ? input.value.trim() : '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Ogiltig e-postadress';
    return;
  }

  try {
    const r = await fetch('/api/auth?action=updateemail', {
      method: 'POST',
      headers: Object.assign({'Content-Type': 'application/json'}, authHeaders()),
      body: JSON.stringify({ notification_email: email || null })
    });
    const d = await r.json();
    if (d.success) {
      // state'i güncelle
      state.user.notification_email = email || null;
      localStorage.setItem('sfk_user', JSON.stringify(state.user));
      closeEmailReminderModal();
    }
  } catch(e) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Fel: ' + e.message;
  }
}

function closeEmailReminderModal() {
  const modal = document.getElementById('emailReminderModal');
  if (modal) modal.style.display = 'none';
}

