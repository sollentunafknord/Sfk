// ===================== CV FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: authHeaders(), state, SFK_PLAYERS (index.html'de tanımlı)
// ============================================================

async function populateCvPlayerSelect() {
  const sel = document.getElementById('cvPlayerSelect');
  if (!sel || sel.options.length > 1) return;

  let allowedPlayerIds = null;
  if (state.user && state.user.role === 'antrenor') {
    try {
      const r = await fetch('/api/admin?action=getuserteams&userId=' + state.user.id, {headers: authHeaders()});
      const userTeams = await r.json();
      if (Array.isArray(userTeams) && userTeams.length > 0) {
        const teamIds = new Set(userTeams.map(t => t.team_id));
        if (!window._activeRosterCache) {
          const rr = await fetch('/api/admin?action=activeroster', {headers: authHeaders()});
          const roster = await rr.json();
          if (Array.isArray(roster)) window._activeRosterCache = roster;
        }
        const roster = window._activeRosterCache || [];
        allowedPlayerIds = new Set(roster.filter(p => teamIds.has(p.teamId)).map(p => String(p.playerId)));
      }
    } catch(e) {}
  }

  const sorted = Object.entries(SFK_PLAYERS).sort((a,b) => a[1].shirt - b[1].shirt);
  sorted.forEach(([id, p]) => {
    if (allowedPlayerIds && !allowedPlayerIds.has(String(id))) return;
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = `#${p.shirt} ${p.name}`;
    sel.appendChild(opt);
  });
}

async function fetchAndUpdateHighlights(playerId, isOyuncu) {
  const btnId = isOyuncu ? 'oyuncuFetchHighlightsBtn' : 'fetchHighlightsBtn';
  const btn = document.getElementById(btnId);
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Hämtar...'; }
  try {
    const r = await fetch('/api/stats?' + new URLSearchParams({action:'fetchhighlights', playerId}), {headers: authHeaders()});
    const d = await r.json();
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Uppdatera highlights'; }
    if (d.saved > 0) {
      alert('✅ ' + d.saved + ' nya highlights sparade!');
      if (isOyuncu) {
        const el = document.getElementById('oyuncuCvContent');
        if (el) el.dataset.loaded = '';
        loadOyuncuCv();
      } else {
        loadCvForPlayer(playerId);
      }
    } else if (d.skipped > 0) {
      alert('Inga nya highlights — ' + d.skipped + ' redan sparade.');
    } else {
      alert('Inga highlights hittades för denna spelare.');
    }
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = '🔄 Uppdatera highlights'; }
    alert('Fel: ' + e.message);
  }
}

async function loadCvForPlayer(playerId) {
  if (!playerId) return;
  const content = document.getElementById('adminCvContent');
  const printBtn = document.getElementById('cvPrintBtn');
  const wrapEl = document.getElementById('adminCvLeagueFilterWrap');
  if (wrapEl) wrapEl.style.display = 'none';
  content.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Laddar CV...</div>';
  try {
    // CV verisi ve videolar paralel çek
    const [cvRes, vidRes] = await Promise.all([
      fetch('/api/stats?' + new URLSearchParams({action:'playercv', playerId}), {headers: authHeaders()}),
      fetch('/api/stats?' + new URLSearchParams({action:'playervideos', playerId}), {headers: authHeaders()})
    ]);
    const d = await cvRes.json();
    const vd = await vidRes.json();
    d.videos = (vd.videos || []);
    window._lastAdminCvData = d;
    populateCvLeagueFilter(d.matchDetails, 'admin');
    content.innerHTML = renderCv(d);
    if (printBtn) printBtn.style.display = 'inline-block';
    // Highlights güncelleme butonu
    const hlBtn = document.getElementById('fetchHighlightsBtn');
    if (hlBtn) { hlBtn.style.display = 'inline-block'; hlBtn.onclick = function() { fetchAndUpdateHighlights(playerId); }; }
    setTimeout(() => document.querySelectorAll('.cv-season-fill').forEach(el => {
      el.style.width = el.dataset.w;
    }), 50);
  } catch(e) {
    content.innerHTML = '<div class="empty-state">Fel vid laddning: ' + e.message + '</div>';
  }
}

