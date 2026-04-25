// ===================== MYCLUB NÄRVARO =====================

let _myclubActivities = [];

async function loadMyclubActivities() {
  const from = document.getElementById('myclubFrom')?.value || new Date().toISOString().slice(0,10);
  const to   = document.getElementById('myclubTo')?.value   || new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);
  const listEl = document.getElementById('myclubActivityList');
  listEl.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Hämtar aktiviteter...</div>';

  try {
    const r = await fetch('/api/myclub?' + new URLSearchParams({ action: 'activities', from, to }), { headers: authHeaders() });
    const text = await r.text();
    let d;
    try { d = JSON.parse(text); } catch(e) {
      listEl.innerHTML = `<div class="empty-state" style="color:var(--red)">API-fel (ej JSON): ${text.slice(0,120)}</div>`;
      return;
    }
    if (d.error) { listEl.innerHTML = `<div class="empty-state" style="color:var(--red)">Fel: ${d.error}</div>`; return; }
    _myclubActivities = d.activities || [];
    renderMyclubList();
  } catch(e) {
    listEl.innerHTML = `<div class="empty-state" style="color:var(--red)">Fel: ${e.message}</div>`;
  }
}

function renderMyclubList() {
  const listEl = document.getElementById('myclubActivityList');
  const typeFilter = document.getElementById('myclubTypeFilter')?.value || '';
  const acts = _myclubActivities.filter(a => !typeFilter || (a.activity_type_name || a.activity_type || '').toLowerCase().includes(typeFilter.toLowerCase()));

  if (!acts.length) {
    listEl.innerHTML = '<div class="empty-state">Inga aktiviteter hittades</div>';
    return;
  }

  // Gruppera efter dag
  const byDay = {};
  acts.forEach(a => {
    const day = a.day || a.start?.slice(0,10) || '?';
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(a);
  });

  let html = '';
  Object.keys(byDay).sort().forEach(day => {
    const dateLabel = new Date(day + 'T12:00:00').toLocaleDateString('sv-SE', { weekday:'long', day:'numeric', month:'long' });
    html += `<div class="myclub-day-header">${dateLabel}</div>`;
    byDay[day].forEach(a => {
      const invId   = a.invitation_id || a.id;
      const type    = a.activity_type_name || a.activity_type || 'Aktivitet';
      const isBadge = type.toLowerCase().includes('match') ? 'badge-match' : 'badge-training';
      const time    = a.start_time ? a.start_time.slice(0,5) : (a.start ? a.start.slice(11,16) : '');
      const title   = a.title || a.calendar_name || '—';
      const loc     = a.activity_location || a.location || '';
      const team    = a.calendar_name || '';
      html += `
        <div class="myclub-activity-card" onclick="loadMyclubAttendance('${invId}', '${(title).replace(/'/g,"\\'")}')">
          <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.4rem;">
            <span class="match-type-badge ${isBadge}" style="font-size:0.72rem;">${type}</span>
            ${time ? `<span style="font-size:0.85rem;font-weight:600;">${time}</span>` : ''}
            <span style="font-size:0.85rem;flex:1;font-weight:600;">${title}</span>
          </div>
          ${loc  ? `<div style="font-size:0.78rem;color:var(--muted);">📍 ${loc}</div>` : ''}
          ${team ? `<div style="font-size:0.75rem;color:var(--accent);margin-top:0.2rem;">${team}</div>` : ''}
          <div style="font-size:0.78rem;color:var(--muted);margin-top:0.35rem;">
            <span style="color:var(--green);">▶ Klicka för närvaro</span>
          </div>
        </div>`;
    });
  });
  listEl.innerHTML = html;
}

async function loadMyclubAttendance(invId, title) {
  const panel = document.getElementById('myclubAttendancePanel');
  const titleEl = document.getElementById('myclubAttendanceTitle');
  const bodyEl  = document.getElementById('myclubAttendanceBody');
  titleEl.textContent = title || 'Närvaro';
  bodyEl.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto 0.5rem;"></div>Laddar...</div>';
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const r = await fetch('/api/myclub?' + new URLSearchParams({ action: 'attendance', id: invId }), { headers: authHeaders() });
    const d = await r.json();
    if (!r.ok) { bodyEl.innerHTML = `<div style="color:var(--red)">Fel: ${d.error}</div>`; return; }
    renderMyclubAttendance(d);
  } catch(e) {
    bodyEl.innerHTML = `<div style="color:var(--red)">Fel: ${e.message}</div>`;
  }
}

