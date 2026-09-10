// ===================== MOTSTÅNDARSPELARE (Dashboard) =====================
// Akış: "Vårt lag" seç → o takımın son 5 + gelecek 5 maçı → bir maça tıkla →
// rakip takımın kadrosu (namn, födelseår, GP per säsong).
// Kaynak: /api/admin?action=teammatches|opponentsquad|opponentplayer (MinFotboll).
//
// Doğum yılı MinFotboll'da oyuncu başına ayrı ve yavaş bir sorgu; backend
// opponent_players tablosunda cache'liyor, burada oyuncular 3'erli paralel
// doldurulup tablo ilerledikçe güncelleniyor.
// Bağımlılıklar: authHeaders() (auth-app.js), window._activeTeamsCache (stats-load.js)
// ========================================================================

let _oppMatches = null;        // { teamId, played: [], upcoming: [], failed }
let _oppSquad = null;          // { teamId, teamName, logo, gameLabel, players: [] }
let _oppExpanded = new Set();  // açık olan oyuncu satırları (playerId)
let _oppLoadToken = 0;         // seçim değişince eski istekleri yoksaymak için

function oppEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function oppDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('sv-SE', {day:'2-digit', month:'short', year:'numeric'});
}

// "Vårt lag" listesini stats-load.js'in doldurduğu cache'ten kur.
// Cache login'de asenkron doluyor; sekme erken açılırsa birkaç kez tekrar dene.
function fillOpponentTeamSelect(attempt) {
  const sel = document.getElementById('opponentOurTeam');
  if (!sel || sel.dataset.filled) return;
  const teams = window._activeTeamsCache || [];
  if (!teams.length) {
    const n = attempt || 0;
    if (n < 6) setTimeout(() => fillOpponentTeamSelect(n + 1), 800);
    return;
  }
  teams.forEach(t => {
    const o = document.createElement('option');
    o.value = t.team_id;
    o.textContent = t.team_name;
    sel.appendChild(o);
  });
  sel.dataset.filled = '1';
}

async function loadTeamMatches(force) {
  const teamId = document.getElementById('opponentOurTeam')?.value || '';
  const el = document.getElementById('oppMatchList');
  const myToken = ++_oppLoadToken;

  _oppSquad = null;
  document.getElementById('opponentSquad').innerHTML = '<div class="empty-state">Välj en match</div>';

  if (!teamId) {
    _oppMatches = null;
    el.innerHTML = '<div class="empty-state">Välj ett lag för att se matcher</div>';
    return;
  }

  el.innerHTML = '<div class="empty-state">Hämtar matcher...</div>';
  try {
    const r = await fetch('/api/admin?action=teammatches&teamId=' + teamId + (force ? '&refresh=1' : ''),
                          {headers: authHeaders()});
    const data = await r.json();
    if (myToken !== _oppLoadToken) return;
    if (!data || !Array.isArray(data.played)) throw new Error((data && data.error) || 'Kunde inte hämta matcher');
    _oppMatches = data;
    renderTeamMatches();
  } catch(e) {
    if (myToken !== _oppLoadToken) return;
    el.innerHTML = '<div class="empty-state">Fel: ' + oppEsc(e.message) + '</div>';
  }
}

