// ===================== İSTATİSTİK FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: authHeaders(), state, setStatus(), setError() (index.html'de tanımlı)
// ====================================================================

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

function renderMyStats(d) {
  if (!d || d.error) return '<div class="empty-state">Ingen statistik hittades</div>';
  const g = (n,cls='') => n > 0 ? `<span class="badge ${cls}">${n}</span>` : `<span class="badge badge-zero">—</span>`;
  return `
    <div style="display:flex;align-items:center;gap:1.5rem;margin-bottom:1.5rem;flex-wrap:wrap;">
      ${d.thumbnail ? `<img src="${d.thumbnail}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--accent);" onerror="this.style.display='none'">` : 
        `<div style="width:80px;height:80px;border-radius:50%;background:var(--surface2);border:3px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:2rem;">👤</div>`}
      <div style="flex:1;">
        <div style="font-size:1.4rem;font-weight:700;font-family:'Barlow Condensed',sans-serif;">${d.name}</div>
        <div style="color:var(--muted);font-size:0.9rem;">#${d.shirt} · Spelare</div>
      </div>
      <button onclick="showChangeOwnPassword()" style="background:var(--surface2);border:1px solid var(--border);color:var(--accent);padding:0.4rem 0.9rem;border-radius:6px;cursor:pointer;font-size:0.85rem;">🔑 Byt lösenord</button>
    </div>
    <div id="changeOwnPassPanel" style="display:none;background:var(--surface2);border:1px solid var(--accent);border-radius:10px;padding:1rem;margin-bottom:1.5rem;">
      <div style="font-weight:700;margin-bottom:0.75rem;">🔑 Byt lösenord</div>
      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;align-items:end;">
        <div>
          <label style="font-size:0.75rem;color:var(--muted);">Nuvarande lösenord</label>
          <input type="password" id="ownCurrentPass" placeholder="Nuvarande lösenord"
            style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.4rem 0.6rem;border-radius:6px;font-size:0.9rem;width:200px;">
        </div>
        <div>
          <label style="font-size:0.75rem;color:var(--muted);">Nytt lösenord</label>
          <input type="password" id="ownNewPass" placeholder="Nytt lösenord"
            style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.4rem 0.6rem;border-radius:6px;font-size:0.9rem;width:200px;">
        </div>
        <div>
          <label style="font-size:0.75rem;color:var(--muted);">Bekräfta lösenord</label>
          <input type="password" id="ownConfirmPass" placeholder="Bekräfta lösenord"
            style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.4rem 0.6rem;border-radius:6px;font-size:0.9rem;width:200px;">
        </div>
        <button onclick="saveOwnPassword()" class="btn btn-success">💾 Spara</button>
        <button onclick="document.getElementById('changeOwnPassPanel').style.display='none'" class="btn btn-secondary">✕</button>
      </div>
      <div id="ownPassMsg" style="margin-top:0.5rem;font-size:0.85rem;"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:1rem;margin-bottom:1.5rem;">
      <div class="stat-card"><div class="stat-val">${d.games||0}</div><div class="stat-lbl">Trupp</div></div>
      <div class="stat-card"><div class="stat-val">${d.starterGames||0}</div><div class="stat-lbl">Start 11</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--accent)">${d.minutesPlayed||0}'</div><div class="stat-lbl">Tot Min</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--green)">${d.goals||0}</div><div class="stat-lbl">Mål</div></div>
      <div class="stat-card"><div class="stat-val">${d.assists||0}</div><div class="stat-lbl">Assist</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--yellow)">${d.yellowCards||0}</div><div class="stat-lbl">Gult</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--red)">${d.redCards||0}</div><div class="stat-lbl">Rött</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--muted)">${d.minutesPlayed > 0 && d.games > 0 ? Math.round(d.minutesPlayed/d.games)+"'" : '—'}</div><div class="stat-lbl">Min/Match</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--muted)">${d.goals > 0 ? (Math.round(d.goals/d.games*100)/100) : '—'}</div><div class="stat-lbl">Mål/Match</div></div>
      <div class="stat-card"><div class="stat-val" style="color:var(--muted)">${d.goals > 0 && d.minutesPlayed > 0 ? Math.round(d.minutesPlayed/d.goals)+"'" : '—'}</div><div class="stat-lbl">Min/Mål</div></div>
    </div>
    ${d.matchDetails && d.matchDetails.length > 0 ? `
    <div class="table-wrap"><table>
      <thead><tr><th>Datum</th><th>Match</th><th>Resultat</th><th>Min</th><th style="color:var(--green)">Mål</th><th style="color:var(--accent)">Ast</th><th style="color:var(--yellow)">🟨</th><th style="color:var(--red)">🟥</th></tr></thead>
      <tbody>${d.matchDetails.map(m => {
        const date = new Date(m.gameDate).toLocaleDateString('sv-SE',{day:'2-digit',month:'short'});
        return `<tr>
          <td style="color:var(--muted);font-size:0.82rem;">${date}</td>
          <td class="player-name" style="font-size:0.85rem;">${m.homeTeam} vs ${m.awayTeam}</td>
          <td style="font-weight:700;">${m.homeScore}-${m.awayScore}</td>
          <td>${m.minutesPlayed > 0 ? `<span class="badge">${m.minutesPlayed}'</span>` : '<span class="badge badge-zero">—</span>'}</td>
          <td>${m.goals > 0 ? `<span class="badge badge-green">${m.goals}</span>` : '—'}</td>
          <td>${m.assists > 0 ? `<span class="badge">${m.assists}</span>` : '—'}</td>
          <td>${m.yellowCards > 0 ? `<span class="badge badge-yellow">${m.yellowCards}</span>` : '—'}</td>
          <td>${m.redCards > 0 ? `<span class="badge badge-red">${m.redCards}</span>` : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : '<div class="empty-state">Inga matcher hittades</div>'}
  `;
}

async function loadOyuncuStats() {
  // Lig listesi boşsa önce yükle
  const ligEl = document.getElementById('oyuncuLeagueFilterItems');
  if (ligEl && ligEl.children.length === 0) {
    await loadOyuncuLeagueFilters();
    initMultiDropdown('oyuncuLeagueBtn', 'oyuncuLeagueList');
  }
  setStatus('Laddar statistik...');
  try {
    const from = document.getElementById('oyuncuFrom').value;
    const to = document.getElementById('oyuncuTo').value;
    const type = document.getElementById('oyuncuType')?.value || 'hepsi';
    const params = new URLSearchParams({action:'mystats'});
    if (from) params.append('dateFrom', from);
    if (to) params.append('dateTo', to);
    const selLeagues = [...document.querySelectorAll('.oyuncu-league-filter:checked')].map(c=>c.value);
    if (selLeagues.length > 0) params.append('leagueNames', selLeagues.join('|'));
    const r = await fetch('/api/stats?' + params, {headers: authHeaders()});
    const d = await r.json();
    setStatus('', false);
    document.getElementById('oyuncuStatsTable').innerHTML = renderMyStats(d);
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
}

async function loadOyuncuMatches() {
  setStatus('Hämtar matcher...');
  try {
    const from = document.getElementById('oyuncuMatchFrom').value;
    const to = document.getElementById('oyuncuMatchTo').value;
    const type = document.getElementById('oyuncuMatchType').value;
    const params = new URLSearchParams({action:'savedmatches'});
    if (type && type !== 'hepsi') params.append('gameType', type);
    if (from) params.append('dateFrom', from);
    if (to) params.append('dateTo', to);
    const r = await fetch('/api/admin?' + params, {headers: authHeaders()});
    const matches = await r.json();
    setStatus('', false);
    const el = document.getElementById('oyuncuMatchList');
    if (!Array.isArray(matches) || !matches.length) {
      el.innerHTML = '<div class="empty-state">Inga matcher hittades</div>';
      return;
    }
    el.innerHTML = matches
      .filter(m => {
        if (type && type !== 'hepsi' && m.game_type !== type) return false;
        if (from && new Date(m.game_date) < new Date(from)) return false;
        if (to && new Date(m.game_date) > new Date(to + 'T23:59:59')) return false;
        return true;
      })
      .map(m => {
        const d = new Date(m.game_date);
        const dateStr = d.toLocaleDateString('sv-SE', {day:'2-digit',month:'short',year:'numeric'});
        const typeClass = 'type-' + (m.game_type || 'lig');
        return `<div class="match-card">
          <div>
            <div class="match-score">${m.home_score} - ${m.away_score}</div>
            <div class="match-meta">${dateStr}</div>
          </div>
          <div class="match-teams">
            <div class="home">${m.home_team}</div>
            <div class="away">${m.away_team}</div>
            <div style="margin-top:0.3rem;">
              <span class="match-type-badge ${typeClass}">${m.league_name}</span>
            </div>
          </div>
        </div>`;
      }).join('');
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
}

