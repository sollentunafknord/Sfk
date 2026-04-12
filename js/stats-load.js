// ===================== İSTATİSTİK YÜKLEME FONKSİYONLARI =====================
// Bağımlılıklar: authHeaders(), state, setStatus(), setError() (auth-app.js'de tanımlı)
// =============================================================================

async function loadActiveTeamDropdown() {
  const select = document.getElementById('adminTeam');
  if (!select) return;
  try {
    const u = state.user;
    let teams = [];

    if (u.role === 'antrenor') {
      // Tränare: sadece kendi atanmış takımları
      const r = await fetch('/api/admin?action=getuserteams&userId=' + u.id, {headers: authHeaders()});
      const userTeams = await r.json();
      teams = Array.isArray(userTeams) ? userTeams.map(t => ({team_id: t.team_id, team_name: t.team_name, is_active: true})) : [];
      window._activeTeamsCache = teams;
    } else {
      // Admin / klubbledare: tüm aktif takımlar
      const r = await fetch('/api/admin?action=getactiveteams', {headers: authHeaders()});
      const allTeams = await r.json();
      teams = Array.isArray(allTeams) ? allTeams.filter(t => t.is_active) : [];
    }

    const current = select.value;
    select.innerHTML = u.role === 'antrenor' ? '' : '<option value="">Alla lag</option>';
    teams.forEach(function(t) {
      var opt = document.createElement('option');
      opt.value = t.team_id;
      opt.textContent = t.team_name;
      select.appendChild(opt);
    });
    // Tränare için ilk takımı otomatik seç
    if (u.role === 'antrenor' && teams.length > 0 && !current) {
      select.value = teams[0].team_id;
    } else if (current) {
      select.value = current;
    }
  } catch(e) {}
}

// ===================== FETCH MATCHES =====================