function renderMyclubAttendance(d) {
  const bodyEl = document.getElementById('myclubAttendanceBody');
  const titleEl = document.getElementById('myclubAttendanceTitle');

  const dayStr  = d.day ? new Date(d.day + 'T12:00:00').toLocaleDateString('sv-SE', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '';
  titleEl.textContent = d.title || 'Närvaro';

  const meetInfo = [
    d.meet_up_time  ? `Samling: ${d.meet_up_time}` : null,
    d.meet_up_place ? `${d.meet_up_place}` : null,
    d.location      ? `📍 ${d.location}` : null,
    d.start_time    ? `Avspark: ${d.start_time.slice(0,5)}` : null,
  ].filter(Boolean).join(' · ');

  function statusIcon(s) {
    if (s === 'accepted') return '<span style="color:var(--green);font-size:1rem;">✓</span>';
    if (s === 'denied')   return '<span style="color:var(--red);font-size:1rem;">✗</span>';
    return '<span style="color:var(--yellow);font-size:1rem;">?</span>';
  }
  function statusLabel(s) {
    if (s === 'accepted') return '<span style="color:var(--green);font-size:0.75rem;">Kommer</span>';
    if (s === 'denied')   return '<span style="color:var(--red);font-size:0.75rem;">Kommer ej</span>';
    return '<span style="color:var(--yellow);font-size:0.75rem;">Väntar</span>';
  }

  function buildRows(list) {
    return list.map(m => `
      <tr>
        <td style="font-size:0.88rem;">${m.name}</td>
        <td style="text-align:center;">${statusIcon(m.status)} ${statusLabel(m.status)}</td>
        <td style="font-size:0.78rem;color:var(--muted);">${m.comment || ''}</td>
      </tr>`).join('');
  }

  const accepted = d.players.filter(m => m.status === 'accepted');
  const denied   = d.players.filter(m => m.status === 'denied');
  const waiting  = d.players.filter(m => m.status === 'waiting');

  const sorted = [...accepted, ...waiting, ...denied];

  bodyEl.innerHTML = `
    <div style="margin-bottom:0.75rem;font-size:0.85rem;color:var(--muted);">${dayStr}${meetInfo ? ' · ' + meetInfo : ''}</div>
    <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;">
      <div class="cv-kpi" style="flex:1;min-width:80px;">
        <div class="cv-kpi-val" style="color:var(--green)">${d.accepted}</div>
        <div class="cv-kpi-lbl">Kommer</div>
      </div>
      <div class="cv-kpi" style="flex:1;min-width:80px;">
        <div class="cv-kpi-val" style="color:var(--red)">${d.denied}</div>
        <div class="cv-kpi-lbl">Kommer ej</div>
      </div>
      <div class="cv-kpi" style="flex:1;min-width:80px;">
        <div class="cv-kpi-val" style="color:var(--yellow)">${d.waiting}</div>
        <div class="cv-kpi-lbl">Väntar</div>
      </div>
      <div class="cv-kpi" style="flex:1;min-width:80px;">
        <div class="cv-kpi-val" style="color:var(--text)">${d.total}</div>
        <div class="cv-kpi-lbl">Totalt</div>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Spelare</th>
          <th style="text-align:center;">Status</th>
          <th>Kommentar</th>
        </tr></thead>
        <tbody>${buildRows(sorted)}</tbody>
      </table>
    </div>
    ${d.leaders.length ? `
    <div style="margin-top:1rem;font-size:0.78rem;color:var(--muted);border-top:1px solid var(--border);padding-top:0.75rem;">
      <strong>Ledare:</strong> ${d.leaders.map(l => `${l.name} (${l.status === 'accepted' ? '✓' : l.status === 'denied' ? '✗' : '?'})`).join(', ')}
    </div>` : ''}
  `;
}