async function loadOyuncuCv() {
  const content = document.getElementById('oyuncuCvContent');
  if (content.dataset.loaded) return;
  const wrapEl = document.getElementById('oyuncuCvLeagueFilterWrap');
  if (wrapEl) wrapEl.style.display = 'none';
  content.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Laddar CV...</div>';
  try {
    const playerId = state.user.player_id;
    if (!playerId) { content.innerHTML = '<div class="empty-state">Ingen spelare kopplad till ditt konto</div>'; return; }
    const [cvRes, vidRes] = await Promise.all([
      fetch('/api/stats?' + new URLSearchParams({action:'playercv', playerId}), {headers: authHeaders()}),
      fetch('/api/stats?' + new URLSearchParams({action:'playervideos', playerId}), {headers: authHeaders()})
    ]);
    const d = await cvRes.json();
    const vd = await vidRes.json();
    if (d.error) { content.innerHTML = '<div class="empty-state">Fel: ' + d.error + '</div>'; return; }
    d.videos = vd.videos || [];
    window._lastOyuncuCvData = d;
    populateCvLeagueFilter(d.matchDetails, 'oyuncu');
    content.innerHTML = renderCv(d);
    content.dataset.loaded = '1';
    // Highlights güncelleme butonu
    const oyuncuHlBtn = document.getElementById('oyuncuFetchHighlightsBtn');
    if (oyuncuHlBtn) {
      oyuncuHlBtn.style.display = 'inline-block';
      oyuncuHlBtn.onclick = function() {
        fetchAndUpdateHighlights(playerId, true);
      };
    }
    setTimeout(() => document.querySelectorAll('.cv-season-fill').forEach(el => {
      el.style.width = el.dataset.w;
    }), 50);
  } catch(e) {
    content.innerHTML = '<div class="empty-state">Fel: ' + e.message + '</div>';
  }
}

function buildSeasonsFromMatches(matches) {
  const seasons = {};
  (matches || []).forEach(m => {
    const year = m.gameDate ? new Date(m.gameDate).getFullYear() : 'Okänt';
    if (!seasons[year]) seasons[year] = {games:0, goals:0, assists:0, minutesPlayed:0, leagueNames: new Set()};
    seasons[year].games++;
    seasons[year].goals += m.goals || 0;
    seasons[year].assists += m.assists || 0;
    seasons[year].minutesPlayed += m.minutesPlayed || 0;
    if (m.leagueName) seasons[year].leagueNames.add(m.leagueName);
  });
  return Object.entries(seasons).sort((a,b) => b[0]-a[0]).map(([year, s]) => ({
    season: year,
    league: [...s.leagueNames].join(', ') || 'Sollentuna FK',
    games: s.games, goals: s.goals, assists: s.assists,
    minutesPlayed: s.minutesPlayed
  }));
}

