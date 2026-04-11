// ===================== İSTATİSTİK YÜKLEME FONKSİYONLARI =====================
// index.html'den ayrıldı
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
    let filtered = Array.isArray(players) ? players : [];
    if (teamId) filtered = filtered.filter(p => p.teamId === teamId);
    el.innerHTML = filtered.map(p =>
      `<label><input type="checkbox" class="player-filter" value="${p.playerId}" checked> #${p.shirt||'—'} ${p.name}</label>`
    ).join('');
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
    const leagues = [...new Set(matches.map(m => m.league_name).filter(Boolean))].sort();
    
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
  // İlk yüklemede mevcut takım seçimine göre oyuncu listesini doldur
  const teamId = parseInt(document.getElementById('statsTeam')?.value) || null;
  await updateStatsPlayerFilter(teamId);
  // Dropdown init
  const btn = document.getElementById('statsPlayerBtn');
  const list = document.getElementById('statsPlayerList');
  if (btn && list) {
    btn.addEventListener('click', (e) => { e.stopPropagation(); list.classList.toggle('open'); });
    document.addEventListener('click', () => list.classList.remove('open'));
    list.addEventListener('click', (e) => e.stopPropagation());
  }
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
    const leagues = [...new Set(matches.map(m => m.league_name).filter(Boolean))].sort();
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

// ===================== OMKLÄDNINGSRUM =====================
const SFK_ARENAS = {
  21808: 'Norrvikens IP 1',
  21815: 'Norrvikens IP 2 Hall',
  20977: 'Sollentuna Fotbollshall 1',
  20976: 'Sollentuna Fotbollshall',
  20586: 'Edsbergs Sportfält',
  20588: 'Edsbergs Sportfält 2',
  20591: 'Edsbergs Sportfält 3',
};

const NORRVIKEN_ARENAS = [21808, 21815, 20977, 20976, 21807];
const EDSBERGS_ARENAS  = [20586, 20588, 20591];

const NORRVIKEN_ROOMS = [
  'Herr','Rum 2','Rum 3','Rum 5','Rum 6','Dam'
];
const EDSBERGS_ROOMS = [
  'Herr','Rum 6','Rum 7','Rum 8','Flick','Dam',
  'Barack 1','Barack 2'
];

let _roomAssignments = {};
let _omkCurrentWeekStart = null;

function getRoomsForArena(arenaId) {
  return NORRVIKEN_ARENAS.includes(arenaId) ? NORRVIKEN_ROOMS : EDSBERGS_ROOMS;
}

// ===================== AKTİF TAKIMLAR =====================
async function loadActiveTeams() {
  const el = document.getElementById('activeTeamsList');
  if (!el) return;
  el.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>';
  try {
    const r = await fetch('/api/admin?action=getactiveteams', {headers: authHeaders()});
    const teams = await r.json();
    if (!Array.isArray(teams) || !teams.length) {
      el.innerHTML = '<div class="empty-state">Takım bulunamadı</div>';
      return;
    }
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0.75rem;margin-bottom:1rem;">';
    teams.forEach(function(t) {
      var isActive = t.is_active;
      html += '<div id="ateam_' + t.team_id + '" style="background:var(--surface);border:1px solid ' + (isActive ? 'var(--accent)' : 'var(--border)') + ';border-radius:10px;padding:0.75rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:0.5rem;">';
      html += '<div>';
      html += '<div style="font-weight:600;font-size:0.9rem;">' + t.team_name + '</div>';
      html += '<div style="font-size:0.75rem;color:var(--muted);">ID: ' + t.team_id + '</div>';
      html += '</div>';
      html += '<label style="display:flex;align-items:center;cursor:pointer;">';
      html += '<input type="checkbox" id="atoggle_' + t.team_id + '" ' + (isActive ? 'checked' : '') + ' onchange="onActiveTeamChange(' + t.team_id + ',this.checked)" style="width:18px;height:18px;cursor:pointer;accent-color:var(--accent);">';
      html += '</label>';
      html += '</div>';
    });
    html += '</div>';
    html += '<div style="display:flex;align-items:center;gap:1rem;">';
    html += '<button onclick="saveActiveTeams()" class="btn btn-primary" id="saveActiveTeamsBtn">💾 Spara</button>';
    html += '<span id="saveActiveTeamsMsg" style="font-size:0.85rem;"></span>';
    html += '</div>';
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = '<div class="empty-state">Hata: ' + e.message + '</div>';
  }
}

function onActiveTeamChange(teamId, isActive) {
  // Sadece kart border'ını güncelle — kayıt Spara butonuyla olur
  var card = document.getElementById('ateam_' + teamId);
  if (card) card.style.borderColor = isActive ? 'var(--accent)' : 'var(--border)';
}

