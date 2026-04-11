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
// → matches.js
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

// → stats-render.js
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