function renderTeamMatches() {
  const el = document.getElementById('oppMatchList');
  if (!_oppMatches) { el.innerHTML = '<div class="empty-state">Välj ett lag för att se matcher</div>'; return; }

  const warn = _oppMatches.failed
    ? `<div style="background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.3);border-radius:8px;padding:0.5rem 0.75rem;margin-bottom:0.6rem;font-size:0.78rem;color:var(--muted);">
         ⚠ ${_oppMatches.failed} serie(r) kunde inte hämtas från MinFotboll — listan kan vara ofullständig.
       </div>`
    : '';

  const card = (m) => {
    const active = _oppSquad && _oppSquad.gameId === m.gameId;
    const score = m.played ? `${m.homeScore}–${m.awayScore}` : (new Date(m.gameDate)).toLocaleTimeString('sv-SE', {hour:'2-digit', minute:'2-digit'});
    return `<div class="match-card ${active ? 'selected' : ''}" onclick="openMatchOpponent(${m.gameId})">
      <div style="font-size:0.75rem;color:var(--muted);min-width:88px;">${oppEsc(oppDate(m.gameDate))}</div>
      <img src="${oppEsc(m.opponentLogo)}" style="width:32px;height:32px;object-fit:contain;border-radius:4px;" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;">${m.isHome ? '' : '<span style="color:var(--muted);font-weight:400;">borta mot </span>'}${oppEsc(m.opponentName)}</div>
        <div style="font-size:0.72rem;color:var(--muted);">${oppEsc(m.leagueName)}</div>
      </div>
      <div class="match-score" style="font-size:1rem;">${oppEsc(score)}</div>
    </div>`;
  };

  const section = (title, list, empty) =>
    `<div class="section-title" style="margin-top:0.5rem;">${title}</div>` +
    (list.length ? list.map(card).join('') : `<div class="empty-state">${empty}</div>`);

  el.innerHTML = warn +
    section('Kommande 5', _oppMatches.upcoming, 'Inga kommande matcher') +
    section('Senaste 5', _oppMatches.played, 'Inga spelade matcher');
}

async function openMatchOpponent(gameId) {
  if (!_oppMatches) return;
  const m = [..._oppMatches.upcoming, ..._oppMatches.played].find(x => x.gameId === gameId);
  if (!m) return;

  const myToken = ++_oppLoadToken;
  _oppExpanded = new Set();
  _oppSquad = {
    gameId, teamId: m.opponentTeamId, teamName: m.opponentName,
    logo: m.opponentLogo, gameLabel: oppDate(m.gameDate) + ' · ' + m.leagueName,
    players: [],
  };
  renderTeamMatches();

  const el = document.getElementById('opponentSquad');
  el.innerHTML = '<div class="empty-state">Hämtar trupp...</div>';

  try {
    const r = await fetch('/api/admin?action=opponentsquad&teamId=' + m.opponentTeamId, {headers: authHeaders()});
    const data = await r.json();
    if (myToken !== _oppLoadToken) return;
    if (!data.players) throw new Error(data.error || 'Kunde inte hämta trupp');
    _oppSquad.players = data.players;
    renderOpponentSquad();
    fillOpponentPlayers(myToken, false);
  } catch(e) {
    if (myToken !== _oppLoadToken) return;
    el.innerHTML = '<div class="empty-state">Fel: ' + oppEsc(e.message) + '</div>';
  }
}

// Her oyuncu geldiğinde tabloyu baştan çizmek 20 kez innerHTML demek olurdu
// (scroll zıplar). Bunun yerine en fazla ~2.5 çizim/saniye.
let _oppRenderTimer = null;
function renderOpponentSquadSoon() {
  if (_oppRenderTimer) return;
  _oppRenderTimer = setTimeout(() => { _oppRenderTimer = null; renderOpponentSquad(); }, 400);
}

// Eksik oyuncuları 3'erli paralel doldur — MinFotboll tek tek sorguda yavaş.
async function fillOpponentPlayers(myToken, force) {
  if (!_oppSquad) return;
  const teamId = _oppSquad.teamId;
  const todo = _oppSquad.players.filter(p => force || !p.cached);
  if (!todo.length) { renderOpponentSquad(); return; }

  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const p = todo[i++];
      try {
        const url = '/api/admin?action=opponentplayer&teamId=' + teamId +
                    '&playerId=' + p.playerId + '&teamPlayerId=' + (p.teamPlayerId || 0) +
                    (force ? '&refresh=1' : '');
        const r = await fetch(url, {headers: authHeaders()});
        const d = await r.json();
        if (myToken !== _oppLoadToken) return;
        if (!d.error) {
          p.birthYear = d.birthYear;
          p.seasons = d.seasons || [];
          p.cached = true;
        } else {
          p.failed = true;
        }
      } catch(e) {
        p.failed = true;
      }
      if (myToken !== _oppLoadToken) return;
      renderOpponentSquadSoon();
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (myToken !== _oppLoadToken) return;
  clearTimeout(_oppRenderTimer); _oppRenderTimer = null;
  renderOpponentSquad();
}

