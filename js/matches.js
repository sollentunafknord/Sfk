// ===================== MAÇ FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: authHeaders(), state, setStatus(), setError(), SFK_PLAYERS (index.html/auth-app.js'de tanımlı)
// =============================================================

async function fetchMatches() {
  const btn = document.getElementById('fetchMatchesBtn');
  btn.disabled = true;
  setError(null);
  setStatus('Hämtar matcher från MinFotboll...');
  try {
    const from = document.getElementById('adminFrom').value;
    const to   = document.getElementById('adminTo').value;
    const type = document.getElementById('adminType').value;
    const teamFilter = document.getElementById('adminTeam')?.value || '';
    const params = new URLSearchParams({action:'fetchmatches', gameType:type});
    if (from) params.append('dateFrom', from);
    if (to)   params.append('dateTo', to);

    const [matchesRes, savedRes] = await Promise.all([
      fetch('/api/admin?' + params, {headers: authHeaders()}),
      fetch('/api/admin?action=savedmatches', {headers: authHeaders()})
    ]);
    const matches = await matchesRes.json();
    const saved = await savedRes.json();

    state.savedMatchIds = new Set(Array.isArray(saved) ? saved.map(m => m.game_id) : []);

    // MinFotboll'da olmayan ama DB'de olan maçları bul (manuel eklenenler)
    const fetchedIds = new Set(matches.map(m => m.gameId));
    const manualMatches = Array.isArray(saved) ? saved.filter(m => !fetchedIds.has(m.game_id)) : [];

    // Manuel maçları fetchmatches formatına çevir
    const sfkLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sollentuna_FK_logo_%282022%29.svg/960px-Sollentuna_FK_logo_%282022%29.svg.png';
    const manualFormatted = manualMatches.map(m => {
      const isHome = m.home_team?.includes('Sollentuna');
      const opponentName = isHome ? m.away_team : m.home_team;
      // Aynı rakiple önceki maçtan logo bul
      const prevMatch = matches.find(pm => 
        pm.homeTeam === opponentName || pm.awayTeam === opponentName
      );
      const opponentLogo = prevMatch ? (prevMatch.homeTeam === opponentName ? prevMatch.homeLogo : prevMatch.awayLogo) : null;
      return {
        gameId: m.game_id,
        gameDate: m.game_date,
        homeTeam: m.home_team,
        awayTeam: m.away_team,
        homeScore: m.home_score,
        awayScore: m.away_score,
        leagueName: m.league_name,
        gameType: m.game_type,
        homeTeamId: isHome ? 398871 : 0,
        homeLogo: isHome ? sfkLogo : opponentLogo,
        awayLogo: isHome ? opponentLogo : sfkLogo,
        isManual: true,
      };
    });

    // Tüm maçları birleştir ve tarihe göre sırala
    let allMatches = [...matches, ...manualFormatted].sort((a,b) => new Date(b.gameDate) - new Date(a.gameDate));

    // Takım filtresi uygula
    if (teamFilter) {
      allMatches = allMatches.filter(function(m) {
        return m.teamId === parseInt(teamFilter) ||
               m.homeTeamId === parseInt(teamFilter) ||
               m.awayTeamId === parseInt(teamFilter);
      });
    }

    setStatus('', false);
    renderMatchList(allMatches);
    document.getElementById('matchCountBadge').textContent = '(' + allMatches.length + ' matcher)';
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
  btn.disabled = false;
}

function renderMatchList(matches) {
  const el = document.getElementById('matchList');
  if (!matches.length) { el.innerHTML = '<div class="empty-state">Inga matcher hittades</div>'; return; }
  el.innerHTML = matches.map(m => {
    const isSaved = state.savedMatchIds.has(m.gameId);
    const d = new Date(m.gameDate);
    const dateStr = d.toLocaleDateString('sv-SE', {day:'2-digit',month:'short',year:'numeric'});
    const typeClass = 'type-' + m.gameType;
    const SFK_IDS = [398871, 74782, 512525, 68503, 201387, 457347, 402766, 511901];
    const isHome = m.teamId ? (m.homeTeamId === m.teamId) : SFK_IDS.includes(m.homeTeamId);
    const sfkLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sollentuna_FK_logo_%282022%29.svg/960px-Sollentuna_FK_logo_%282022%29.svg.png';
    const opponentLogo = isHome ? m.awayLogo : m.homeLogo;
    const opponentName = isHome ? m.awayTeam : m.homeTeam;
    const sfkScore = isHome ? m.homeScore : m.awayScore;
    const oppScore = isHome ? m.awayScore : m.homeScore;
    const logoStyle = 'width:36px;height:36px;object-fit:contain;border-radius:4px;';

    return `<div class="match-card ${isSaved ? 'saved' : ''}" onclick="loadMatchDetail(${JSON.stringify(m).replace(/"/g,'&quot;')})">
      <div style="display:flex;align-items:center;gap:0.5rem;min-width:120px;">
        ${isHome 
          ? `<img src="${sfkLogo}" style="${logoStyle}" onerror="this.style.display='none'">
             <div style="text-align:center;">
               <div class="match-score">${sfkScore} - ${oppScore}</div>
               <div class="match-meta">${dateStr}</div>
             </div>
             <img src="${opponentLogo}" style="${logoStyle}" onerror="this.style.display='none'">`
          : `<img src="${opponentLogo}" style="${logoStyle}" onerror="this.style.display='none'">
             <div style="text-align:center;">
               <div class="match-score">${oppScore} - ${sfkScore}</div>
               <div class="match-meta">${dateStr}</div>
             </div>
             <img src="${sfkLogo}" style="${logoStyle}" onerror="this.style.display='none'">`
        }
      </div>
      <div class="match-teams">
        <div class="home">${m.homeTeam}</div>
        <div class="away">${m.awayTeam}</div>
        <div style="margin-top:0.3rem;display:flex;gap:0.4rem;align-items:center;">
          <span class="match-type-badge ${typeClass}">${m.leagueName}</span>
          ${isSaved ? '<span class="match-saved-badge">✓ Sparad</span>' : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

async function loadMatchDetail(match, reporterId = null) {
  state.selectedMatch = match;
  document.querySelectorAll('.match-card').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');

  setStatus('Hämtar matchdetaljer...');
  document.getElementById('matchDetail').innerHTML = '<div class="empty-state">Laddar...</div>';

  try {
    const reporterParam = reporterId ? `&reporterId=${reporterId}` : '';
    const r = await fetch(`/api/admin?action=matchdetail&gameId=${match.gameId}&teamId=${match.teamId}${reporterParam}`, {headers: authHeaders()});
    const text = await r.text();
    let detail;
    try {
      detail = JSON.parse(text);
    } catch(e) {
      console.error('matchdetail raw response:', text.slice(0, 300));
      setError('Serverfel: ' + text.slice(0, 120));
      setStatus('', false);
      return;
    }
    if (!r.ok) { setError(detail.error || 'Serverfel ' + r.status); setStatus('', false); return; }
    setStatus('', false);
    renderMatchDetail(detail);
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
}

function renderMatchDetail(detail) {
  const isSaved = state.savedMatchIds.has(detail.gameId);
  const d = new Date(detail.gameDate);
  const dateStr = d.toLocaleDateString('sv-SE', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const playedCount = detail.players.length;

  const rows = detail.players.map((p,i) => `
    <tr id="prow_${i}" style="${p.selected ? '' : 'opacity:0.4;'}">
      <td style="text-align:center;">
        <input type="checkbox" ${p.selected ? 'checked' : ''} 
          onchange="togglePlayerRow(${i}, this.checked)" 
          style="cursor:pointer;width:16px;height:16px;">
      </td>
      <td><span class="shirt-no">#${p.shirt}</span></td>
      <td class="player-name">${p.name}</td>
      <td>
        ${p.isStarter ? '<span style="font-size:0.72rem;background:rgba(0,230,118,0.15);color:var(--green);border-radius:4px;padding:1px 5px;">11</span>' : 
          '<span style="font-size:0.72rem;background:rgba(107,114,128,0.1);color:var(--muted);border-radius:4px;padding:1px 5px;">Bänk</span>'}
      </td>
      <td>
        <input type="number" value="${p.minutesPlayed || 0}" min="0" max="120"
          style="width:50px;background:var(--surface2);border:1px solid var(--border);color:var(--accent);border-radius:4px;padding:2px 6px;text-align:center;"
          onchange="updatePlayerDetail(${i}, 'minutesPlayed', +this.value)"
          title="Minuter spelade">
      </td>
      <td><input type="number" value="${p.goals}" min="0" max="20" 
        style="width:50px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:2px 6px;text-align:center;" 
        onchange="updatePlayerDetail(${i}, 'goals', +this.value)"></td>
      <td><input type="number" value="${p.assists}" min="0" max="20" 
        style="width:50px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:2px 6px;text-align:center;" 
        onchange="updatePlayerDetail(${i}, 'assists', +this.value)"></td>
      <td><input type="number" value="${p.yellowCards}" min="0" max="3" 
        style="width:50px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:2px 6px;text-align:center;" 
        onchange="updatePlayerDetail(${i}, 'yellowCards', +this.value)"></td>
      <td><input type="number" value="${p.redCards}" min="0" max="2" 
        style="width:50px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:2px 6px;text-align:center;" 
        onchange="updatePlayerDetail(${i}, 'redCards', +this.value)"></td>
    </tr>
  `).join('');

  // Rapportör seçim paneli
  const reportersHtml = detail.reporters && detail.reporters.length > 1 ? `
    <div style="background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.25);border-radius:10px;padding:1rem;margin-bottom:1rem;">
      <div style="color:var(--accent);font-weight:700;margin-bottom:0.75rem;">
        👥 ${detail.reporters.length} rapportör bulundu — Hangisinin verilerini kullanayım?
      </div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button onclick="loadMatchDetail(state.selectedMatch, null)"
          style="padding:0.4rem 0.9rem;border-radius:6px;cursor:pointer;font-size:0.85rem;
          border:1px solid ${!detail.selectedReporterId ? 'var(--accent)' : 'var(--border)'};
          background:${!detail.selectedReporterId ? 'rgba(0,212,255,0.15)' : 'var(--surface2)'};
          color:${!detail.selectedReporterId ? 'var(--accent)' : 'var(--text)'};">
          Alla (duplicat-risk)
        </button>
        ${detail.reporters.map(rep => `
          <button onclick="loadMatchDetail(state.selectedMatch, ${rep.memberId})"
            style="padding:0.4rem 0.9rem;border-radius:6px;cursor:pointer;font-size:0.85rem;
            border:1px solid ${detail.selectedReporterId === rep.memberId ? 'var(--green)' : 'var(--border)'};
            background:${detail.selectedReporterId === rep.memberId ? 'rgba(0,230,118,0.15)' : 'var(--surface2)'};
            color:${detail.selectedReporterId === rep.memberId ? 'var(--green)' : 'var(--text)'};">
            ✓ ${rep.name} (${rep.eventCount} händelser)
          </button>
        `).join('')}
      </div>
    </div>
  ` : '';

  // Belirsiz olaylar paneli
  const ambiguousHtml = detail.ambiguous && detail.ambiguous.length > 0 ? `
    <div style="background:rgba(255,214,0,0.08);border:1px solid rgba(255,214,0,0.3);border-radius:10px;padding:1rem;margin-bottom:1rem;">
      <div style="color:var(--yellow);font-weight:700;margin-bottom:0.75rem;">
        ⚠️ ${detail.ambiguous.length} oklara händelser — Välj rätt spelare
      </div>
      ${detail.ambiguous.map((a,i) => `
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem;flex-wrap:wrap;">
          <span style="background:var(--surface2);border-radius:4px;padding:0.2rem 0.5rem;font-size:0.8rem;">
            ${a.type === 'unknownPlayer' ? '👤 Okänd spelare i trupp' : a.minute + ' ' + (a.type === 'goal' ? '⚽ Mål' : a.type === 'assist' ? '🎯 Assist' : a.type === 'yellowCard' ? '🟨 Gult kort' : '🟥 Rött kort')}
          </span>
          <span style="color:var(--muted);font-size:0.85rem;">"${a.rawName}"</span>
          <select onchange="resolveAmbiguous(${i}, +this.value)" 
            style="background:var(--surface2);border:1px solid var(--yellow);color:var(--text);padding:0.3rem 0.6rem;border-radius:6px;font-size:0.85rem;flex:1;min-width:180px;">
            <option value="-1" selected>Inte vår spelare — ignorera</option>
            <option value="">— Välj spelare —</option>
            ${Object.keys(SFK_PLAYERS).map(pid => 
              `<option value="${pid}">#${SFK_PLAYERS[pid].shirt} ${SFK_PLAYERS[pid].name}</option>`
            ).join('')}
          </select>
        </div>
      `).join('')}
    </div>
  ` : '';

  document.getElementById('matchDetail').innerHTML = `
    <div class="detail-panel">
      ${reportersHtml}
      ${ambiguousHtml}
      <div class="detail-header">
        <div>
          <div class="detail-teams">${detail.homeTeam} vs ${detail.awayTeam}</div>
          <div class="detail-score">${detail.homeScore} - ${detail.awayScore}</div>
          <div class="detail-meta">${dateStr} · ${detail.leagueName}</div>
          <div style="margin-top:0.4rem;color:var(--green);font-size:0.85rem;">
            ✓ ${playedCount} SFK-spelare spelade i denna match
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem;align-items:flex-end;">
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <label style="font-size:0.82rem;color:var(--muted);">Matchtid (min):</label>
            <input type="number" id="gameDuration" value="90" min="10" max="120" 
              style="width:60px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:0.3rem 0.5rem;text-align:center;">
          </div>
          <button class="btn btn-success" onclick="saveMatch()">
            ${isSaved ? '✓ Uppdatera' : '💾 Spara match'}
          </button>
          <button class="btn" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);font-size:0.82rem;" onclick="openManualEntry()">
            ✏️ Manuell inmatning
          </button>
          <div style="font-size:0.75rem;color:var(--muted);">
            Ospärade spelare sparas inte
          </div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th title="Inkludera">✓</th>
            <th>#</th><th>Spelare</th>
            <th title="Roll">Roll</th>
            <th title="Minuter spelade">⏱ Min</th>
            <th style="color:var(--green)">⚽ Mål</th>
            <th style="color:var(--accent)">🎯 Ast</th>
            <th style="color:var(--yellow)">🟨 Gult</th>
            <th style="color:var(--red)">🟥 Rött</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  state.currentDetail = detail;
}

function openManualEntry() {
  const teamId = state.currentDetail?.teamId || null;
  const gameId = state.currentDetail?.gameId || null;
  const gameInfo = state.currentDetail ? 
    `${state.currentDetail.homeTeam} vs ${state.currentDetail.awayTeam} (${state.currentDetail.homeScore}-${state.currentDetail.awayScore})` : '';

  // Takımın oyuncularını bul — sadece ilgili takım
  const teamName = Object.values(SFK_PLAYERS).find(p => p.team && state.currentDetail?.homeTeam?.includes(p.team))?.team
    || Object.values(SFK_PLAYERS).find(p => p.team && state.currentDetail?.awayTeam?.includes(p.team))?.team
    || null;

  const teamPlayers = Object.entries(SFK_PLAYERS)
    .filter(([id, p]) => !teamName || p.team === teamName)
    .sort((a, b) => (a[1].shirt || 0) - (b[1].shirt || 0));

  // Diğer oyuncular (başka takımlardan eklenebilir)
  const otherPlayers = Object.entries(SFK_PLAYERS)
    .filter(([id, p]) => teamName && p.team !== teamName)
    .sort((a, b) => (a[1].shirt || 0) - (b[1].shirt || 0));

  // Modal oluştur
  let modal = document.getElementById('manualEntryModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'manualEntryModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:9999;overflow-y:auto;display:flex;justify-content:center;padding:2rem 1rem;';
    document.body.appendChild(modal);
  }

  const rows = teamPlayers.map(([id, p]) => `
    <tr id="mrow_${id}">
      <td><input type="checkbox" class="m-check" data-id="${id}" checked style="width:16px;height:16px;accent-color:var(--accent);"></td>
      <td style="color:var(--muted);">#${p.shirt||'—'}</td>
      <td style="font-weight:500;">${p.name}</td>
      <td>
        <select class="m-role" data-id="${id}" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.2rem 0.4rem;border-radius:4px;font-size:0.8rem;">
          <option value="11">11</option>
          <option value="bank">Bänk</option>
        </select>
      </td>
      <td><input type="number" class="m-min" data-id="${id}" value="90" min="0" max="120" style="width:55px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
      <td><input type="number" class="m-goals" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--green);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
      <td><input type="number" class="m-assists" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--accent);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
      <td><input type="number" class="m-yellow" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--yellow);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
      <td><input type="number" class="m-red" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--red);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
    </tr>
  `).join('');

  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:100%;max-width:900px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <div>
          <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;font-weight:700;">✏️ Manuell inmatning</div>
          <div style="font-size:0.82rem;color:var(--muted);margin-top:0.2rem;">${gameInfo}</div>
        </div>
        <button onclick="document.getElementById('manualEntryModal').remove()" class="btn" style="background:var(--surface2);border:1px solid var(--border);">✕ Stäng</button>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="font-size:0.78rem;color:var(--muted);border-bottom:1px solid var(--border);">
              <th style="padding:0.4rem;text-align:left;">✓</th>
              <th style="padding:0.4rem;text-align:left;">#</th>
              <th style="padding:0.4rem;text-align:left;">Spelare</th>
              <th style="padding:0.4rem;">Roll</th>
              <th style="padding:0.4rem;">⏱ Min</th>
              <th style="padding:0.4rem;color:var(--green);">⚽ Mål</th>
              <th style="padding:0.4rem;color:var(--accent);">🎯 Ast</th>
              <th style="padding:0.4rem;color:var(--yellow);">🟨 Gult</th>
              <th style="padding:0.4rem;color:var(--red);">🟥 Rött</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="margin-top:0.75rem;">
        <button onclick="toggleExtraPlayers()" class="btn" style="background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:0.78rem;">
          ➕ Lägg till spelare från andra lag
        </button>
        <div id="extraPlayersSection" style="display:none;margin-top:0.5rem;max-height:200px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:0.5rem;">
          ${otherPlayers.map(([id, p]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0.5rem;font-size:0.82rem;">
              <span>#${p.shirt||'—'} ${p.name} <span style="color:var(--muted);font-size:0.72rem;">${p.team}</span></span>
              <button onclick="addExtraPlayer(${id})" class="btn" style="padding:0.2rem 0.6rem;font-size:0.75rem;background:var(--surface2);border:1px solid var(--border);">+ Lägg till</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:0.75rem;">
        <button onclick="applyManualEntry()" class="btn btn-success" style="flex:1;">💾 Tillämpa och spara</button>
        <button onclick="document.getElementById('manualEntryModal').remove()" class="btn" style="background:var(--surface2);border:1px solid var(--border);">Avbryt</button>
      </div>
    </div>
  `;
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
}