async function saveActiveTeams() {
  const btn = document.getElementById('saveActiveTeamsBtn');
  const msg = document.getElementById('saveActiveTeamsMsg');
  btn.disabled = true;
  msg.style.color = 'var(--muted)';
  msg.textContent = 'Sparar...';

  // Tüm checkbox'ları oku
  var checkboxes = document.querySelectorAll('[id^="atoggle_"]');
  var updates = [];
  checkboxes.forEach(function(cb) {
    var teamId = parseInt(cb.id.replace('atoggle_', ''));
    updates.push({team_id: teamId, is_active: cb.checked});
  });

  try {
    // Her takımı güncelle
    var errors = 0;
    await Promise.all(updates.map(async function(u) {
      const r = await fetch('/api/admin?action=setactiveteam', {
        method: 'POST',
        headers: Object.assign({'Content-Type':'application/json'}, authHeaders()),
        body: JSON.stringify(u)
      });
      const d = await r.json();
      if (!d.ok) errors++;
    }));
    msg.style.color = errors ? '#f55' : '#4caf50';
    msg.textContent = errors ? errors + ' hata oluştu' : '✅ Kaydedildi!';
    setTimeout(function(){ msg.textContent = ''; }, 3000);
  } catch(e) {
    msg.style.color = '#f55';
    msg.textContent = 'Hata: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}
// ==========================================================

function initOmkladningsrum() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const fromEl = document.getElementById('omkFrom');
  const toEl   = document.getElementById('omkTo');
  if (fromEl) fromEl.value = today.toISOString().slice(0,10);
  if (toEl)   toEl.value   = nextWeek.toISOString().slice(0,10);
  _omkCurrentWeekStart = new Date(today);
  updateWeekLabel();
}

function updateWeekLabel() {
  const el = document.getElementById('omkWeekLabel');
  if (!el || !_omkCurrentWeekStart) return;
  const end = new Date(_omkCurrentWeekStart);
  end.setDate(_omkCurrentWeekStart.getDate() + 6);
  el.textContent = 'v.' + getWeekNumber(_omkCurrentWeekStart) + '  ·  '
    + _omkCurrentWeekStart.toLocaleDateString('sv-SE', {day:'numeric',month:'short'})
    + ' – ' + end.toLocaleDateString('sv-SE', {day:'numeric',month:'short',year:'numeric'});
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

function prevWeek() {
  if (!_omkCurrentWeekStart) return;
  _omkCurrentWeekStart.setDate(_omkCurrentWeekStart.getDate() - 7);
  updateWeekLabel();
  filterOmk();
}

function nextWeek() {
  if (!_omkCurrentWeekStart) return;
  _omkCurrentWeekStart.setDate(_omkCurrentWeekStart.getDate() + 7);
  updateWeekLabel();
  filterOmk();
}

async function loadOmkladningsrum() {
  // Buton aktif durumu
  document.getElementById('omkHamtaBtn')?.classList.add('btn-primary');
  document.getElementById('omkHamtaBtn')?.classList.remove('btn-secondary');
  document.getElementById('omkSparadeBtn')?.classList.add('btn-secondary');
  document.getElementById('omkSparadeBtn')?.classList.remove('btn-primary');
  const from = document.getElementById('omkFrom').value;
  const to   = document.getElementById('omkTo').value;
  const omkContent = document.getElementById('omkladningsrumContent');
  if (!from || !to) { omkContent.innerHTML = '<div class="empty-state">Välj datumintervall</div>'; return; }

  omkContent.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Hämtar matcher...</div>';

  try {
    const [gamesRes, roomsRes, manualRes] = await Promise.all([
      fetch('/api/admin?' + new URLSearchParams({action:'arenagames', dateFrom:from, dateTo:to}), {headers: authHeaders()}),
      fetch('/api/admin?' + new URLSearchParams({action:'getrooms', from, to}), {headers: authHeaders()}),
      fetch('/api/admin?' + new URLSearchParams({action:'getrooms', manual:'true', from, to}), {headers: authHeaders()})
    ]);
    const d       = await gamesRes.json();
    const rooms   = await roomsRes.json();
    const manuals = await manualRes.json();

    _roomAssignments = {};
    if (Array.isArray(rooms)) {
      rooms.forEach(function(r) {
        _roomAssignments[r.game_id] = {homeRoom: r.home_room, awayRoom: r.away_room, notes: r.notes, status: r.status || 'pending'};
      });
    }

    // Manuel maçları arenagames formatına çevir ve birleştir
    const manualGames = Array.isArray(manuals) ? manuals.map(function(m) {
      return {
        gameId    : m.game_id,
        gameDate  : m.game_date,
        homeTeam  : m.home_team,
        awayTeam  : m.away_team,
        arenaId   : m.arena_id,
        arenaName : m.arena_name,
        homeLogo  : m.home_logo || null,
        awayLogo  : m.away_logo || null,
        leagueName: m.manual_label || 'Manuel match',
        gameType  : 'manuel',
        isManual  : true,
      };
    }) : [];

    const apiGames = (d.games || []);
    // Manuel maçların game_id'si API maçlarıyla çakışmasın diye filtrele
    const apiIds = new Set(apiGames.map(function(g) { return g.gameId; }));
    const uniqueManuals = manualGames.filter(function(g) { return !apiIds.has(g.gameId); });

    const allGames = [...apiGames, ...uniqueManuals].sort(function(a,b) {
      var da = new Date(a.gameDate), db = new Date(b.gameDate);
      // Önce güne göre
      var dayA = da.toISOString().slice(0,10);
      var dayB = db.toISOString().slice(0,10);
      if (dayA !== dayB) return dayA < dayB ? -1 : 1;
      // Aynı gün: arena adına göre
      var arenaA = (a.arenaName || '').toLowerCase();
      var arenaB = (b.arenaName || '').toLowerCase();
      if (arenaA !== arenaB) return arenaA < arenaB ? -1 : 1;
      // Aynı arena: saate göre
      return da - db;
    });

    if (!allGames.length) {
      omkContent.innerHTML = '<div class="empty-state">Inga matcher hittades</div>';
      return;
    }
    window._omkAllGames = allGames;
    window._omkRooms    = _roomAssignments;
    if (!_omkCurrentWeekStart) {
      _omkCurrentWeekStart = new Date(from);
    }
    updateWeekLabel();
    filterOmk();
  } catch(e) {
    document.getElementById('omkladningsrumContent').innerHTML = '<div class="empty-state">Fel: ' + e.message + '</div>';
  }
}

function filterOmk() {
  if (!window._omkAllGames) return;
  _omkTableCounter = 0; // Her render'da sıfırla
  const arenaFilter = document.getElementById('omkArena').value;
  let games = window._omkAllGames;
  if (arenaFilter) games = games.filter(function(g) { return g.arenaId.toString() === arenaFilter; });
  renderOmkList(games, window._omkRooms);
}

// ── Haftalık takvim görünümü ──────────────────────────────
function renderOmkWeek(games, rooms, weekStart) {
  const days = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag','Lördag','Söndag'];
  const omkContent = document.getElementById('omkladningsrumContent');
  let html = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:0.5rem;">';

  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayStr = day.toISOString().slice(0,10);
    const dayGames = games.filter(function(g) { return g.gameDate && g.gameDate.slice(0,10) === dayStr; });
    const isToday  = dayStr === new Date().toISOString().slice(0,10);

    html += '<div style="background:var(--surface);border:1px solid ' + (isToday ? 'var(--accent)' : 'var(--border)') + ';border-radius:10px;min-height:120px;overflow:hidden;">';
    html += '<div style="background:' + (isToday ? 'rgba(0,212,255,0.12)' : 'var(--surface2)') + ';padding:0.5rem 0.75rem;border-bottom:1px solid var(--border);">';
    html += '<div style="font-family:\'Barlow Condensed\',sans-serif;font-weight:700;font-size:0.85rem;color:' + (isToday ? 'var(--accent)' : 'var(--muted)') + ';">' + days[i] + '</div>';
    html += '<div style="font-size:0.78rem;color:' + (isToday ? 'var(--accent)' : 'var(--muted)') + ';">' + day.toLocaleDateString('sv-SE', {day:'numeric',month:'short'}) + '</div>';
    html += '</div>';
    html += '<div style="padding:0.4rem;">';

    if (dayGames.length === 0) {
      html += '<div style="color:var(--muted);font-size:0.75rem;text-align:center;padding:0.5rem;">—</div>';
    } else {
      dayGames.forEach(function(g) {
        var saved  = rooms[g.gameId] || {};
        var status = saved.status || 'none';
        var statusColor = status === 'approved' ? 'var(--green)' : status === 'rejected' ? 'var(--red)' : status === 'pending' ? 'var(--yellow)' : 'var(--muted)';
        var statusDot   = status === 'approved' ? '✅' : status === 'rejected' ? '❌' : status === 'pending' ? '⏳' : '○';
        var isSFK = g.homeTeam && g.homeTeam.includes('Sollentuna');
        var timeStr = new Date(g.gameDate).toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'});

        html += '<div onclick="openOmkModal(' + g.gameId + ')" '
          + 'style="cursor:pointer;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:0.4rem 0.5rem;margin-bottom:0.35rem;transition:border-color 0.15s;" '
          + 'onmouseenter="this.style.borderColor=\'var(--accent)\'" onmouseleave="this.style.borderColor=\'var(--border)\'">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.2rem;">';
        html += '<span style="font-weight:700;font-size:0.8rem;color:var(--accent);">' + timeStr + '</span>';
        html += '<span title="Status">' + statusDot + '</span>';
        html += '</div>';
        html += '<div style="font-size:0.75rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + g.homeTeam + '">' + (g.homeTeam || '—').replace('Sollentuna FK','SFK') + '</div>';
        html += '<div style="font-size:0.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="' + g.awayTeam + '">vs ' + (g.awayTeam || '—') + '</div>';
        html += '<div style="font-size:0.7rem;color:var(--muted);margin-top:0.2rem;">📍 ' + (g.arenaName || '—') + '</div>';
        if (saved.homeRoom || saved.awayRoom) {
          html += '<div style="font-size:0.7rem;color:var(--green);margin-top:0.2rem;">🏠 ' + (saved.homeRoom || '—') + ' · ' + (saved.awayRoom || '—') + '</div>';
        }
        html += '</div>';
      });
    }

    html += '</div></div>';
  }
  html += '</div>';
  omkContent.innerHTML = html;
}

// ── Liste görünümü ─────────────────────────────────────────
let _omkTableCounter = 0;
function buildOmkTable(games, rooms) {
  if (!games.length) return '<div style="color:var(--muted);font-size:0.85rem;padding:0.5rem 0;">Inga matcher</div>';
  var tableGroup = 'omk_grp_' + (++_omkTableCounter);
  var hasManual = games.some(function(g) { return g.isManual; });
  let html = '<div class="table-wrap"><table style="table-layout:fixed;width:100%;"><thead><tr>';
  html += '<th style="width:36px;"><input type="checkbox" onchange="omkToggleAll(this,&quot;' + tableGroup + '&quot;)" style="cursor:pointer;width:15px;height:15px;"></th>';
  html += '<th style="width:90px;">Datum</th><th style="width:60px;">Avspark</th><th style="width:140px;">Arena</th>';
  html += '<th style="width:220px;">Hemmalag</th><th style="width:220px;">Bortalag</th>';
  if (hasManual) html += '<th style="width:70px;text-align:center;">Åtgärd</th>';
  html += '</tr></thead><tbody>';

  games.forEach(function(g) {
    var dt      = new Date(g.gameDate);
    var dateStr = dt.toLocaleDateString('sv-SE', {weekday:'short',day:'2-digit',month:'short'});
    var timeStr = dt.toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'});

    var isSFK_home = g.homeTeam && g.homeTeam.includes('Sollentuna');
    var isSFK_away = g.awayTeam && g.awayTeam.includes('Sollentuna');
    var lS = 'width:18px;height:18px;object-fit:contain;border-radius:3px;vertical-align:middle;margin-right:4px;';
    var hLogoHtml = g.homeLogo ? '<img src="' + g.homeLogo + '" style="' + lS + '" onerror="this.remove()"> ' : '';
    var aLogoHtml = g.awayLogo ? '<img src="' + g.awayLogo + '" style="' + lS + '" onerror="this.remove()"> ' : '';

    var gIdx     = games.indexOf(g);
    var prevGame = gIdx > 0 ? games[gIdx - 1] : null;
    var prevDate = prevGame ? new Date(prevGame.gameDate).toISOString().slice(0,10) : null;
    var curDate  = new Date(g.gameDate).toISOString().slice(0,10);
    var dayBorder = (prevDate && prevDate !== curDate) ? 'border-top:3px solid var(--accent);' : '';
    html += '<tr id="omk_row_' + g.gameId + '" style="' + dayBorder + (g.isManual ? 'background:rgba(255,200,0,0.05);' : '') + '">';
    html += '<td><input type="checkbox" class="omk-check ' + tableGroup + '" data-gameid="' + g.gameId + '" onchange="omkCheckChange()" style="cursor:pointer;width:15px;height:15px;"></td>';
    html += '<td style="color:var(--muted);font-size:0.82rem;white-space:nowrap;">' + dateStr + '</td>';
    html += '<td style="font-weight:600;">' + timeStr + '</td>';
    html += '<td style="font-size:0.8rem;color:var(--muted);">' + (g.arenaName || '—') + '</td>';
    html += '<td style="' + (isSFK_home ? 'color:var(--accent);font-weight:700;' : '') + '">' + hLogoHtml + (g.homeTeam || '—') + '</td>';
    html += '<td style="' + (isSFK_away ? 'color:var(--accent);font-weight:700;' : '') + '">' + aLogoHtml + (g.awayTeam || '—') + (g.isManual ? ' <span title="' + (g.leagueName||'Manuel match') + '" style="font-size:0.7rem;background:rgba(255,200,0,0.2);color:#ffc800;border-radius:4px;padding:1px 5px;margin-left:4px;font-weight:600;">MANUELL</span>' : '') + '</td>';

    if (hasManual) {
      if (g.isManual) {
        html += '<td style="text-align:center;white-space:nowrap;">'
          + '<button onclick="openEditManualModal(' + g.gameId + ')" title="Redigera" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 4px;color:var(--accent);">✏️</button>'
          + '<button onclick="deleteManualGame(' + g.gameId + ')" title="Ta bort" style="background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 4px;color:#f55;">🗑️</button>'
          + '</td>';
      } else {
        html += '<td></td>';
      }
    }

    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

function renderOmkList(games, rooms) {
  const omkContent = document.getElementById('omkladningsrumContent');
  if (!games.length) { omkContent.innerHTML = '<div class="empty-state">Inga matcher</div>'; return; }

  const norrviken = games.filter(function(g) { return NORRVIKEN_ARENAS.includes(g.arenaId); });
  const edsbergs  = games.filter(function(g) { return EDSBERGS_ARENAS.includes(g.arenaId); });

  let html = '';

  if (norrviken.length) {
    html += '<div class="omk-group" style="margin-bottom:2rem;">';
    html += '<div class="omk-group-title">🏟️ Norrvikens Omklädningsrum';
    html += ' <span style="color:var(--muted);font-size:0.85rem;font-weight:400;">(' + norrviken.length + ' matcher)</span></div>';
    html += buildOmkTable(norrviken, rooms);
    html += '</div>';
  }

  if (edsbergs.length) {
    html += '<div class="omk-group" style="margin-bottom:2rem;">';
    html += '<div class="omk-group-title">🏟️ Edsbergs Omklädningsrum';
    html += ' <span style="color:var(--muted);font-size:0.85rem;font-weight:400;">(' + edsbergs.length + ' matcher)</span></div>';
    html += buildOmkTable(edsbergs, rooms);
    html += '</div>';
  }

  if (!norrviken.length && !edsbergs.length) {
    html = '<div class="empty-state">Inga matcher hittades</div>';
  }

  omkContent.innerHTML = html;
}

// ── Modal ──────────────────────────────────────────────────
let _omkModalGameId = null;

function openOmkModal(gameId) {
  _omkModalGameId = gameId;
  const game  = (window._omkAllGames || []).find(function(g) { return g.gameId === gameId; });
  const saved = (window._omkRooms || {})[gameId] || {};
  if (!game) return;

  // Maç bilgisi
  const dt      = new Date(game.gameDate);
  const dateStr = dt.toLocaleDateString('sv-SE', {weekday:'long',day:'numeric',month:'long'});
  const timeStr = dt.toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'});
  document.getElementById('omkModalMatchInfo').innerHTML =
    '<div style="font-weight:700;">' + (game.homeTeam || '—') + ' vs ' + (game.awayTeam || '—') + '</div>'
    + '<div style="color:var(--muted);font-size:0.82rem;margin-top:0.2rem;">📅 ' + dateStr + ' · ' + timeStr
    + ' &nbsp;|&nbsp; 📍 ' + (game.arenaName || '—') + '</div>';

  // Oda dropdown'larını doldur
  const rooms = getRoomsForArena(game.arenaId);
  function fillSelect(elId, current) {
    var sel = document.getElementById(elId);
    sel.innerHTML = '<option value="">— Välj rum —</option>';
    rooms.forEach(function(r) {
      sel.innerHTML += '<option value="' + r + '"' + (current === r ? ' selected' : '') + '>' + r + '</option>';
    });
  }
  fillSelect('omkHomeRoom', saved.homeRoom);
  fillSelect('omkAwayRoom', saved.awayRoom);

  document.getElementById('omkNotes').value   = saved.notes || '';
  document.getElementById('omkStatus').value  = saved.status || 'pending';
  document.getElementById('omkModalMsg').textContent = '';

  const m = document.getElementById('omkModal'); m.style.display = 'flex'; m.style.alignItems = 'center'; m.style.justifyContent = 'center';
}

function closeOmkModal() {
  document.getElementById('omkModal').style.display = 'none';
  _omkModalGameId = null;
}

// ── Manuel maç ekleme ──────────────────────────────────────
function openAddManualModal() {
  // Tarih alanını bugüne varsayılan ayarla
  var now = new Date();
  now.setMinutes(0, 0, 0);
  var local = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('manualGameDate').value = local;
  document.getElementById('manualHomeTeam').value = '';
  document.getElementById('manualAwayTeam').value = '';
  document.getElementById('manualLabel').value = '';
  document.getElementById('addManualMsg').textContent = '';
  delete document.getElementById('addManualModal').dataset.editGameId;
  document.getElementById('addManualModalTitle').textContent = '➕ Lägg till match manuellt';
  document.getElementById('addManualModal').style.display = 'flex';
}

function closeAddManualModal() {
  document.getElementById('addManualModal').style.display = 'none';
}

function openEditManualModal(gameId) {
  var game = (window._omkAllGames || []).find(function(g) { return g.gameId === gameId; });
  if (!game) return;
  // Mevcut değerleri doldur
  document.getElementById('manualHomeTeam').value = game.homeTeam || '';
  document.getElementById('manualAwayTeam').value = game.awayTeam || '';
  document.getElementById('manualLabel').value    = (game.leagueName === 'Manuel match' ? '' : game.leagueName) || '';
  // Tarihi datetime-local formatına çevir
  var dt = new Date(game.gameDate);
  var local = new Date(dt - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('manualGameDate').value = local;
  // Arena seç
  var arenaSelect = document.getElementById('manualArena');
  for (var i = 0; i < arenaSelect.options.length; i++) {
    if (arenaSelect.options[i].value.startsWith(game.arenaId + '|')) {
      arenaSelect.selectedIndex = i;
      break;
    }
  }
  document.getElementById('addManualMsg').textContent = '';
  // Kaydet butonunu güncelle — düzenleme modunda gameId'yi sakla
  document.getElementById('addManualModal').dataset.editGameId = gameId;
  document.getElementById('addManualModalTitle').textContent = '✏️ Redigera match';
  document.getElementById('addManualModal').style.display = 'flex';
}

async function deleteManualGame(gameId) {
  if (!confirm('Ta bort denna manuella match?')) return;
  try {
    var res = await fetch('/api/admin?action=deleteroom&gameId=' + gameId, {
      method: 'DELETE',
      headers: authHeaders()
    });
    var data = await res.json();
    if (data.ok) {
      // Listeden kaldır ve yeniden render et
      window._omkAllGames = (window._omkAllGames || []).filter(function(g) { return g.gameId !== gameId; });
      filterOmk();
    } else {
      alert('Fel: ' + (data.error || 'okänt fel'));
    }
  } catch(e) {
    alert('Fel: ' + e.message);
  }
}

async function saveManualGame() {
  var homeTeam  = document.getElementById('manualHomeTeam').value.trim();
  var awayTeam  = document.getElementById('manualAwayTeam').value.trim();
  var gameDate  = document.getElementById('manualGameDate').value;
  var arenaVal  = document.getElementById('manualArena').value;
  var label     = document.getElementById('manualLabel').value.trim();
  var msgEl     = document.getElementById('addManualMsg');
  var editGameId = document.getElementById('addManualModal').dataset.editGameId;

  if (!homeTeam || !awayTeam) { msgEl.style.color = '#f55'; msgEl.textContent = 'Hemmalag och bortalag krävs.'; return; }
  if (!gameDate)               { msgEl.style.color = '#f55'; msgEl.textContent = 'Datum och tid krävs.';         return; }
  if (!arenaVal)               { msgEl.style.color = '#f55'; msgEl.textContent = 'Välj en arena.';               return; }

  var arenaParts = arenaVal.split('|');
  var arenaId    = parseInt(arenaParts[0]);
  var arenaName  = arenaParts[1];

  // Düzenleme modunda mevcut game_id'yi kullan, yeni eklemede negatif üret
  var gameId = editGameId ? parseInt(editGameId) : -(Date.now() % 2147483647);

  msgEl.style.color = 'var(--muted)';
  msgEl.textContent = 'Sparar...';

  try {
    var res = await fetch('/api/admin?action=saveroom', {
      method: 'POST',
      headers: Object.assign({'Content-Type': 'application/json'}, authHeaders()),
      body: JSON.stringify({
        game_id     : gameId,
        game_date   : new Date(gameDate).toISOString(),
        home_team   : homeTeam,
        away_team   : awayTeam,
        arena_id    : arenaId,
        arena_name  : arenaName,
        is_manual   : true,
        manual_label: label || null,
        status      : 'pending'
      })
    });
    var data = await res.json();
    if (data.ok) {
      msgEl.style.color = '#4caf50';
      msgEl.textContent = editGameId ? '✅ Uppdaterad!' : '✅ Match tillagd!';
      delete document.getElementById('addManualModal').dataset.editGameId;
      setTimeout(function() {
        closeAddManualModal();
        loadOmkladningsrum();
      }, 800);
    } else {
      msgEl.style.color = '#f55';
      msgEl.textContent = 'Fel: ' + (data.error || 'okänt fel');
    }
  } catch(e) {
    msgEl.style.color = '#f55';
    msgEl.textContent = 'Fel: ' + e.message;
  }
}
// ───────────────────────────────────────────────────────────

async function saveOmkRoom() {
  if (!_omkModalGameId) return;
  const game     = (window._omkAllGames || []).find(function(g) { return g.gameId === _omkModalGameId; });
  const homeRoom = document.getElementById('omkHomeRoom').value;
  const awayRoom = document.getElementById('omkAwayRoom').value;
  const notes    = document.getElementById('omkNotes').value.trim();
  const status   = 'pending';
  const msgEl    = document.getElementById('omkModalMsg');

  msgEl.style.color = 'var(--muted)';
  msgEl.textContent = 'Sparar...';

  try {
    const r = await fetch('/api/admin?action=saveroom', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        game_id  : _omkModalGameId,
        game_date: game ? game.gameDate : null,
        home_team: game ? game.homeTeam : null,
        away_team: game ? game.awayTeam : null,
        arena_id : game ? game.arenaId  : null,
        arena_name:game ? game.arenaName: null,
        home_room: homeRoom || null,
        away_room: awayRoom || null,
        notes    : notes || null,
        status,
      })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Fel');

    // Cache güncelle
    if (!window._omkRooms) window._omkRooms = {};
    window._omkRooms[_omkModalGameId] = {homeRoom, awayRoom, notes, status};
    _roomAssignments[_omkModalGameId]  = {homeRoom, awayRoom, notes, status};

    msgEl.style.color = 'var(--green)';
    msgEl.textContent = '✅ Sparat!';
    setTimeout(function() {
      closeOmkModal();
      if (window._afterSaveOmkRoom) {
        var cb = window._afterSaveOmkRoom;
        window._afterSaveOmkRoom = null;
        cb();
      } else {
        filterOmk();
      }
    }, 800);
  } catch(e) {
    msgEl.style.color = 'var(--red)';
    msgEl.textContent = '❌ ' + e.message;
  }
}

// ── Sparade atamalar ─────────────────────────────────────
let _sparadePanel = null;
let _currentSession = null;

async function loadSparadeAtamalar() {
  const omkContent = document.getElementById('omkladningsrumContent');
  document.getElementById('omkNastaPanel').style.display = 'none';
  omkContent.style.display = '';
  document.getElementById('omkNastaBtn').style.display = 'none';
  // Buton aktif durumu
  document.getElementById('omkHamtaBtn')?.classList.remove('btn-primary');
  document.getElementById('omkHamtaBtn')?.classList.add('btn-secondary');
  document.getElementById('omkSparadeBtn')?.classList.remove('btn-secondary');
  document.getElementById('omkSparadeBtn')?.classList.add('btn-primary');

  omkContent.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Laddar sparade...</div>';

  try {
    const r = await fetch('/api/admin?action=getrooms', {headers: authHeaders()});
    const d = await r.json();
    console.log('getrooms raw:', JSON.stringify(d).slice(0, 300));

    if (!r.ok) {
      omkContent.innerHTML = '<div class="empty-state">Fel: ' + (d.error || r.status) + '</div>';
      return;
    }

    // d array ise eski format, object ise yeni format
    const sessions = Array.isArray(d) ? [] : (d.sessions || []);
    if (Array.isArray(d) && d.length > 0) {
      // Eski format — session_name olmayan kayıtlar var
      omkContent.innerHTML = '<div class="empty-state">Inga sparade filer. Spara matcher med ett namn forst.</div>';
      return;
    }
    if (!sessions.length) {
      omkContent.innerHTML = '<div class="empty-state">Inga sparade matcher hittades.</div>';
      return;
    }

    // Session listesini göster
    let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;">';
    html += '<div style="font-size:1.2rem;font-weight:700;color:var(--accent);">📋 Sparade (' + sessions.length + ' filer)</div>';
    html += '<button onclick="filterOmk()" class="btn btn-secondary" style="font-size:0.85rem;">← Tillbaka</button>';
    html += '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
    sessions.forEach(function(s) {
            html += '<div style="display:flex;align-items:center;gap:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:0.85rem 1.2rem;">';
      // Tarih bilgileri
      var createdStr = s.updatedAt ? new Date(s.updatedAt).toLocaleString('sv-SE', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '';
      var minStr = s.minDate ? new Date(s.minDate).toLocaleDateString('sv-SE', {day:'2-digit',month:'short'}) : '';
      var maxStr = s.maxDate ? new Date(s.maxDate).toLocaleDateString('sv-SE', {day:'2-digit',month:'short'}) : '';
      var dateRange = (minStr && maxStr && minStr !== maxStr) ? minStr + ' – ' + maxStr : minStr;

      html += '<div style="flex:1;cursor:pointer;" data-sname="' + encodeURIComponent(s.name) + '" onclick="openSparadeSession(decodeURIComponent(this.dataset.sname))">';
      html += '<div style="font-weight:600;color:var(--text);">📄 ' + s.name + '</div>';
      html += '<div style="font-size:0.78rem;color:var(--muted);margin-top:0.15rem;">';
      if (createdStr) html += '🕐 ' + createdStr;
      if (dateRange) html += ' &nbsp;·&nbsp; 📅 ' + dateRange;
      html += '</div></div>';
      html += '<button data-sname="' + encodeURIComponent(s.name) + '" onclick="openSparadeSession(decodeURIComponent(this.dataset.sname))" class="btn btn-secondary" style="font-size:0.82rem;padding:0.3rem 0.8rem;">Oppna</button>';
      html += '<button data-sname="' + encodeURIComponent(s.name) + '" onclick="deleteSparadeSession(decodeURIComponent(this.dataset.sname))" class="btn btn-danger" style="font-size:0.82rem;padding:0.3rem 0.8rem;">Ta bort</button>';
      html += '</div>';
    });
    html += '</div>';
    omkContent.innerHTML = html;

  } catch(e) {
    omkContent.innerHTML = '<div class="empty-state">Fel: ' + e.message + '</div>';
  }
}

async function openSparadeSession(sessionName) {
  _currentSession = sessionName;
  const omkContent = document.getElementById('omkladningsrumContent');
  omkContent.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Laddar...</div>';

  try {
    const r = await fetch('/api/admin?action=getrooms&session=' + encodeURIComponent(sessionName), {headers: authHeaders()});
    const rows = await r.json();

    if (!Array.isArray(rows) || !rows.length) {
      omkContent.innerHTML = '<div class="empty-state">Inga matcher i denna fil.</div>';
      return;
    }

    var validRows = rows.filter(function(r) { return r.game_date && r.home_team; });
    validRows.sort(function(a,b) { return new Date(a.game_date) - new Date(b.game_date); });
    _sparadePanel = validRows;

    var html = '<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">';
    html += '<button onclick="loadSparadeAtamalar()" class="btn btn-secondary">← Alla filer</button>';
    html += '<div style="font-size:1.1rem;font-weight:700;color:var(--accent);">📄 ' + sessionName + '</div>';
    html += '<span style="color:var(--muted);font-size:0.85rem;">(' + validRows.length + ' matcher)</span>';
    html += '<div style="margin-left:auto;display:flex;gap:0.5rem;">';
    html += '<button onclick="printSparade()" class="btn btn-secondary">🖨️ PDF</button>';
    html += '<button data-sname="' + encodeURIComponent(sessionName) + '" onclick="deleteSparadeSession(decodeURIComponent(this.dataset.sname))" class="btn btn-danger" style="font-size:0.85rem;">Ta bort fil</button>';
    html += '</div></div>';

    html += '<div class="table-wrap"><table><thead><tr>';
    html += '<th>Datum</th><th>Avspark</th><th>Arena</th><th>Hemmalag</th><th>Bortalag</th>';
    html += '<th>Hemma rum</th><th>Borta rum</th><th>Anteckningar</th><th></th>';
    html += '</tr></thead><tbody>';

    var prevDate2 = null;
    validRows.forEach(function(row) {
      var dt      = row.game_date ? new Date(row.game_date) : null;
      var dateStr = dt ? dt.toLocaleDateString('sv-SE', {weekday:'short',day:'2-digit',month:'short'}) : '—';
      var timeStr = dt ? dt.toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'}) : '—';
      var curDate2 = dt ? dt.toISOString().slice(0,10) : null;
      var dayBorder2 = (prevDate2 && prevDate2 !== curDate2) ? 'border-top:3px solid var(--accent);' : '';
      prevDate2 = curDate2;
      var isSFK_home = row.home_team && row.home_team.includes('Sollentuna');
      var isSFK_away = row.away_team && row.away_team.includes('Sollentuna');
      var lStyle = 'width:18px;height:18px;object-fit:contain;border-radius:3px;vertical-align:middle;margin-right:4px;';

      html += '<tr id="sparade_row_' + row.game_id + '" style="' + dayBorder2 + '">';
      html += '<td style="color:var(--muted);font-size:0.82rem;white-space:nowrap;">' + dateStr + '</td>';
      html += '<td style="font-weight:600;">' + timeStr + '</td>';
      html += '<td style="font-size:0.8rem;color:var(--muted);">' + (row.arena_name||'—') + '</td>';
      html += '<td style="' + (isSFK_home ? 'color:var(--accent);font-weight:700;' : '') + '">';
      if (row.home_logo) html += '<img src="' + row.home_logo + '" style="' + lStyle + '" onerror="this.remove()"> ';
      html += (row.home_team||'—') + '</td>';
      html += '<td style="' + (isSFK_away ? 'color:var(--accent);font-weight:700;' : '') + '">';
      if (row.away_logo) html += '<img src="' + row.away_logo + '" style="' + lStyle + '" onerror="this.remove()"> ';
      html += (row.away_team||'—') + '</td>';
      html += '<td>' + (row.home_room||'—') + '</td>';
      html += '<td>' + (row.away_room||'—') + '</td>';
      html += '<td style="color:var(--muted);font-size:0.82rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="' + (row.notes||'') + '">' + (row.notes||'—') + '</td>';
      html += '<td><button onclick="editSparadeRow(' + row.id + ',' + row.game_id + ')" class="btn btn-secondary" style="padding:0.25rem 0.6rem;font-size:0.8rem;">✏️</button></td>';
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    omkContent.innerHTML = html;

  } catch(e) {
    omkContent.innerHTML = '<div class="empty-state">Fel: ' + e.message + '</div>';
  }
}

async function deleteSparadeSession(sessionName) {
  const ok = await showConfirm('Ta bort hela filen "' + sessionName + '"?', 'Ta bort');
  if (!ok) return;
  try {
    const r = await fetch('/api/admin?action=deleteroom&session=' + encodeURIComponent(sessionName), {headers: authHeaders()});
    if (r.ok) { loadSparadeAtamalar(); }
    else { alert('Fel vid borttagning'); }
  } catch(e) { alert('Fel: ' + e.message); }
}

function editSparadeRow(rowId, gameId) {
  const sparade = (_sparadePanel || []).find(function(r) { return r.game_id === gameId; });
  if (!sparade) return;

  // Inline edit panel göster
  const rowEl = document.getElementById('sparade_row_' + gameId);
  if (!rowEl) return;

  // Zaten açık mı?
  const existingEdit = document.getElementById('sparade_edit_' + gameId);
  if (existingEdit) { existingEdit.remove(); return; }

  const rooms = getRoomsForArena(sparade.arena_id);
  function makeOpt(val, cur) {
    return rooms.map(function(r) {
      return '<option value="' + r + '"' + (cur === r ? ' selected' : '') + '>' + r + '</option>';
    }).join('');
  }

  const editRow = document.createElement('tr');
  editRow.id = 'sparade_edit_' + gameId;
  editRow.style.background = 'rgba(0,212,255,0.05)';
  editRow.innerHTML = '<td colspan="9" style="padding:0.75rem 1rem;">'
    + '<div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap;">'
    + '<div><label style="font-size:0.75rem;color:var(--muted);display:block;">Hemma rum</label>'
    + '<select id="sedit_home_' + gameId + '" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.35rem 0.5rem;border-radius:6px;font-size:0.85rem;">'
    + '<option value="">— Rum —</option>' + makeOpt(sparade.home_room) + '</select></div>'
    + '<div><label style="font-size:0.75rem;color:var(--muted);display:block;">Borta rum</label>'
    + '<select id="sedit_away_' + gameId + '" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.35rem 0.5rem;border-radius:6px;font-size:0.85rem;">'
    + '<option value="">— Rum —</option>' + makeOpt(sparade.away_room) + '</select></div>'
    + '<div style="flex:1;min-width:150px;"><label style="font-size:0.75rem;color:var(--muted);display:block;">Anteckningar</label>'
    + '<input type="text" id="sedit_notes_' + gameId + '" value="' + (sparade.notes||'') + '" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.35rem 0.5rem;border-radius:6px;font-size:0.85rem;"></div>'
    + '<button onclick="saveSparadeEdit(' + gameId + ')" class="btn btn-success" style="margin-top:1.1rem;padding:0.35rem 0.8rem;">💾</button>'
    + '<button onclick="cancelSparadeEdit(' + gameId + ')" class="btn btn-secondary" style="margin-top:1.1rem;padding:0.35rem 0.8rem;">✕</button>'
    + '</div></td>';

  rowEl.insertAdjacentElement('afterend', editRow);
}

function cancelSparadeEdit(gameId) {
  var el = document.getElementById('sparade_edit_' + gameId);
  if (el) el.remove();
}

async function saveSparadeEdit(gameId) {
  const sparade = (_sparadePanel || []).find(function(r) { return r.game_id === gameId; });
  if (!sparade) return;
  const homeRoom = document.getElementById('sedit_home_' + gameId)?.value || null;
  const awayRoom = document.getElementById('sedit_away_' + gameId)?.value || null;
  const notes    = document.getElementById('sedit_notes_' + gameId)?.value?.trim() || null;

  try {
    const r = await fetch('/api/admin?action=saveroom', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        game_id: gameId, game_date: sparade.game_date,
        home_team: sparade.home_team, away_team: sparade.away_team,
        arena_id: sparade.arena_id, arena_name: sparade.arena_name,
        home_room: homeRoom, away_room: awayRoom,
        notes: notes, status: 'pending',
        extra_json: sparade.extra_json,
        home_logo: sparade.home_logo, away_logo: sparade.away_logo,
        session_name: _currentSession
      })
    });
    if (r.ok) {
      // Panel'i güncelle
      sparade.home_room = homeRoom;
      sparade.away_room = awayRoom;
      sparade.notes = notes;
      document.getElementById('sparade_edit_' + gameId)?.remove();
      openSparadeSession(_currentSession);
    }
  } catch(e) { alert('Fel: ' + e.message); }
}

async function deleteSparadeRow(gameId) {
  if (!confirm('Ta bort denna tilldelning?')) return;
  try {
    const r = await fetch('/api/admin?action=deleteroom&gameId=' + gameId, {headers: authHeaders()});
    if (r.ok) {
      const row = document.getElementById('sparade_row_' + gameId);
      if (row) row.remove();
      if (window._omkRooms) delete window._omkRooms[gameId];
    } else { alert('Fel vid borttagning'); }
  } catch(e) { alert('Fel: ' + e.message); }
}


function printSparade() {
  var rows = _sparadePanel || [];
  if (!rows || !rows.length) { alert('Oppna en sparad fil forst.'); return; }

  var norrviken = rows.filter(function(r) { return NORRVIKEN_ARENAS.includes(r.arena_id); });
  var edsbergs  = rows.filter(function(r) { return EDSBERGS_ARENAS.includes(r.arena_id); });
  var other     = rows.filter(function(r) { return !NORRVIKEN_ARENAS.includes(r.arena_id) && !EDSBERGS_ARENAS.includes(r.arena_id); });

  var printWin = window.open('', '_blank', 'width=1400,height=900');
  printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Omkladningsrum</title>');
  printWin.document.write('<style>');
  printWin.document.write('body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:15px;}');
  printWin.document.write('h1{font-size:15px;margin-bottom:3px;}');
  printWin.document.write('.sub{color:#666;font-size:9px;margin-bottom:14px;}');
  printWin.document.write('.group{margin-bottom:20px;}');
  printWin.document.write('.gtitle{font-size:12px;font-weight:700;color:#1a1a2e;border-bottom:2px solid #1a1a2e;padding-bottom:3px;margin-bottom:7px;}');
  printWin.document.write('table{width:100%;border-collapse:collapse;font-size:9px;table-layout:fixed;}');
  printWin.document.write('col.c-date{width:70px}col.c-time{width:40px}col.c-arena{width:100px}');
  printWin.document.write('col.c-team{width:130px}col.c-room{width:80px}col.c-in{width:35px}col.c-out{width:35px}col.c-msg{width:auto}');
  printWin.document.write('th{background:#1a1a2e;color:#fff;padding:4px 5px;text-align:left;overflow:hidden;}');
  printWin.document.write('td{padding:3px 5px;vertical-align:middle;overflow:hidden;word-break:break-word;}');
  printWin.document.write('tr.new-day td{border-top:2px solid #333;}');
  printWin.document.write('tr.hemma-row td{border-top:1px solid #ddd;}');
  printWin.document.write('tr.borta-row td{border-top:none;border-bottom:1px solid #ddd;}');
  printWin.document.write('.sfk{font-weight:700;color:#0055aa;}');
  printWin.document.write('.logo{width:14px;height:14px;object-fit:contain;vertical-align:middle;margin-right:3px;}');
  printWin.document.write('@media print{@page{margin:0.8cm;size:A4 landscape;}body{margin:8px;font-size:9px;}}');
  printWin.document.write('</style></head><body>');
  printWin.document.write('<h1>Sollentuna FK - Omkladningsrum</h1>');
  printWin.document.write('<div class="sub">Utskriven: ' + new Date().toLocaleDateString('sv-SE') + '  |  Fil: ' + (_currentSession || '') + '</div>');

  function buildGroup(title, gList) {
    if (!gList.length) return '';
    var h = '<div class="group"><div class="gtitle">' + title + '</div>';
    h += '<table>';
    h += '<colgroup><col class="c-date"><col class="c-time"><col class="c-arena"><col class="c-team"><col class="c-room"><col class="c-in"><col class="c-out"><col class="c-msg"></colgroup>';
    h += '<thead><tr>';
    h += '<th>Datum</th><th>Avspark</th><th>Arena</th><th>Lag</th><th>Rum</th><th>In</th><th>Ut</th><th>Meddelande</th>';
    h += '</tr></thead><tbody>';
    var prevDate = null;
    gList.forEach(function(row) {
      var dt      = row.game_date ? new Date(row.game_date) : null;
      var dateStr = dt ? dt.toLocaleDateString('sv-SE', {weekday:'short',day:'2-digit',month:'short'}) : '—';
      var timeStr = dt ? dt.toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'}) : '—';
      var curDate = dt ? dt.toISOString().slice(0,10) : null;
      var isNewDay = curDate && curDate !== prevDate;
      prevDate = curDate;
      var hc    = row.home_team?.includes('Sollentuna') ? ' class="sfk"' : '';
      var ac    = row.away_team?.includes('Sollentuna') ? ' class="sfk"' : '';
      var notes = row.notes || '—';
      var extra = {};
      try { extra = JSON.parse(row.extra_json || '{}'); } catch(e) {}
      var homeIn  = extra.homeIn  || '—';
      var homeOut = extra.homeOut || '—';
      var awayIn  = extra.awayIn  || '—';
      var awayOut = extra.awayOut || '—';
      var homeLogo = row.home_logo ? '<img src="' + row.home_logo + '" class="logo" crossorigin="anonymous">' : '';
      var awayLogo = row.away_logo ? '<img src="' + row.away_logo + '" class="logo" crossorigin="anonymous">' : '';
      // Hemma satırı
      h += '<tr class="' + (isNewDay ? 'new-day' : 'hemma-row') + '">';
      h += '<td rowspan="2">' + dateStr + '</td>';
      h += '<td rowspan="2">' + timeStr + '</td>';
      h += '<td rowspan="2">' + (row.arena_name||'—') + '</td>';
      h += '<td' + hc + '>' + homeLogo + (row.home_team||'—') + '</td>';
      h += '<td>' + (row.home_room||'—') + '</td>';
      h += '<td>' + homeIn + '</td><td>' + homeOut + '</td>';
      h += '<td rowspan="2">' + notes + '</td>';
      h += '</tr>';
      // Borta satırı
      h += '<tr class="borta-row">';
      h += '<td' + ac + '>' + awayLogo + (row.away_team||'—') + '</td>';
      var extra2 = {};
      try { extra2 = JSON.parse(row.extra_json || '{}'); } catch(e) {}
      var awayRoom2Str = extra2.awayRoom2 ? ' + ' + extra2.awayRoom2 : '';
      h += '<td>' + (row.away_room||'—') + awayRoom2Str + '</td>';
      h += '<td>' + awayIn + '</td><td>' + awayOut + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }

  printWin.document.write(buildGroup('Norrvikens Omkladningsrum', norrviken));
  printWin.document.write(buildGroup('Edsbergs Omkladningsrum', edsbergs));
  if (other.length) printWin.document.write(buildGroup('Ovriga arenor', other));
  printWin.document.write('</body></html>');
  printWin.document.close();
  setTimeout(function(){ printWin.print(); }, 800);
}



// ── Eski fonksiyonlar (uyumluluk için) ─────────────────────
function renderOmkladningsrum(games, rooms, from, to) { renderOmkList(games, rooms); }
function saveRoomAssignment(gameId) {}

// ── Checkbox fonksiyonları ────────────────────────────────
function omkCheckChange() {
  const checked = document.querySelectorAll('.omk-check:checked').length;
  const btn = document.getElementById('omkNastaBtn');
  if (btn) btn.style.display = checked > 0 ? 'inline-block' : 'none';
}

function omkToggleAll(el, grp) {
  var sel = grp ? document.querySelectorAll('.omk-check.' + grp) : document.querySelectorAll('.omk-check');
  sel.forEach(function(cb) { cb.checked = el.checked; });
  omkCheckChange();
}

// ── Nästa — seçili maçlar için oda atama ekranı ──────────
function omkNasta() {
  const checked = Array.from(document.querySelectorAll('.omk-check:checked'));
  if (!checked.length) return;

  const gameIds = checked.map(function(cb) { return parseInt(cb.dataset.gameid); });
  const games   = (window._omkAllGames || []).filter(function(g) { return gameIds.includes(g.gameId); });

  // Liste ve Nästa panel'i gizle/göster
  document.getElementById('omkladningsrumContent').style.display = 'none';
  document.getElementById('omkNastaBtn').style.display = 'none';
  document.getElementById('omkNastaPanel').style.display = 'block';
  document.getElementById('omkNastaCount').textContent = ' · ' + games.length + ' matcher valda';

  renderNastaContent(games);
}

function omkGeriDon() {
  _omkTableCounter = 0;
  document.getElementById('omkladningsrumContent').style.display = '';
  document.getElementById('omkNastaPanel').style.display = 'none';
  filterOmk(); // Tabloyu yeniden render et (checkbox'ları temizle)
}

function makeTimeOptions(selectedVal) {
  var opts = '<option value="">—</option>';
  for (var h = 6; h <= 23; h++) {
    for (var m = 0; m < 60; m += 15) {
      var hh = h.toString().padStart(2,'0');
      var mm = m.toString().padStart(2,'0');
      var val = hh + ':' + mm;
      opts += '<option value="' + val + '"' + (val === selectedVal ? ' selected' : '') + '>' + val + '</option>';
    }
  }
  return opts;
}

function calcDefaultTime(gameDate, offsetMinutes) {
  var dt = new Date(gameDate);
  dt.setMinutes(dt.getMinutes() + offsetMinutes);
  // 15 dk'ya yuvarla
  var mins = dt.getMinutes();
  var rounded = Math.round(mins / 15) * 15;
  if (rounded === 60) { dt.setHours(dt.getHours() + 1); rounded = 0; }
  dt.setMinutes(rounded);
  return dt.getHours().toString().padStart(2,'0') + ':' + dt.getMinutes().toString().padStart(2,'0');
}

function onLamnaRumChange(checkbox, selectId, gameDate) {
  if (!checkbox.checked) return;
  var matchStart = calcDefaultTime(gameDate, 0);
  var select = document.getElementById(selectId);
  if (!select) return;
  for (var i = 0; i < select.options.length; i++) {
    if (select.options[i].value === matchStart) {
      select.selectedIndex = i;
      break;
    }
  }
  checkDoubleBooking();
}

function makeTimeSelect(id, defaultVal) {
  return '<select id="' + id + '" onchange="checkDoubleBooking()" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.3rem 0.4rem;border-radius:6px;font-size:0.8rem;width:80px;">'
    + makeTimeOptions(defaultVal) + '</select>';
}

function checkDoubleBooking() {
  var games = window._omkNastaGames || [];
  if (!games.length) return;

  // Tüm oda+saat bilgilerini topla
  var slots = []; // {gameId, team, room, inTime, outTime, arenaId, date}
  games.forEach(function(g) {
    var homeRoom = document.getElementById('nasta_home_' + g.gameId)?.value;
    var awayRoom = document.getElementById('nasta_away_' + g.gameId)?.value;
    var homeIn   = document.getElementById('nasta_home_in_' + g.gameId)?.value;
    var homeOut  = document.getElementById('nasta_home_out_' + g.gameId)?.value;
    var awayIn   = document.getElementById('nasta_away_in_' + g.gameId)?.value;
    var awayOut  = document.getElementById('nasta_away_out_' + g.gameId)?.value;
    var date     = g.gameDate ? g.gameDate.slice(0, 10) : ''; // YYYY-MM-DD
    if (homeRoom) slots.push({gameId: g.gameId, team:'home', room: homeRoom, inTime: homeIn, outTime: homeOut, arenaId: g.arenaId, date: date});
    if (awayRoom) slots.push({gameId: g.gameId, team:'away', room: awayRoom, inTime: awayIn, outTime: awayOut, arenaId: g.arenaId, date: date});
  });

  // Çakışan slot'ları bul
  var conflictKeys = new Set();
  for (var i = 0; i < slots.length; i++) {
    for (var j = i + 1; j < slots.length; j++) {
      var a = slots[i], b = slots[j];
      if (a.date !== b.date) continue;          // Farklı gün — çakışma olmaz
      if (a.arenaId !== b.arenaId) continue;    // Farklı arena — çakışma olmaz
      if (a.room !== b.room || !a.room) continue; // Farklı oda
      // Saat çakışıyor mu? (a.in < b.out && b.in < a.out)
      if (a.inTime < b.outTime && b.inTime < a.outTime) {
        conflictKeys.add(a.gameId + '_' + a.team);
        conflictKeys.add(b.gameId + '_' + b.team);
      }
    }
  }

  // Tüm select'leri sıfırla, sonra çakışanları kırmızı yap
  games.forEach(function(g) {
    ['home', 'away'].forEach(function(team) {
      var roomEl = document.getElementById('nasta_' + team + '_' + g.gameId);
      var inEl   = document.getElementById('nasta_' + team + '_in_' + g.gameId);
      var outEl  = document.getElementById('nasta_' + team + '_out_' + g.gameId);
      var isConflict = conflictKeys.has(g.gameId + '_' + team);
      var border = isConflict ? '2px solid #f55' : '1px solid var(--border)';
      if (roomEl) { roomEl.style.border = border; roomEl.style.background = 'var(--surface2)'; }
      if (inEl)   { inEl.style.border   = border; inEl.style.background   = 'var(--surface2)'; }
      if (outEl)  { outEl.style.border  = border; outEl.style.background  = 'var(--surface2)'; }
    });
  });
}

function renderNastaContent(games) {
  window._omkNastaGames = games; // checkDoubleBooking için
  var rooms = window._omkRooms || {};

  function buildNastaGroup(title, gList) {
    if (!gList.length) return '';
    var h = '<div class="omk-group" style="margin-bottom:2rem;">';
    h += '<div class="omk-group-title">🏟️ ' + title + '</div>';
    h += '<div class="table-wrap" style="overflow-x:auto;"><table style="min-width:900px;">';
    h += '<thead><tr>';
    h += '<th>Datum</th><th>Avspark</th><th>Arena</th>';
    h += '<th>Lag</th><th>Rum</th><th>In</th><th>Ut</th>';
    h += '<th>Meddelande</th>';
    h += '</tr></thead><tbody>';  // ilk tbody — forEach'de her maç için yeni tbody açılır

    // Gün+arena bazında oda planlaması — her slot için önceden default ata
    // Anahtar: "YYYY-MM-DD|arenaId", değer: sonraki müsait oda index'i
    var dayArenaRoomIndex = {};
    var preAssigned = {}; // gameId_home veya gameId_away → oda

    gList.forEach(function(g) {
      var rl = getRoomsForArena(g.arenaId);
      var skip = new Set(['Herr','Dam','Flick']);
      var nonSpecial = rl.filter(function(r){ return !skip.has(r); });
      var date = new Date(g.gameDate).toISOString().slice(0,10);
      var key = date + '|' + g.arenaId;
      if (!dayArenaRoomIndex[key]) dayArenaRoomIndex[key] = 0;

      function nextRoom() {
        var idx = dayArenaRoomIndex[key];
        var room = nonSpecial[idx % nonSpecial.length];
        dayArenaRoomIndex[key]++;
        return room;
      }

      var savedH = (rooms[g.gameId] || {}).homeRoom;
      var savedA = (rooms[g.gameId] || {}).awayRoom;

      var homeName = (g.homeTeam || '').toLowerCase();
      var awayName = (g.awayTeam || '').toLowerCase();

      // Hemma
      if (savedH) {
        preAssigned[g.gameId + '_home'] = savedH;
      } else if (homeName.includes('a-lag herr') || (homeName.includes('herr') && homeName.includes('sollentuna'))) {
        preAssigned[g.gameId + '_home'] = 'Herr';
      } else if (homeName.includes('a-lag dam') || (homeName.includes('dam') && homeName.includes('sollentuna'))) {
        preAssigned[g.gameId + '_home'] = 'Dam';
      } else {
        preAssigned[g.gameId + '_home'] = nextRoom();
      }

      // Borta
      if (savedA) {
        preAssigned[g.gameId + '_away'] = savedA;
      } else if (awayName.includes('a-lag herr') || (awayName.includes('herr') && awayName.includes('sollentuna'))) {
        preAssigned[g.gameId + '_away'] = 'Herr';
      } else if (awayName.includes('a-lag dam') || (awayName.includes('dam') && awayName.includes('sollentuna'))) {
        preAssigned[g.gameId + '_away'] = 'Dam';
      } else {
        preAssigned[g.gameId + '_away'] = nextRoom();
      }
    });

    gList.forEach(function(g, gIdx) {
      var dt      = new Date(g.gameDate);
      var dateStr = dt.toLocaleDateString('sv-SE', {weekday:'short',day:'2-digit',month:'short'});
      var timeStr = dt.toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'});
  
      var roomList = getRoomsForArena(g.arenaId);
      var saved   = rooms[g.gameId] || {};
      var isSFK_home = g.homeTeam && g.homeTeam.includes('Sollentuna');
      var isSFK_away = g.awayTeam && g.awayTeam.includes('Sollentuna');

      // Default saatler
      var homeIn  = calcDefaultTime(g.gameDate, -90);
      var homeOut = calcDefaultTime(g.gameDate, 135);
      var awayIn  = calcDefaultTime(g.gameDate, -90);
      var awayOut = calcDefaultTime(g.gameDate, 135);

      function makeRoomSelect(id, current, defaultVal) {
        var val = current || defaultVal || '';
        var s = '<select id="' + id + '" onchange="checkDoubleBooking()" style="width:100%;min-width:130px;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.3rem 0.4rem;border-radius:6px;font-size:0.8rem;">';
        s += '<option value="">— Rum —</option>';
        roomList.forEach(function(r) {
          s += '<option value="' + r + '"' + (val === r ? ' selected' : '') + '>' + r + '</option>';
        });
        s += '</select>';
        return s;
      }

      // Logo URL'leri
      var homeLogo = g.homeLogo || '';
      var awayLogo = g.awayLogo || '';
      var logoStyle = 'width:20px;height:20px;object-fit:contain;border-radius:3px;vertical-align:middle;margin-right:4px;';

      // Gün değişti mi?
      var prevNastaGame = gIdx > 0 ? gList[gIdx - 1] : null;
      var prevNastaDate = prevNastaGame ? new Date(prevNastaGame.gameDate).toISOString().slice(0,10) : null;
      var curNastaDate  = new Date(g.gameDate).toISOString().slice(0,10);
      var nastaNewDay   = prevNastaDate && prevNastaDate !== curNastaDate;
      // Gün değişimi — her maç grubunu <tbody> ile sar
      h += '</tbody><tbody class="' + (nastaNewDay ? 'new-day' : 'same-day') + '">';
      // Hemma satırı
      h += '<tr>';
      h += '<td rowspan="2" style="color:var(--muted);font-size:0.82rem;white-space:nowrap;vertical-align:top;padding-top:0.6rem;">' + dateStr + '</td>';
      h += '<td rowspan="2" style="font-weight:600;white-space:nowrap;vertical-align:top;padding-top:0.6rem;">' + timeStr + '</td>';
      h += '<td rowspan="2" style="font-size:0.8rem;color:var(--muted);vertical-align:top;padding-top:0.6rem;">' + (g.arenaName||'—') + '</td>';
      h += '<td style="' + (isSFK_home ? 'color:var(--accent);font-weight:700;' : '') + 'white-space:nowrap;">';
      if (homeLogo) {
        h += '<img src="' + homeLogo + '" style="' + logoStyle + '" onerror="this.remove()"> ';
      }
      h += (g.homeTeam||'—') + '</td>';
      var isSFKHome = g.homeTeam && g.homeTeam.includes('Sollentuna');
      var defaultHomeRoom = preAssigned[g.gameId + '_home'] || roomList[0];
      h += '<td>' + makeRoomSelect('nasta_home_' + g.gameId, saved.homeRoom, defaultHomeRoom) + '</td>';
      h += '<td>' + makeTimeSelect('nasta_home_in_' + g.gameId, homeIn) + '</td>';
      h += '<td>' + makeTimeSelect('nasta_home_out_' + g.gameId, homeOut) + '</td>';
      // Meddelande — rowspan 2
      h += '<td rowspan="2" style="min-width:180px;vertical-align:top;padding-top:0.4rem;">';
      h += '<div style="display:flex;flex-direction:column;gap:0.35rem;">';
      h += '<label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;">';
      h += '<input type="checkbox" id="nasta_msg_home_' + g.gameId + '" onchange="onLamnaRumChange(this,\'nasta_home_out_' + g.gameId + '\',\'' + g.gameDate + '\')"> Hemmalag: lämna rum</label>';
      h += '<label style="display:flex;align-items:center;gap:0.4rem;font-size:0.8rem;cursor:pointer;">';
      h += '<input type="checkbox" id="nasta_msg_away_' + g.gameId + '" onchange="onLamnaRumChange(this,\'nasta_away_out_' + g.gameId + '\',\'' + g.gameDate + '\')"> Bortalag: lämna rum</label>';
      h += '<input type="text" id="nasta_msg_own_' + g.gameId + '" placeholder="Egen text..." value="' + (saved.notes||'') + '" ';
      h += 'style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.3rem 0.4rem;border-radius:6px;font-size:0.8rem;">';
      h += '</div></td>';
      h += '</tr>';

      // A-lag Herr veya A-lag Dam maçında rakibe ekstra oda
      var isAlagMatch = (g.homeTeam && (g.homeTeam.includes('A-lag Herr') || g.homeTeam.includes('A-lag Dam')))
                     || (g.awayTeam && (g.awayTeam.includes('A-lag Herr') || g.awayTeam.includes('A-lag Dam')));
      var defaultAwayRoom2 = roomList[2] || roomList[1]; // Rum 3

      // Borta satırı
      h += '<tr>';
      h += '<td style="' + (isSFK_away ? 'color:var(--accent);font-weight:700;' : '') + 'white-space:nowrap;">';
      if (awayLogo) {
        h += '<img src="' + awayLogo + '" style="' + logoStyle + '" onerror="this.remove()"> ';
      }
      h += (g.awayTeam||'—') + '</td>';
      var isSFKAway = g.awayTeam && g.awayTeam.includes('Sollentuna');
      var defaultAwayRoom = preAssigned[g.gameId + '_away'] || roomList[1];
      if (isAlagMatch) {
        // A-lag: rakip için 2 oda yan yana
        h += '<td style="display:flex;gap:4px;align-items:center;">'
          + makeRoomSelect('nasta_away_' + g.gameId, saved.awayRoom, defaultAwayRoom)
          + '<span style="color:var(--muted);font-size:0.75rem;">+</span>'
          + makeRoomSelect('nasta_away2_' + g.gameId, saved.awayRoom2 || null, defaultAwayRoom2)
          + '</td>';
      } else {
        h += '<td>' + makeRoomSelect('nasta_away_' + g.gameId, saved.awayRoom, defaultAwayRoom) + '</td>';
      }
      h += '<td>' + makeTimeSelect('nasta_away_in_' + g.gameId, awayIn) + '</td>';
      h += '<td>' + makeTimeSelect('nasta_away_out_' + g.gameId, awayOut) + '</td>';
      h += '</tr>';
    });

    h += '</tbody></table></div></div>';
    return h;
  }

  var norrviken = games.filter(function(g) { return NORRVIKEN_ARENAS.includes(g.arenaId); });
  var edsbergs  = games.filter(function(g) { return EDSBERGS_ARENAS.includes(g.arenaId); });

  var html = buildNastaGroup('Norrvikens Omkladningsrum', norrviken);
  html += buildNastaGroup('Edsbergs Omkladningsrum', edsbergs);
  document.getElementById('omkNastaContent').innerHTML = html;
  window._omkNastaGames = games;
  setTimeout(checkDoubleBooking, 50); // render bittikten sonra kontrol et
}

async function saveAllOmkRooms() {
  const games = window._omkNastaGames || [];
  if (!games.length) return;

  // DOM değerlerini oku
  const savedData = games.map(function(g) {
    const homeRoom = document.getElementById('nasta_home_' + g.gameId)?.value || null;
    const awayRoom = document.getElementById('nasta_away_' + g.gameId)?.value || null;
    const awayRoom2 = document.getElementById('nasta_away2_' + g.gameId)?.value || null;
    const homeIn   = document.getElementById('nasta_home_in_' + g.gameId)?.value || null;
    const homeOut  = document.getElementById('nasta_home_out_' + g.gameId)?.value || null;
    const awayIn   = document.getElementById('nasta_away_in_' + g.gameId)?.value || null;
    const awayOut  = document.getElementById('nasta_away_out_' + g.gameId)?.value || null;
    const msgHome  = document.getElementById('nasta_msg_home_' + g.gameId)?.checked || false;
    const msgAway  = document.getElementById('nasta_msg_away_' + g.gameId)?.checked || false;
    const ownText  = document.getElementById('nasta_msg_own_' + g.gameId)?.value?.trim() || '';
    const msgs = [];
    if (msgHome) msgs.push('Hemmalag: lämna rum innan matchstart');
    if (msgAway) msgs.push('Bortalag: lämna rum innan matchstart');
    if (ownText) msgs.push(ownText);
    return {
      gameId: g.gameId, gameDate: g.gameDate,
      homeTeam: g.homeTeam, awayTeam: g.awayTeam,
      arenaId: g.arenaId, arenaName: g.arenaName,
      homeLogo: g.homeLogo||null, awayLogo: g.awayLogo||null,
      homeRoom, awayRoom,
      notes: msgs.join(' | ') || null,
      extra: JSON.stringify({homeIn, homeOut, awayIn, awayOut, awayRoom2})
    };
  });

  console.log('savedData count:', savedData.length, 'first homeRoom:', savedData[0]?.homeRoom);

  // İsim al
  const today = new Date().toLocaleDateString('sv-SE');
  const sName = prompt('Ange ett namn:', today + ' Omkladningsrum');
  if (!sName || !sName.trim()) return;
  const sessionName = sName.trim();

  const msgEl = document.getElementById('omkNastaMsg');
  if (msgEl) { msgEl.style.color = 'var(--muted)'; msgEl.textContent = 'Sparar...'; }

  // Tüm kayıtları paralel gönder
  const results = await Promise.all(savedData.map(function(d) {
    return fetch('/api/admin?action=saveroom', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        game_id: parseInt(d.gameId), game_date: d.gameDate,
        home_team: d.homeTeam, away_team: d.awayTeam,
        arena_id: d.arenaId, arena_name: d.arenaName,
        home_room: d.homeRoom, away_room: d.awayRoom,
        notes: d.notes, status: 'pending',
        extra_json: d.extra,
        home_logo: d.homeLogo, away_logo: d.awayLogo,
        session_name: sessionName
      })
    }).then(function(r) { return r.ok ? 'ok' : 'err'; })
    .catch(function(e) { console.error('err:', e); return 'err'; });
  }));

  const saved  = results.filter(function(r){ return r==='ok'; }).length;
  const errors = results.filter(function(r){ return r==='err'; }).length;

  console.log('saved:', saved, 'errors:', errors);

  if (msgEl) {
    if (errors === 0) { msgEl.style.color='var(--green)'; msgEl.textContent='✅ '+saved+' matcher sparade!'; }
    else { msgEl.style.color='var(--yellow)'; msgEl.textContent='⚠️ '+saved+' sparade, '+errors+' fel.'; }
  }

  if (errors === 0) {
    document.getElementById('omkNastaPanel').style.display = 'none';
    document.getElementById('omkladningsrumContent').style.display = 'block';
    document.getElementById('omkNastaBtn').style.display = 'none';
    await loadSparadeAtamalar();
  }
}





// Custom confirm modal
var _confirmResolve = null;
function showConfirm(msg, okLabel) {
  return new Promise(function(resolve) {
    _confirmResolve = resolve;
    document.getElementById('confirmModalMsg').textContent = msg;
    document.getElementById('confirmModalOkBtn').textContent = okLabel || 'Ta bort';
    document.getElementById('confirmModal').style.display = 'flex';
  });
}
function confirmModalResolve(val) {
  document.getElementById('confirmModal').style.display = 'none';
  if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; }
}

function cancelOmkName() {
  document.getElementById('omkNameModal').style.display = 'none';
}

async function confirmOmkName() {
  var input = document.getElementById('omkSessionNameInput');
  var sName = (input?.value || '').trim();
  console.log('confirmOmkName: sName=', sName, 'pending=', window._pendingNastaGames?.length);
  if (!sName) { input?.focus(); return; }
  document.getElementById('omkNameModal').style.display = 'none';

  var savedData = window._pendingNastaGames || [];
  if (!savedData.length) { alert('Ingen data att spara.'); return; }
  window._pendingNastaGames = null;

  var msgEl = document.getElementById('omkNastaMsg');
  if (msgEl) { msgEl.style.color = 'var(--muted)'; msgEl.textContent = 'Sparar ' + savedData.length + ' matcher...'; }

  var saved = 0, errors = 0;
  for (var i = 0; i < savedData.length; i++) {
    var d = savedData[i];
    try {
      var r = await fetch('/api/admin?action=saveroom', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          game_id   : parseInt(d.gameId),
          game_date : d.gameDate,
          home_team : d.homeTeam,
          away_team : d.awayTeam,
          arena_id  : d.arenaId,
          arena_name: d.arenaName,
          home_room : d.homeRoom,
          away_room : d.awayRoom,
          notes     : d.notes,
          status    : 'pending',
          extra_json: d.extra,
          home_logo : d.homeLogo,
          away_logo : d.awayLogo,
          session_name: sName
        })
      });
      if (r.ok) {
        saved++;
      } else {
        var err = await r.json();
        console.error('saveroom error:', err);
        errors++;
      }
    } catch(e) { console.error('saveroom exception:', e); errors++; }
  }

  if (msgEl) {
    if (errors === 0) {
      msgEl.style.color = 'var(--green)';
      msgEl.textContent = '✅ ' + saved + ' matcher sparade!';
    } else {
      msgEl.style.color = 'var(--yellow)';
      msgEl.textContent = '⚠️ ' + saved + ' sparade, ' + errors + ' fel.';
    }
  }

  if (errors === 0) {
    document.getElementById('omkNastaPanel').style.display = 'none';
    document.getElementById('omkladningsrumContent').style.display = 'block';
    document.getElementById('omkNastaBtn').style.display = 'none';
    await loadSparadeAtamalar();
  }
}