function refreshOpponentSquad() {
  if (!_oppSquad) return;
  _oppSquad.players.forEach(p => { p.cached = false; p.failed = false; });
  renderOpponentSquad();
  fillOpponentPlayers(_oppLoadToken, true);
}

function renderOpponentSquad() {
  const el = document.getElementById('opponentSquad');
  if (!_oppSquad) { el.innerHTML = '<div class="empty-state">Välj en match</div>'; return; }

  const players = _oppSquad.players;
  const loaded = players.filter(p => p.cached).length;
  const pending = players.length - loaded;
  const thisYear = new Date().getFullYear();

  const head = `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
      <img src="${oppEsc(_oppSquad.logo)}" style="width:40px;height:40px;object-fit:contain;" onerror="this.style.display='none'">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:1.05rem;">${oppEsc(_oppSquad.teamName)}</div>
        <div style="font-size:0.78rem;color:var(--muted);">${oppEsc(_oppSquad.gameLabel)} · ${players.length} spelare${pending ? ' · hämtar ' + pending + ' kvar...' : ''}</div>
      </div>
      <button class="btn btn-secondary" style="font-size:0.8rem;padding:0.35rem 0.8rem;" onclick="refreshOpponentSquad()">↻ Uppdatera</button>
    </div>`;

  if (!players.length) { el.innerHTML = head + '<div class="empty-state">Truppen är inte publicerad i MinFotboll</div>'; return; }

  const rows = players.map(p => {
    const seasons = p.seasons || [];
    const cur = seasons.find(s => String(s.season) === String(thisYear));
    const totalGp = seasons.reduce((n, s) => n + (s.gp || 0), 0);
    const born = p.birthYear ? p.birthYear : (p.cached ? '—' : (p.failed ? '!' : '…'));
    const gpCur = p.cached ? (cur ? cur.gp : 0) : (p.failed ? '!' : '…');
    const gpTot = p.cached ? totalGp : '';
    const open = _oppExpanded.has(p.playerId);

    let detail = '';
    if (open) {
      detail = `<tr><td colspan="6" style="background:var(--surface2);padding:0.75rem 1rem;">${
        seasons.length
          ? seasons.map(s => `<div style="margin-bottom:0.6rem;">
              <div style="font-weight:700;font-size:0.85rem;margin-bottom:0.25rem;">${oppEsc(s.season)} — ${s.gp} matcher, ${s.goals} mål, ${s.assists} assist</div>
              ${s.rows.map(r => `<div style="font-size:0.78rem;color:var(--muted);padding-left:0.75rem;">
                  ${oppEsc(r.competition || r.team)} · GP ${r.gp} · M ${r.goals} · A ${r.assists}${r.yellow ? ' · Gult ' + r.yellow : ''}${r.red ? ' · Rött ' + r.red : ''}
                </div>`).join('')}
            </div>`).join('')
          : '<div style="font-size:0.8rem;color:var(--muted);">Ingen matchstatistik i MinFotboll</div>'
      }</td></tr>`;
    }

    return `<tr style="cursor:pointer;" onclick="toggleOpponentPlayer(${p.playerId})">
        <td style="width:36px;">${oppEsc(p.shirt)}</td>
        <td>${open ? '▾ ' : '▸ '}${oppEsc(p.name)}</td>
        <td style="color:var(--muted);">${oppEsc(p.position)}</td>
        <td>${oppEsc(born)}</td>
        <td style="text-align:center;">${oppEsc(gpCur)}</td>
        <td style="text-align:center;color:var(--muted);">${oppEsc(gpTot)}</td>
      </tr>${detail}`;
  }).join('');

  el.innerHTML = head + `<div class="table-wrap"><table>
      <thead><tr>
        <th>#</th><th>Namn</th><th>Position</th><th>Född</th>
        <th style="text-align:center;">GP ${thisYear}</th>
        <th style="text-align:center;">GP totalt</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="font-size:0.72rem;color:var(--muted);margin-top:0.5rem;">GP = spelade matcher. Klicka på en spelare för säsong för säsong.</div>`;
}

function toggleOpponentPlayer(playerId) {
  if (_oppExpanded.has(playerId)) _oppExpanded.delete(playerId);
  else _oppExpanded.add(playerId);
  renderOpponentSquad();
}
