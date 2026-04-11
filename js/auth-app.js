// ===================== AUTH / UYGULAMA FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: state (index.html'de tanımlı)
// =========================================================================

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  document.getElementById('loginErr').textContent = '';
  if (!username || !password) { document.getElementById('loginErr').textContent = 'Fyll i alla fält'; return; }
  try {
    const r = await fetch('/api/auth?action=login', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({username, password})
    });
    const d = await r.json();
    if (!r.ok) { document.getElementById('loginErr').textContent = d.error || 'Fel'; return; }
    state.token = d.token;
    state.user = d.user;
    localStorage.setItem('sfk_token', d.token);
    localStorage.setItem('sfk_user', JSON.stringify(d.user));
    showApp();
  } catch(e) {
    document.getElementById('loginErr').textContent = 'Anslutningsfel';
  }
}

function doLogout() {
  state.token = null; state.user = null;
  localStorage.removeItem('sfk_token');
  localStorage.removeItem('sfk_user');
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
  document.getElementById('userBadge').textContent = u.full_name || u.username;
  const rb = document.getElementById('roleBadge');
  rb.textContent = u.role === 'admin' ? 'Admin' : u.role === 'antrenor' ? 'Tränare' : u.role === 'klubbledare' ? 'Klubbledare' : 'Spelare';
  // Avatar göster
  const headerAvatar = document.getElementById('headerAvatar');
  if (headerAvatar) {
    if (u.avatar_url) {
      headerAvatar.src = u.avatar_url;
      headerAvatar.style.display = 'inline-block';
    } else if (u.role === 'oyuncu' && u.player_id) {
      // Oyuncu için MinFotboll'dan çek
      fetch('/api/stats?action=mystats', {headers: authHeaders()})
        .then(r => r.json())
        .then(d => {
          if (d.thumbnail) {
            headerAvatar.src = d.thumbnail;
            headerAvatar.style.display = 'inline-block';
          }
        }).catch(() => {});
    } else if (u.minfotboll_member_id) {
      // Antrenör / klubbledare için MinFotboll'dan çek
      fetch('/api/admin?action=fetchavatar&memberId=' + u.minfotboll_member_id, {headers: authHeaders()})
        .then(r => r.json())
        .then(d => {
          if (d.avatarUrl) {
            headerAvatar.src = d.avatarUrl;
            headerAvatar.style.display = 'inline-block';
          }
        }).catch(() => {});
    }
  }
  rb.className = 'role-badge role-' + u.role;

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

  if (u.role === 'admin') { loadUsers(); populatePlayerSelect(); }
  if (u.role === 'antrenor') {
    loadUsers();
    populatePlayerSelect();
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
    populatePlayerSelect();
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
  // Tab görünürlükleri
  const usersTab = document.getElementById('usersTab');
  if (usersTab) usersTab.style.display = (u.role === 'admin' || u.role === 'antrenor' || u.role === 'klubbledare') ? 'inline-block' : 'none';
  // Omklädningsrum ve Parametrar sadece admin
  const omkTab = document.getElementById('omkladningsrumTab');
  const paramTab = document.getElementById('parametrarTab');
  if (omkTab) omkTab.style.display = (u.role === 'admin' || u.role === 'klubbledare') ? 'inline-block' : 'none';
  if (paramTab) paramTab.style.display = u.role === 'admin' ? 'inline-block' : 'none';
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
}

function setStatus(msg, show=true) {
  document.getElementById('statusText').textContent = msg;
  document.getElementById('statusBar').style.display = show ? 'flex' : 'none';
}

function setError(msg) {
  const b = document.getElementById('errorBox');
  b.textContent = msg || '';
  b.style.display = msg ? 'block' : 'none';

function checkNotificationEmail(u) {
  // Sadece oyuncu olmayanlar için kontrol et
  if (!u || u.notification_email) return;
  // Daha önce bu oturumda sorulduysa tekrar sorma
  if (sessionStorage.getItem('emailChecked')) return;
  sessionStorage.setItem('emailChecked', '1');

  // Modal göster
  const modal = document.getElementById('emailReminderModal');
  if (modal) modal.style.display = 'flex';
}

async function saveNotificationEmail() {
  const input = document.getElementById('notificationEmailInput');
  const msg = document.getElementById('notificationEmailMsg');
  const email = input ? input.value.trim() : '';

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
}