function renderCv(d, leagueFilter) {
  if (!d || d.error) return '<div class="empty-state">Ingen data hittades</div>';

  let totals = d.totals || d;
  let seasons = d.seasons || [];
  const videos = d.videos || [];

  if (leagueFilter && leagueFilter.length > 0) {
    const fm = (d.matchDetails || []).filter(m => leagueFilter.includes(m.leagueName));
    seasons = buildSeasonsFromMatches(fm);
    totals = { games: 0, starterGames: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
    fm.forEach(m => {
      totals.games++;
      if (m.isStarter) totals.starterGames++;
      totals.minutesPlayed += m.minutesPlayed || 0;
      totals.goals += m.goals || 0;
      totals.assists += m.assists || 0;
      totals.yellowCards += m.yellowCards || 0;
      totals.redCards += m.redCards || 0;
    });
    d = { ...d, matchDetails: fm };
  }
  const sfkLogo = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sollentuna_FK_logo_%282022%29.svg/960px-Sollentuna_FK_logo_%282022%29.svg.png';

  // Sezon grafiği - max gol değeri
  const maxGoals = Math.max(...seasons.map(s => s.goals || 0), 1);

  const seasonBars = seasons.length ? seasons.map(s => {
    const pct = Math.max(Math.round((s.goals / maxGoals) * 100), 4);
    return `
    <div class="cv-season-bar">
      <div class="cv-season-lbl">
        <strong>${s.season}</strong>
        <span style="color:var(--muted);font-size:0.74rem;margin-left:0.4rem;">${s.league || 'SFK'}</span>
      </div>
      <div class="cv-season-track">
        <div class="cv-season-fill" data-w="${pct}%" style="width:0%;background:var(--accent);">
          ${s.goals > 0 ? `${s.goals} mål` : ''}
        </div>
      </div>
      <div class="cv-season-nums">${s.games} M · ${s.goals}G · ${s.assists}A · ${s.minutesPlayed}'</div>
    </div>`;
  }).join('') : '<div style="color:var(--muted);font-size:0.9rem;">Ingen säsongsdata</div>';

  var videosSectionHtml = '';
  if (videos.length) {
    var videosHtml = '<div style="font-size:0.8rem;color:var(--muted);margin-bottom:0.75rem;">' + videos.length + ' höjdpunkter registrerade</div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;align-items:start;">'
      + videos.map(function(v) {
          var infoType = (v.infoText || '').toLowerCase().includes('assist') ? '🎯' : '⚽';
          var leagueBadge = v.leagueName ? '<div style="font-size:0.68rem;background:rgba(0,212,255,0.1);color:var(--accent);border-radius:3px;padding:1px 5px;margin-top:0.2rem;display:inline-block;">' + v.leagueName + '</div>' : '';
          var dateStr = v.dateStr ? '<div style="color:var(--muted);font-size:0.7rem;margin-top:0.1rem;">' + v.dateStr + '</div>' : '';
          var thumb = v.thumbnailUrl
            ? '<img src="' + v.thumbnailUrl + '" style="width:100%;height:90px;object-fit:cover;border-radius:6px 6px 0 0;">'
            : '<div style="width:100%;height:70px;display:flex;align-items:center;justify-content:center;font-size:2rem;background:var(--surface2);border-radius:6px 6px 0 0;">' + infoType + '</div>';
          return '<a href="' + v.url + '" target="_blank" rel="noopener" class="cv-video-link" style="display:flex;flex-direction:column;padding:0;overflow:hidden;border-radius:8px;height:100%;">'
            + thumb
            + '<div style="padding:0.45rem 0.6rem;flex:1;overflow:hidden;">'
              + '<div style="font-weight:600;font-size:0.8rem;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">' + ((v.infoText || 'Höjdpunkt').replace(/M⊙[lI]+/g, 'Mål')) + '</div>'
              + leagueBadge
              + dateStr
              + '<div style="color:var(--muted);font-size:0.7rem;margin-top:0.15rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + (v.label || '') + '</div>'
            + '</div>'
            + '<div style="padding:0.25rem;background:rgba(0,212,255,0.08);text-align:center;font-size:0.7rem;color:var(--accent);">▶ Öppna</div>'
            + '</a>';
        }).join('')
      + '</div>';
    videosSectionHtml = '<div class="cv-section"><div class="cv-section-title">🎥 Videohöjdpunkter</div>' + videosHtml + '</div>';
  }

  // Maç geçmişi (leagueFilter uygulandıysa d.matchDetails zaten filtrelenmiş)
  const matchDetails = d.matchDetails || [];
  function buildMatchRows(matches) {
    return matches.map(function(m) {
      var date = new Date(m.gameDate).toLocaleDateString('sv-SE', {day:'2-digit', month:'short', year:'numeric'});
      var result = m.homeScore + ' - ' + m.awayScore;
      var typeClass = m.gameType ? 'type-' + m.gameType : 'type-lig';
      var starter = m.isStarter
        ? '<span style="font-size:0.72rem;background:rgba(0,230,118,0.15);color:var(--green);border-radius:4px;padding:1px 6px;">Start</span>'
        : '<span style="font-size:0.72rem;background:rgba(107,114,128,0.1);color:var(--muted);border-radius:4px;padding:1px 6px;">Inhopp</span>';
      var minCell = m.minutesPlayed > 0 ? '<span class="badge">' + m.minutesPlayed + "'</span>" : '<span class="badge badge-zero">—</span>';
      var goalCell = m.goals > 0 ? '<span class="badge badge-green">' + m.goals + '</span>' : '—';
      var astCell = m.assists > 0 ? '<span class="badge">' + m.assists + '</span>' : '—';
      var ycCell = m.yellowCards > 0 ? '<span class="badge badge-yellow">' + m.yellowCards + '</span>' : '—';
      var rcCell = m.redCards > 0 ? '<span class="badge badge-red">' + m.redCards + '</span>' : '—';
      return '<tr>'
        + '<td style="color:var(--muted);font-size:0.82rem;white-space:nowrap;">' + date + '</td>'
        + '<td style="font-size:0.85rem;">'
          + '<span style="font-weight:600;">' + m.homeTeam + '</span>'
          + '<span style="color:var(--muted);margin:0 0.3rem;">vs</span>'
          + '<span>' + m.awayTeam + '</span>'
          + '<span style="margin-left:0.4rem;font-weight:700;color:var(--accent);">' + result + '</span>'
        + '</td>'
        + '<td><span class="match-type-badge ' + typeClass + '" style="font-size:0.72rem;">' + (m.leagueName || '—') + '</span></td>'
        + '<td style="text-align:center;">' + starter + '</td>'
        + '<td style="text-align:center;">' + minCell + '</td>'
        + '<td style="text-align:center;">' + goalCell + '</td>'
        + '<td style="text-align:center;">' + astCell + '</td>'
        + '<td style="text-align:center;">' + ycCell + '</td>'
        + '<td style="text-align:center;">' + rcCell + '</td>'
        + '</tr>';
    }).join('');
  }
  var matchHistoryHtml = matchDetails.length
    ? '<div class="table-wrap"><table>'
      + '<thead><tr>'
      + '<th>Datum</th><th>Match</th><th>Liga</th>'
      + '<th style="text-align:center;">Roll</th>'
      + '<th style="text-align:center;">Min</th>'
      + '<th style="text-align:center;color:var(--green)">Mål</th>'
      + '<th style="text-align:center;color:var(--accent)">Ast</th>'
      + '<th style="text-align:center;color:var(--yellow)">🟨</th>'
      + '<th style="text-align:center;color:var(--red)">🟥</th>'
      + '</tr></thead>'
      + '<tbody>' + buildMatchRows(matchDetails) + '</tbody>'
      + '</table></div>'
    : '<div style="color:var(--muted);font-size:0.9rem;padding:0.5rem 0;">Inga matcher registrerade.</div>';

  const goalsPerGame = totals.games > 0 ? (totals.goals / totals.games).toFixed(2) : '—';
  const minPerGoal = totals.goals > 0 ? Math.round((totals.minutesPlayed || 0) / totals.goals) : '—';
  const minPerGame = totals.games > 0 ? Math.round((totals.minutesPlayed || 0) / totals.games) + "'" : '—';

  return `
  <div class="cv-wrapper" id="cvPrintArea">
    <div class="cv-header">
      ${d.thumbnail && !d.thumbnail.includes('default')
        ? `<img src="${d.thumbnail}" class="cv-avatar" onerror="this.style.display='none'">`
        : `<div class="cv-avatar-placeholder">👤</div>`}
      <div style="flex:1;">
        <div class="cv-name">${d.name || '—'}</div>
        <div class="cv-meta">#${d.shirt}${d.position ? ' · ' + d.position : ''}${d.team ? ' · Sollentuna FK ' + d.team : ' · Sollentuna FK'}</div>
        ${d.birthYear ? '<div class="cv-meta" style="font-size:0.8rem;color:var(--muted);margin-top:0.1rem;">Född: ' + d.birthYear + '</div>' : ''}
        <div class="cv-club">
          <img src="${sfkLogo}" onerror="this.style.display='none'">
          <span>SOLLENTUNA FK</span>
        </div>
      </div>
      <div style="text-align:right;color:var(--muted);font-size:0.8rem;">
        <div>📅 ${new Date().toLocaleDateString('sv-SE', {day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">📊 Karriärstatistik</div>
      <div class="cv-kpi-grid">
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--text)">${totals.games || 0}</div><div class="cv-kpi-lbl">Trupp</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--text)">${totals.starterGames || 0}</div><div class="cv-kpi-lbl">Start 11</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--accent)">${totals.minutesPlayed || 0}'</div><div class="cv-kpi-lbl">Tot Minuter</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--green)">${totals.goals || 0}</div><div class="cv-kpi-lbl">Mål</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--accent)">${totals.assists || 0}</div><div class="cv-kpi-lbl">Assist</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--yellow)">${totals.yellowCards || 0}</div><div class="cv-kpi-lbl">Gult kort</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--red)">${totals.redCards || 0}</div><div class="cv-kpi-lbl">Rött kort</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--muted);font-size:1.4rem">${goalsPerGame}</div><div class="cv-kpi-lbl">Mål/Match</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--muted);font-size:1.4rem">${minPerGoal === '—' ? '—' : minPerGoal + "'"}</div><div class="cv-kpi-lbl">Min/Mål</div></div>
        <div class="cv-kpi"><div class="cv-kpi-val" style="color:var(--accent);font-size:1.4rem">${minPerGame}</div><div class="cv-kpi-lbl">Min/Match</div></div>
      </div>
    </div>

    <div class="cv-section">
      <div class="cv-section-title">📈 Säsongsöversikt (Mål)</div>
      ${seasonBars}
    </div>

    <div class="cv-section">
      <div class="cv-section-title">⚽ Matchhistorik</div>
      ${matchHistoryHtml}
    </div>

    ${videosSectionHtml}

    <div class="cv-footer">
      <div>Sollentuna FK · Spelarstatistik</div>
      <div>${new Date().toLocaleDateString('sv-SE')}</div>
    </div>
  </div>`;
}

function populateCvLeagueFilter(matchDetails, prefix) {
  const leagues = [...new Set((matchDetails || []).map(m => m.leagueName).filter(Boolean))].sort();
  const selectEl = document.getElementById(prefix + 'CvLeagueSelect');
  const wrapEl = document.getElementById(prefix + 'CvLeagueFilterWrap');
  if (!selectEl) return;
  if (leagues.length === 0) { if (wrapEl) wrapEl.style.display = 'none'; return; }
  selectEl.innerHTML = '<option value="">Alla ligor</option>' +
    leagues.map(l => `<option value="${l}">${l}</option>`).join('');
  if (wrapEl) wrapEl.style.display = 'block';
}

function getSelectedCvLeagues(prefix) {
  const select = document.getElementById(prefix + 'CvLeagueSelect');
  if (!select || !select.value) return null;
  return [select.value];
}

function applyCvLeagueFilter() {
  if (!window._lastAdminCvData) return;
  const leagues = getSelectedCvLeagues('admin');
  const content = document.getElementById('adminCvContent');
  content.innerHTML = renderCv(window._lastAdminCvData, leagues);
  setTimeout(() => document.querySelectorAll('.cv-season-fill').forEach(el => { el.style.width = el.dataset.w; }), 50);
}

function applyOyuncuCvLeagueFilter() {
  if (!window._lastOyuncuCvData) return;
  const leagues = getSelectedCvLeagues('oyuncu');
  const content = document.getElementById('oyuncuCvContent');
  content.innerHTML = renderCv(window._lastOyuncuCvData, leagues);
  setTimeout(() => document.querySelectorAll('.cv-season-fill').forEach(el => { el.style.width = el.dataset.w; }), 50);
}

function printCv() {
  window.print();
}

// MinFotboll DOM'undan highlight'ları Supabase'e kaydet
// MinFotboll sayfasında Console'da çalıştır: saveHighlightsFromDOM(606521)
async function saveHighlightsFromDOM(playerId) {
  const highlights = [];
  if (typeof ko === 'undefined') { console.error('Bu fonksiyon MinFotboll sayfasında çalıştırılmalı!'); return; }
  document.querySelectorAll('[data-bind]').forEach(el => {
    try {
      const ctx = ko.dataFor(el);
      if (ctx && ctx.Highlight && ctx.Highlight.VideoURL) {
        highlights.push({
          gameId: ctx.Highlight.GameID,
          videoUrl: ctx.Highlight.VideoURL,
          thumbnailUrl: ctx.Highlight.ThumbnailURL || null,
          infoText: ctx.InfoText || null,
          gameTime: ctx.GameTime || null,
          highlightId: ctx.Highlight.HighlightID,
        });
      }
    } catch(e) {}
  });
  const unique = highlights.filter((h, i, arr) => arr.findIndex(x => x.highlightId === h.highlightId) === i);
  console.log('Bulunan highlight sayısı:', unique.length);
  if (!unique.length) { console.error('Highlight bulunamadı!'); return; }

  const r = await fetch('https://sollentuna-fk.vercel.app/api/stats?action=savehighlights', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('sfk_token') },
    body: JSON.stringify({ playerId, highlights: unique })
  });
  const d = await r.json();
  console.log('Sonuç:', d);
}
window.saveHighlightsFromDOM = saveHighlightsFromDOM;