async function loadStats() {
  setStatus('Laddar statistik...');
  try {
    const from = document.getElementById('statsFrom').value;
    const to = document.getElementById('statsTo').value;
    const statsTeam = document.getElementById('statsTeam')?.value || '';
    const params = new URLSearchParams({action:'playerstats'});
    if (from) params.append('dateFrom', from);
    if (to) params.append('dateTo', to);
    if (statsTeam) params.append('teamId', statsTeam);
    const selectedLeagues = getSelectedLeagues();
    if (selectedLeagues.length > 0) params.append('leagueNames', selectedLeagues.join('|'));

    // Oyuncu filtresi sadece manuel seçimde kullan
    // teamId parametresi backend'e gönderilince o takımın maçlarında oynayan herkes gelir
    const selectedPlayers = getSelectedPlayers();
    if (selectedPlayers.length > 0) {
      params.append('playerIds', selectedPlayers.join('|'));
    }
    // teamId zaten yukarıda eklendi — backend halleder

    const r = await fetch('/api/stats?' + params, {headers: authHeaders()});
    const d = await r.json();
    setStatus('', false);
    window._lastStatsEl = document.getElementById('statsTable');
    document.getElementById('statsTable').innerHTML = renderStatsTable(d, 'stats');
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
}

async function loadTrStats() {
  setStatus('Laddar statistik...');
  try {
    const from = document.getElementById('trFrom').value;
    const to = document.getElementById('trTo').value;
    const type = document.getElementById('trType').value;
    const params = new URLSearchParams({action:'playerstats'});
    if (type && type !== 'hepsi') params.append('gameType', type);
    if (from) params.append('dateFrom', from);
    if (to) params.append('dateTo', to);
    const r = await fetch('/api/stats?' + params, {headers: authHeaders()});
    const d = await r.json();
    setStatus('', false);
    window._lastStatsEl = document.getElementById('trStatsTable');
    document.getElementById('trStatsTable').innerHTML = renderStatsTable(d, 'tr');
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
}

// Stats tablosu sıralama state'i
const statsSort = { col: 'minutesPlayed', dir: -1 };

function sortStatsTable(col) {
  if (statsSort.col === col) {
    statsSort.dir *= -1;
  } else {
    statsSort.col = col;
    statsSort.dir = -1;
  }
  // Aktif sıralama göstergesi
  document.querySelectorAll('.stats-th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    if (th.dataset.col === col) th.classList.add(statsSort.dir === -1 ? 'sort-desc' : 'sort-asc');
  });
  // Tabloyu yeniden render et
  if (window._lastStatsData) {
    const el = window._lastStatsEl;
    if (el) el.innerHTML = renderStatsTable(window._lastStatsData, '');
  }
}

// Lig listesini DB'den çek ve dropdown'u doldur

async function loadStatsTeamDropdown() {
  const select = document.getElementById('statsTeam');
  if (!select) return;
  try {
    const u = state.user;
    let teams = [];
    if (u.role === 'antrenor') {
      const r = await fetch('/api/admin?action=getuserteams&userId=' + u.id, {headers: authHeaders()});
      const userTeams = await r.json();
      teams = Array.isArray(userTeams) ? userTeams : [];
      // Tränare için "Alla lag" yok
      select.innerHTML = '';
      teams.forEach(function(t) {
        var opt = document.createElement('option');
        opt.value = t.team_id;
        opt.textContent = t.team_name;
        select.appendChild(opt);
      });
    } else {
      const r = await fetch('/api/admin?action=getactiveteams', {headers: authHeaders()});
      const allTeams = await r.json();
      teams = Array.isArray(allTeams) ? allTeams.filter(t => t.is_active) : [];
      window._activeTeamsCache = teams; // Cache kaydet
      select.innerHTML = '<option value="">Alla lag</option>';
      teams.forEach(function(t) {
        var opt = document.createElement('option');
        opt.value = t.team_id;
        opt.textContent = t.team_name;
        select.appendChild(opt);
      });
      // Tränare için ilk takımı otomatik seç
      if (u.role === 'antrenor' && teams.length > 0) select.value = teams[0].team_id;
    }
  } catch(e) {}
}

async function onStatsTeamChange() {
  // Takım değişince oyuncu filtresini güncelle
  const teamId = parseInt(document.getElementById('statsTeam')?.value) || null;
  await updateStatsPlayerFilter(teamId);
}

async function updateStatsPlayerFilter(teamId) {
  const el = document.getElementById('playerFilterItems');
  if (!el) return;
  try {
    const r = await fetch('/api/admin?action=activeroster', {headers: authHeaders()});
    const players = await r.json();
    // Sadece oyuncular — staff (tränare, lag ledare) hariç
    let filtered = Array.isArray(players) ? players.filter(p => p.type !== 'staff' && p.playerId !== null) : [];
    // Antrenör: sadece kendi takım(lar)ının oyuncuları
    if (state.user.role === 'antrenor' && window._activeTeamsCache) {
      const allowedTeamIds = new Set(window._activeTeamsCache.map(t => t.team_id));
      filtered = filtered.filter(p => allowedTeamIds.has(p.teamId));
    } else if (teamId) {
      filtered = filtered.filter(p => p.teamId === teamId);
    }
    el.innerHTML = filtered.map(p => {
      // SFK_PLAYERS'dan eksik bilgileri tamamla
      const fallback = (typeof SFK_PLAYERS !== 'undefined') ? SFK_PLAYERS[p.playerId] : null;
      const shirt = p.shirt || (fallback ? fallback.shirt : null) || '—';
      const name = p.name || (fallback ? fallback.name : '—');
      return `<label><input type="checkbox" class="player-filter" value="${p.playerId}" checked> #${shirt} ${name}</label>`;
    }).join('');
    el.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => {
      const all = el.querySelectorAll('input');
      const checked = el.querySelectorAll('input:checked');
      const span = document.querySelector('#statsPlayerBtn span');
      if (span) span.textContent = checked.length === all.length ? 'Alla spelare' : checked.length === 0 ? 'Ingen vald' : `${checked.length} spelare valda`;
    }));
    const span = document.querySelector('#statsPlayerBtn span');
    if (span) span.textContent = 'Alla spelare';
  } catch(e) {}
}