function printOmkNasta() {
  var games = window._omkNastaGames || [];
  if (!games.length) return;
  var printWin = window.open('', '_blank', 'width=1400,height=900');
  printWin.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Omkladningsrum</title>');
  printWin.document.write('<style>');
  printWin.document.write('body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:15px;}');
  printWin.document.write('h1{font-size:15px;margin-bottom:3px;}');
  printWin.document.write('.sub{color:#666;font-size:9px;margin-bottom:14px;}');
  printWin.document.write('.group{margin-bottom:18px;}');
  printWin.document.write('.gtitle{font-size:12px;font-weight:700;border-bottom:2px solid #1a1a2e;padding-bottom:3px;margin-bottom:7px;color:#1a1a2e;}');
  printWin.document.write('table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:10px;}');
  printWin.document.write('th{background:#1a1a2e;color:#fff;padding:4px 5px;text-align:left;white-space:nowrap;}');
  printWin.document.write('td{padding:3px 5px;vertical-align:top;}');
  printWin.document.write('tr.main-row td{border-top:1px solid #ccc;}');
  printWin.document.write('tr.sub-row td{border-top:none;padding-top:2px;}');
  printWin.document.write('tr.msg-row td{border-top:none;padding-top:2px;padding-bottom:4px;}');
  printWin.document.write('.sfk{font-weight:700;color:#0055aa;}');
  printWin.document.write('.label{font-size:8px;color:#888;display:block;}');
  printWin.document.write('.time-cell{white-space:nowrap;}');
  printWin.document.write('@media print{@page{margin:0.8cm;size:A4 landscape;}body{margin:8px;}}');
  printWin.document.write('</style></head><body>');
  printWin.document.write('<h1>Sollentuna FK - Omkladningsrum</h1>');
  printWin.document.write('<div class="sub">Utskriven: ' + new Date().toLocaleDateString('sv-SE') + '</div>');

  var norrviken = games.filter(function(g){ return NORRVIKEN_ARENAS.includes(g.arenaId); });
  var edsbergs  = games.filter(function(g){ return EDSBERGS_ARENAS.includes(g.arenaId); });

  function buildPrintGroup(title, gList) {
    if (!gList.length) return '';
    var h = '<div class="group"><div class="gtitle">' + title + '</div>';
    h += '<table><thead><tr>';
    h += '<th>Datum</th><th>Avspark</th><th>Arena</th>';
    h += '<th>Lag</th><th>Rum</th><th>In</th><th>Ut</th><th>Meddelande</th>';
    h += '</tr></thead><tbody>';
    gList.forEach(function(g) {
      var dt      = new Date(g.gameDate);
      var dateStr = dt.toLocaleDateString('sv-SE', {weekday:'short',day:'2-digit',month:'short'});
      var timeStr = dt.toLocaleTimeString('sv-SE', {hour:'2-digit',minute:'2-digit'});
      var homeRoom = document.getElementById('nasta_home_' + g.gameId)?.value || '—';
      var awayRoom = document.getElementById('nasta_away_' + g.gameId)?.value || '—';
      var homeIn   = document.getElementById('nasta_home_in_' + g.gameId)?.value || '—';
      var homeOut  = document.getElementById('nasta_home_out_' + g.gameId)?.value || '—';
      var awayIn   = document.getElementById('nasta_away_in_' + g.gameId)?.value || '—';
      var awayOut  = document.getElementById('nasta_away_out_' + g.gameId)?.value || '—';
      var msgHome  = document.getElementById('nasta_msg_home_' + g.gameId)?.checked;
      var msgAway  = document.getElementById('nasta_msg_away_' + g.gameId)?.checked;
      var ownText  = document.getElementById('nasta_msg_own_' + g.gameId)?.value || '';
      var msgs = [];
      if (msgHome) msgs.push('Hemmalag: lämna rum innan matchstart');
      if (msgAway) msgs.push('Bortalag: lämna rum innan matchstart');
      if (ownText) msgs.push(ownText);
      var msgStr = msgs.join(' | ') || '—';
      var hc = g.homeTeam?.includes('Sollentuna') ? ' class="sfk"' : '';
      var ac = g.awayTeam?.includes('Sollentuna') ? ' class="sfk"' : '';
      // Hemma satırı
      h += '<tr style="border-top:2px solid #bbb;">';
      h += '<td rowspan="2">' + dateStr + '</td>';
      h += '<td rowspan="2" class="time-cell">' + timeStr + '</td>';
      h += '<td rowspan="2">' + (g.arenaName||'—') + '</td>';
      h += '<td' + hc + '>🏠 ' + (g.homeTeam||'—') + '</td>';
      h += '<td>' + homeRoom + '</td>';
      h += '<td class="time-cell">' + homeIn + '</td>';
      h += '<td class="time-cell">' + homeOut + '</td>';
      h += '<td rowspan="2">' + msgStr + '</td>';
      h += '</tr>';
      // Borta satırı
      h += '<tr>';
      h += '<td' + ac + '>✈️ ' + (g.awayTeam||'—') + '</td>';
      h += '<td>' + awayRoom + '</td>';
      h += '<td class="time-cell">' + awayIn + '</td>';
      h += '<td class="time-cell">' + awayOut + '</td>';
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }
  printWin.document.write(buildPrintGroup('Norrvikens Omkladningsrum', norrviken));
  printWin.document.write(buildPrintGroup('Edsbergs Omkladningsrum', edsbergs));
  printWin.document.write('</body></html>');
  printWin.document.close();
  setTimeout(function(){ printWin.print(); }, 600);
}

// ===================== GITHUB DEPLOY =====================
const GITHUB_TOKEN = localStorage.getItem('sfk_gh_token') || '';
const GITHUB_OWNER = 'cyesil';
const GITHUB_REPO = 'Sollentuna-FK';
const GITHUB_BRANCH = 'main';


function initMultiDropdown(btnId, listId) {
  const btn = document.getElementById(btnId);
  const list = document.getElementById(listId);
  if (!btn || !list) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    list.classList.toggle('open');
  });
  document.addEventListener('click', () => list.classList.remove('open'));
  list.addEventListener('click', (e) => e.stopPropagation());
  // Label güncellemesi
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