function toggleExtraPlayers() {
  const el = document.getElementById('extraPlayersSection');
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function addExtraPlayer(playerId) {
  const id = parseInt(playerId);
  const info = SFK_PLAYERS[id];
  if (!info) return;
  // Zaten tabloda var mı?
  if (document.querySelector(`.m-check[data-id="${id}"]`)) return;
  const tbody = document.querySelector('#manualEntryModal tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = `mrow_${id}`;
  tr.innerHTML = `
    <td><input type="checkbox" class="m-check" data-id="${id}" checked style="width:16px;height:16px;accent-color:var(--accent);"></td>
    <td style="color:var(--muted);">#${info.shirt||'—'}</td>
    <td style="font-weight:500;">${info.name} <span style="font-size:0.7rem;color:var(--muted);">(${info.team})</span></td>
    <td><select class="m-role" data-id="${id}" style="background:var(--bg);border:1px solid var(--border);color:var(--text);padding:0.2rem 0.4rem;border-radius:4px;font-size:0.8rem;"><option value="11">11</option><option value="bank">Bänk</option></select></td>
    <td><input type="number" class="m-min" data-id="${id}" value="90" min="0" max="120" style="width:55px;background:var(--bg);border:1px solid var(--border);color:var(--text);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
    <td><input type="number" class="m-goals" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--green);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
    <td><input type="number" class="m-assists" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--accent);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
    <td><input type="number" class="m-yellow" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--yellow);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
    <td><input type="number" class="m-red" data-id="${id}" value="0" min="0" style="width:45px;background:var(--bg);border:1px solid var(--border);color:var(--red);border-radius:4px;padding:0.2rem 0.4rem;text-align:center;"></td>
  `;
  tbody.appendChild(tr);
}

function applyManualEntry() {
  const modal = document.getElementById('manualEntryModal');
  if (!modal) return;

  const players = [];
  modal.querySelectorAll('.m-check').forEach(cb => {
    const id = parseInt(cb.dataset.id);
    const included = cb.checked;
    const role = modal.querySelector(`.m-role[data-id="${id}"]`)?.value;
    const min = parseInt(modal.querySelector(`.m-min[data-id="${id}"]`)?.value) || 0;
    const goals = parseInt(modal.querySelector(`.m-goals[data-id="${id}"]`)?.value) || 0;
    const assists = parseInt(modal.querySelector(`.m-assists[data-id="${id}"]`)?.value) || 0;
    const yellow = parseInt(modal.querySelector(`.m-yellow[data-id="${id}"]`)?.value) || 0;
    const red = parseInt(modal.querySelector(`.m-red[data-id="${id}"]`)?.value) || 0;
    const info = SFK_PLAYERS[id];
    if (!info) return;
    players.push({
      playerId: id,
      name: info.name,
      shirt: info.shirt,
      role: role === '11' ? 'starter' : 'substitute',
      isStarter: role === '11',
      minutesPlayed: min,
      goals, assists,
      yellowCards: yellow,
      redCards: red,
      included,
    });
  });

  // state.currentDetail.players'ı güncelle
  if (!state.currentDetail) return;
  state.currentDetail.players = players;
  
  modal.remove();
  
  // Maçı kaydet
  saveMatch();
}

function resolveAmbiguous(ambigIdx, playerId) {
  if (!state.currentDetail || !state.currentDetail.ambiguous) return;
  const a = state.currentDetail.ambiguous[ambigIdx];
  if (!playerId || playerId === -1) return; // ignorera
  
  const pid = parseInt(playerId);
  let playerIdx = state.currentDetail.players.findIndex(p => p.playerId === pid);
  
  // Oyuncu listede yoksa ekle (unknownPlayer durumu)
  if (playerIdx === -1) {
    const playerInfo = SFK_PLAYERS[pid];
    if (!playerInfo) return;
    const newPlayer = {
      playerId: pid,
      name: playerInfo.name,
      shirt: playerInfo.shirt,
      thumbnail: null,
      isStarter: false,
      isInSquad: true,
      playedInMatch: true,
      played: true,
      selected: true,
      minutesPlayed: a.type === 'unknownPlayer' ? 0 : 0,
      goals: 0, assists: 0, yellowCards: 0, redCards: 0,
    };
    state.currentDetail.players.push(newPlayer);
    playerIdx = state.currentDetail.players.length - 1;
  }
  
  if (a.type === 'goal') {
    state.currentDetail.players[playerIdx].goals++;
    // Input'u güncelle
    const inputs = document.querySelectorAll(`#prow_${playerIdx} input[type=number]`);
    if (inputs[0]) inputs[0].value = state.currentDetail.players[playerIdx].goals;
  } else if (a.type === 'assist') {
    state.currentDetail.players[playerIdx].assists++;
    const inputs = document.querySelectorAll(`#prow_${playerIdx} input[type=number]`);
    if (inputs[1]) inputs[1].value = state.currentDetail.players[playerIdx].assists;
  } else if (a.type === 'yellowCard') {
    state.currentDetail.players[playerIdx].yellowCards++;
    const inputs = document.querySelectorAll(`#prow_${playerIdx} input[type=number]`);
    if (inputs[2]) inputs[2].value = state.currentDetail.players[playerIdx].yellowCards;
  } else if (a.type === 'redCard') {
    state.currentDetail.players[playerIdx].redCards++;
    const inputs = document.querySelectorAll(`#prow_${playerIdx} input[type=number]`);
    if (inputs[3]) inputs[3].value = state.currentDetail.players[playerIdx].redCards;
  }
  
  // Çözülen olayı işaretle
  const select = document.querySelectorAll('[onchange*="resolveAmbiguous"]')[ambigIdx];
  if (select) {
    select.style.borderColor = 'var(--green)';
    select.disabled = true;
    const label = select.parentElement.querySelector('span:first-child');
    if (label) label.style.textDecoration = 'line-through';
  }
}

function togglePlayerRow(idx, selected) {
  if (state.currentDetail && state.currentDetail.players[idx]) {
    state.currentDetail.players[idx].selected = selected;
    const row = document.getElementById('prow_' + idx);
    if (row) row.style.opacity = selected ? '1' : '0.4';
  }
}

function updatePlayerDetail(idx, field, value) {
  if (state.currentDetail && state.currentDetail.players[idx]) {
    state.currentDetail.players[idx][field] = value;
  }
}

async function saveMatch() {
  if (!state.currentDetail) return;

  // Çözülmemiş oklara händelser var mı kontrol et (boş seçim kaldı mı)
  const selects = document.querySelectorAll('[onchange*="resolveAmbiguous"]');
  let unresolved = 0;
  selects.forEach(s => {
    if (!s.disabled && s.value === '') unresolved++;
  });
  if (unresolved > 0) {
    alert(`${unresolved} oklara händelse(r) har inte lösts. Välj spelare eller ignorera för alla händelser innan du sparar.`);
    return;
  }
  setStatus('Sparar match...');
  try {
    // Sadece seçili oyuncuları gönder
    const gameDuration = parseInt(document.getElementById('gameDuration')?.value) || 90;
    const payload = {
      ...state.currentDetail,
      gameDuration,
      players: state.currentDetail.players.filter(p => p.selected).map(p => ({
        ...p,
        minutesPlayed: p.minutesPlayed || 0
      }))
    };
    if (payload.players.length === 0) {
      setError('Ingen spelare vald!');
      setStatus('', false);
      return;
    }
    const r = await fetch('/api/admin?action=savematch', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    const d = await r.json();
    if (!r.ok) { setError(d.error); setStatus('',false); return; }
    state.savedMatchIds.add(state.currentDetail.gameId);
    setStatus('', false);
    setError(null);
    // Yeşil bildirim
    const btn = document.querySelector('#matchDetail .btn-success');
    if (btn) { btn.textContent = '✓ Sparad!'; setTimeout(() => btn.textContent = '✓ Uppdatera', 2000); }
    // Match listesini güncelle
    fetchMatches();
  } catch(e) {
    setError('Fel: ' + e.message);
    setStatus('', false);
  }
}