async function loadLeagueFilters() {
  // Stats takım dropdown'ını doldur
  await loadStatsTeamDropdown();

  try {
    const r = await fetch('/api/admin?action=savedmatches', {headers: authHeaders()});
    const matches = await r.json();
    if (!Array.isArray(matches)) return;
    // Antrenör: sadece kendi takımlarının maçlarından liga listesi
    let filteredMatches = matches;
    if (state.user.role === 'antrenor' && window._activeTeamsCache) {
      const allowedTeamIds = new Set(window._activeTeamsCache.map(t => String(t.team_id)));
      filteredMatches = matches.filter(m => allowedTeamIds.has(String(m.team_id)) || allowedTeamIds.has(String(m.home_team_id)) || allowedTeamIds.has(String(m.away_team_id)));
    }
    const leagues = [...new Set(filteredMatches.map(m => m.league_name).filter(Boolean))].sort();
    
    // Admin dropdown
    const adminEl = document.getElementById('leagueFilterItems');
    if (adminEl) {
      adminEl.innerHTML = leagues.map(l => 
        `<label><input type="checkbox" class="league-filter" value="${l}" checked> ${l}</label>`
      ).join('');
      // Checkbox değişince label güncelle
      adminEl.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => {
        const all = adminEl.querySelectorAll('input');
        const checked = adminEl.querySelectorAll('input:checked');
        const span = document.querySelector('#statsLeagueBtn span');
        if (span) span.textContent = checked.length === all.length ? 'Alla ligor' : checked.length === 0 ? 'Ingen vald' : `${checked.length} ligor valda`;
      }));
    }

    // Oyuncu dropdown
    const oyuncuEl = document.getElementById('oyuncuLeagueFilterItems');
    if (oyuncuEl) {
      oyuncuEl.innerHTML = leagues.map(l =>
        `<label><input type="checkbox" class="oyuncu-league-filter" value="${l}" checked> ${l}</label>`
      ).join('');
      oyuncuEl.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => {
        const all = oyuncuEl.querySelectorAll('input');
        const checked = oyuncuEl.querySelectorAll('input:checked');
        const span = document.querySelector('#oyuncuLeagueBtn span');
        if (span) span.textContent = checked.length === all.length ? 'Alla ligor' : checked.length === 0 ? 'Ingen vald' : `${checked.length} ligor valda`;
      }));
    }
  } catch(e) {}
}

function setAllPlayers(checked) {
  document.querySelectorAll('.player-filter').forEach(cb => {
    cb.checked = checked;
    cb.dispatchEvent(new Event('change'));
  });
}

function getSelectedPlayers() {
  const checked = [...document.querySelectorAll('.player-filter:checked')];
  // Hepsi seçiliyse boş döndür (filtre yok)
  const all = document.querySelectorAll('.player-filter');
  if (checked.length === all.length) return [];
  return checked.map(cb => parseInt(cb.value));
}

async function initPlayerFilter() {
  const teamId = parseInt(document.getElementById('statsTeam')?.value) || null;
  await updateStatsPlayerFilter(teamId);
  // initMultiDropdown auth-app.js'de çağrılıyor
  initMultiDropdown('statsPlayerBtn', 'statsPlayerList');
}

function setAllLeagues(checked) {
  document.querySelectorAll('.league-filter').forEach(cb => cb.checked = checked);
}

function getSelectedLeagues() {
  return [...document.querySelectorAll('.league-filter:checked')].map(cb => cb.value);
}

function renderStatsTable(d, prefix) {
  window._lastStatsData = d;
  let players = [...(d.players || [])];
  if (!players.length) return '<div class="empty-state">Ingen statistik hittades</div>';

  // Oyuncu filtresi uygula
  const selectedPlayerIds = getSelectedPlayers ? getSelectedPlayers() : [];
  if (selectedPlayerIds.length > 0) {
    players = players.filter(p => selectedPlayerIds.includes(p.playerId));
  }
  if (!players.length) return '<div class="empty-state">Ingen spelare vald</div>';

  // Sırala
  players.sort((a,b) => {
    const av = a[statsSort.col] ?? 0;
    const bv = b[statsSort.col] ?? 0;
    // null/0 değerler her zaman en alta (sıralama yönünden bağımsız)
    const aEmpty = av === 0 || av === null;
    const bEmpty = bv === 0 || bv === null;
    if (aEmpty && bEmpty) return a.name.localeCompare(b.name, 'sv');
    if (aEmpty) return 1;
    if (bEmpty) return -1;
    // Değerler farklıysa: dir=-1 demek büyük üste (azalan)
    if (bv !== av) return (bv - av) * statsSort.dir * -1;
    return a.name.localeCompare(b.name, 'sv');
  });

  const g = (n, cls='') => n > 0 ? `<span class="badge ${cls}">${n}</span>` : `<span class="badge badge-zero">—</span>`;
  const m = (n) => n > 0 ? `<span class="badge">${n}</span>` : `<span class="badge badge-zero">—</span>`;

  const rows = players.map(p => `<tr>
      <td><span class="shirt-no">#${p.shirt}</span></td>
      <td class="player-name">${p.name}</td>
      <td>${m(p.minutesPlayed || 0)}</td>
      <td>${g(p.games)}</td>
      <td>${g(p.starterGames || 0)}</td>
      <td>${g(p.goals,'badge-green')}</td>
      <td>${g(p.assists)}</td>
      <td>${g(p.yellowCards,'badge-yellow')}</td>
      <td>${g(p.redCards,'badge-red')}</td>
      <td>${g(p.goalsPerGame || 0)}</td>
      <td>${p.minutesPerGoal ? `<span class="badge">${p.minutesPerGoal}'</span>` : '<span class="badge badge-zero">—</span>'}</td>
      <td>${p.minutesPerGame > 0 ? `<span class="badge" style="background:rgba(0,212,255,0.1);color:var(--accent)">${p.minutesPerGame}'</span>` : '<span class="badge badge-zero">—</span>'}</td>
    </tr>`).join('');

  const thStyle = `cursor:pointer;user-select:none;`;
  const th = (col, label, style='') => `<th class="stats-th" data-col="${col}" onclick="sortStatsTable('${col}')" style="${thStyle}${style}" title="Sortera efter ${label}">${label} ${statsSort.col===col ? (statsSort.dir===-1?'↓':'↑') : '↕'}</th>`;

  return `<div style="margin-bottom:0.75rem;color:var(--muted);font-size:0.85rem;">${d.totalGames || 0} matcher sparade</div>
  <div class="table-wrap" id="statsTableWrap"><table>
    <thead><tr>
      <th>#</th><th>Spelare</th>
      ${th('minutesPlayed','Tot Min')}
      ${th('games','Trupp')}
      ${th('starterGames','Start 11')}
      ${th('goals','Mål','color:var(--green)')}
      ${th('assists','Ast','color:var(--accent)')}
      ${th('yellowCards','Gult','color:var(--yellow)')}
      ${th('redCards','Rött','color:var(--red)')}
      ${th('goalsPerGame','Mål/Match')}
      ${th('minutesPerGoal','Min/Mål')}
      ${th('minutesPerGame','Min/Match')}
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ===================== OYUNCU =====================

async function loadMyStats() {
  try {
    const r = await fetch('/api/stats?action=mystats', {headers: authHeaders()});
    const d = await r.json();
    const el = document.getElementById('oyuncuStatsTable');
    if (!el) return;
    el.innerHTML = `
      <div class="my-stats-card">
        <div style="text-align:center;margin-bottom:1rem;">
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.8rem;font-weight:900;">${d.name}</div>
          <div style="color:var(--muted);">Tröja #${d.shirt}</div>
        </div>
        <div class="stat-grid">
          <div class="stat-item"><div class="stat-val" style="color:var(--accent);">${d.games}</div><div class="stat-lbl">Matcher</div></div>
          <div class="stat-item"><div class="stat-val" style="color:var(--green);">${d.goals}</div><div class="stat-lbl">Mål</div></div>
          <div class="stat-item"><div class="stat-val" style="color:var(--accent);">${d.assists}</div><div class="stat-lbl">Assist</div></div>
          <div class="stat-item"><div class="stat-val" style="color:var(--yellow);">${d.yellowCards}</div><div class="stat-lbl">Gult kort</div></div>
          <div class="stat-item"><div class="stat-val" style="color:var(--red);">${d.redCards}</div><div class="stat-lbl">Rött kort</div></div>
        </div>
        <div class="section-title">Matchhistorik</div>
        ${d.matchDetails.length ? `<div class="table-wrap"><table>
          <thead><tr><th>Datum</th><th>Match</th><th>Resultat</th><th style="color:var(--green)">Mål</th><th style="color:var(--accent)">Ast</th><th style="color:var(--yellow)">🟨</th><th style="color:var(--red)">🟥</th></tr></thead>
          <tbody>${d.matchDetails.map(m => `<tr>
            <td>${new Date(m.gameDate).toLocaleDateString('sv-SE')}</td>
            <td>${m.homeTeam} vs ${m.awayTeam}</td>
            <td>${m.homeScore} - ${m.awayScore}</td>
            <td>${m.goals || '—'}</td>
            <td>${m.assists || '—'}</td>
            <td>${m.yellowCards || '—'}</td>
            <td>${m.redCards || '—'}</td>
          </tr>`).join('')}</tbody>
        </table></div>` : '<div class="empty-state">Ingen matchhistorik</div>'}
      </div>`;
  } catch(e) {
    const errEl = document.getElementById('oyuncuStatsTable'); if(errEl) errEl.innerHTML = '<div class="empty-state">Fel vid laddning</div>';
  }
}

// ===================== USERS =====================
function populatePlayerSelect() {
  const sel = document.getElementById('newPlayerId');
  Object.entries(SFK_PLAYERS).forEach(([id, p]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `#${p.shirt} ${p.name}`;
    sel.appendChild(opt);
  });
}

function togglePlayerSelect() {
  const role = document.getElementById('newRole').value;
  document.getElementById('playerSelectWrap').style.display = role === 'oyuncu' ? 'block' : 'none';
}

async function addUser() {
  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const full_name = document.getElementById('newFullname').value.trim();
  const role = document.getElementById('newRole').value;
  const player_id = role === 'oyuncu' ? parseInt(document.getElementById('newPlayerId').value) : null;

  if (!username || !password) { alert('Fyll i användarnamn och lösenord'); return; }

  try {
    const r = await fetch('/api/auth?action=adduser', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        username, password, full_name, role, player_id,
        minfotboll_member_id: window._selectedSfkPerson?.memberId || null,
        avatar_url: (window._selectedSfkPerson?.thumbnail && !window._selectedSfkPerson.thumbnail.includes('default')) ? window._selectedSfkPerson.thumbnail : null,
      })
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    document.getElementById('newUsername').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('sfkPersonSearch').value = '';
    window._selectedSfkPerson = null;
    document.getElementById('newFullname').value = '';
    loadUsers();
  } catch(e) { alert('Fel: ' + e.message); }
}

// SFK roster cache
let _sfkRoster = null;

async function loadOyuncuLeagueFilters() {
  try {
    const r = await fetch('/api/admin?action=savedmatches', {headers: authHeaders()});
    const matches = await r.json();
    if (!Array.isArray(matches)) return;
    // Antrenör: sadece kendi takımlarının maçlarından liga listesi
    let filteredMatches = matches;
    if (state.user.role === 'antrenor' && window._activeTeamsCache) {
      const allowedTeamIds = new Set(window._activeTeamsCache.map(t => String(t.team_id)));
      filteredMatches = matches.filter(m => allowedTeamIds.has(String(m.team_id)) || allowedTeamIds.has(String(m.home_team_id)) || allowedTeamIds.has(String(m.away_team_id)));
    }
    const leagues = [...new Set(filteredMatches.map(m => m.league_name).filter(Boolean))].sort();
    const el = document.getElementById('oyuncuLeagueFilterItems');
    if (!el) return;
    if (el.children.length > 0) return;
    el.innerHTML = leagues.map(l =>
      `<label><input type="checkbox" class="oyuncu-league-filter" value="${l}" checked> ${l}</label>`
    ).join('');
    el.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => {
      const all = el.querySelectorAll('input');
      const checked = el.querySelectorAll('input:checked');
      const span = document.querySelector('#oyuncuLeagueBtn span');
      if (span) span.textContent = checked.length === all.length ? 'Alla ligor' : checked.length === 0 ? 'Ingen vald' : `${checked.length} ligor valda`;
    }));
    // Dropdown'u aç/kapat
    const btn = document.getElementById('oyuncuLeagueBtn');
    const list = document.getElementById('oyuncuLeagueList');
    if (btn && list && !btn._initialized) {
      btn._initialized = true;
      btn.addEventListener('click', (e) => { e.stopPropagation(); list.classList.toggle('open'); });
      document.addEventListener('click', () => list.classList.remove('open'));
      list.addEventListener('click', (e) => e.stopPropagation());
    }
  } catch(e) { console.error('loadOyuncuLeagueFilters error:', e); }
}

function initMultiDropdown(btnId, listId) {
  const btn = document.getElementById(btnId);
  const list = document.getElementById(listId);
  if (!btn || !list) return;
  if (btn._initialized) return;
  btn._initialized = true;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = list.classList.contains('open');
    // Tüm açık dropdownları kapat
    document.querySelectorAll('.ms-dropdown-list.open').forEach(l => l.classList.remove('open'));
    // Eğer kapalıysa aç
    if (!isOpen) list.classList.add('open');
  });
  document.addEventListener('click', () => list.classList.remove('open'));
  list.addEventListener('click', (e) => e.stopPropagation());
  const updateLabel = () => {
    const checkboxes = list.querySelectorAll('input[type=checkbox]');
    const checked = [...checkboxes].filter(c => c.checked);
    const span = btn.querySelector('span');
    if (span) span.textContent = checked.length === checkboxes.length ? 'Alla ligor' : checked.length === 0 ? 'Ingen vald' : `${checked.length} ligor valda`;
  };
  list.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', updateLabel));
}


document.addEventListener('DOMContentLoaded', () => {
  initMultiDropdown('statsLeagueBtn', 'statsLeagueList');
  initMultiDropdown('oyuncuLeagueBtn', 'oyuncuLeagueList');
});

// ===================== DASHBOARD =====================
async function loadDashboard() {
  const el = document.getElementById('dashboardContent');
  if (!el) return;
  el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>';

  try {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Paralel çek
    const [matchesRes, roomsRes, usersRes, rosterRes] = await Promise.all([
      fetch('/api/admin?action=savedmatches', {headers: authHeaders()}),
      fetch('/api/admin?action=getrooms', {headers: authHeaders()}),
      fetch('/api/auth?action=users', {headers: authHeaders()}),
      fetch('/api/admin?action=activeroster', {headers: authHeaders()}),
    ]);

    const matches = await matchesRes.json().catch(() => []);
    const rooms   = await roomsRes.json().catch(() => []);
    const users   = await usersRes.json().catch(() => []);
    const roster  = await rosterRes.json().catch(() => []);

    // Sadece bugün ve sonrasındaki maçları filtrele
    const upcomingMatches = Array.isArray(matches)
      ? matches.filter(m => m.game_date && m.game_date >= today).slice(0, 5)
      : [];
    const totalPlayers    = Array.isArray(roster) ? roster.filter(p => p.type !== 'staff').length : 0;
    const totalUsers      = Array.isArray(users) ? users.length : 0;

    // Oda ataması yapılmamış maçları bul
    const assignedGameIds = new Set(Array.isArray(rooms) ? rooms.map(r => r.game_id) : []);
    const missingRooms = upcomingMatches.filter(m => !assignedGameIds.has(m.game_id));

    el.innerHTML =
      // Üst kartlar
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:1rem;margin-bottom:2rem;">' +
        _dashCard('⚽', upcomingMatches.length, 'Kommande matcher', 'var(--accent)') +
        _dashCard('👥', totalPlayers, 'Aktiva spelare', 'var(--green)') +
        _dashCard('👤', totalUsers, 'Användare', 'var(--yellow)') +
        _dashCard('⚠️', missingRooms.length, 'Rum ej tilldelade', missingRooms.length > 0 ? 'var(--red)' : 'var(--green)') +
      '</div>' +

      // Yaklaşan maçlar
      '<div style="margin-bottom:2rem;">' +
        '<div class="section-title">📅 Kommande matcher</div>' +
        (upcomingMatches.length === 0
          ? '<div class="empty-state">Inga kommande matcher</div>'
          : '<div class="table-wrap"><table><thead><tr><th>Datum</th><th>Hemmalag</th><th>Bortalag</th><th>Liga</th></tr></thead><tbody>' +
            upcomingMatches.map(m => {
              const d = new Date(m.game_date).toLocaleDateString('sv-SE', {weekday:'short', day:'numeric', month:'short'});
              return '<tr><td>' + d + '</td><td>' + (m.home_team||'—') + '</td><td>' + (m.away_team||'—') + '</td><td style="color:var(--muted);font-size:0.85rem;">' + (m.league_name||'—') + '</td></tr>';
            }).join('') +
            '</tbody></table></div>') +
      '</div>' +

      // Oda ataması eksik
      (missingRooms.length > 0
        ? '<div>' +
          '<div class="section-title">⚠️ Omklädningsrum saknas</div>' +
          '<div class="table-wrap"><table><thead><tr><th>Datum</th><th>Hemmalag</th><th>Bortalag</th></tr></thead><tbody>' +
          missingRooms.map(m => {
            const d = new Date(m.game_date).toLocaleDateString('sv-SE', {weekday:'short', day:'numeric', month:'short'});
            return '<tr><td>' + d + '</td><td style="color:var(--red);">' + (m.home_team||'—') + '</td><td>' + (m.away_team||'—') + '</td></tr>';
          }).join('') +
          '</tbody></table></div></div>'
        : '');

  } catch(e) {
    el.innerHTML = '<div class="empty-state">Fel: ' + e.message + '</div>';
  }
}

function _dashCard(icon, value, label, color) {
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.25rem;text-align:center;">' +
    '<div style="font-size:1.8rem;margin-bottom:0.25rem;">' + icon + '</div>' +
    '<div style="font-size:2rem;font-weight:700;color:' + color + ';font-family:\'Barlow Condensed\',sans-serif;">' + value + '</div>' +
    '<div style="font-size:0.8rem;color:var(--muted);margin-top:0.25rem;">' + label + '</div>' +
    '</div>';
}
