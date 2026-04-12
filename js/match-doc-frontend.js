// ===================== MAÇ/ANTRENMAN DOKÜMANI =====================
// Tränare, klubbledare ve admin için doküman oluşturma
// =================================================================

var _matchDocData = null; // Mevcut doküman
var _matchDocActivity = null; // Mevcut etkinlik

// ---- Detay panelini aç (checkboxlı) ----
async function openMyClubDetail(idx) {
  var events = window._myClubEvents || [];
  var ev = events[idx];
  if (!ev) return;
  _matchDocActivity = ev;

  var panel = document.getElementById('myClubDetailPanel');
  var title = document.getElementById('myClubDetailTitle');
  var contentEl = document.getElementById('myClubDetailContent');
  if (!panel || !title || !contentEl) return;

  var dateStr = ev.start ? new Date(ev.start).toLocaleDateString('sv-SE', {weekday:'long', day:'numeric', month:'long', hour:'2-digit', minute:'2-digit'}) : '';
  title.textContent = ev.title + ' \u2014 ' + dateStr;
  contentEl.innerHTML = '<div class="empty-state"><div class="spinner" style="margin:0 auto;"></div></div>';
  panel.style.display = 'block';
  panel.scrollIntoView({behavior:'smooth', block:'nearest'});

  try {
    var invId = ev.invitation_id || ev.id;
    var r = await fetch('/api/myclub?action=detail&id=' + invId + '&invitation_id=' + invId, {headers: authHeaders()});
    var d = await r.json();

    if (!d.members || d.members.length === 0) {
      contentEl.innerHTML = '<div class="empty-state">Ingen data</div>';
      return;
    }

    // Ledareler ve oyuncular ayır
    var leaders  = d.members.filter(function(m) { return m.leader; });
    var players  = d.members.filter(function(m) { return !m.leader; });

    var accepted = players.filter(function(m) { return m.status === 'accepted'; });
    var denied   = players.filter(function(m) { return m.status === 'denied'; });
    var waiting  = players.filter(function(m) { return m.status === 'waiting'; });

    function memberCheckbox(m, group) {
      var checked = (group === 'accepted' || group === 'leader') ? 'checked' : '';
      return '<label style="display:flex;align-items:center;gap:0.5rem;padding:0.3rem 0;cursor:pointer;">' +
        '<input type="checkbox" class="doc-member-cb" data-name="' + m.member_name + '" data-group="' + group + '" ' + checked + ' style="width:16px;height:16px;cursor:pointer;accent-color:var(--accent);">' +
        '<span style="font-size:0.9rem;">' + m.member_name + '</span>' +
        (m.comment ? '<span style="color:var(--muted);font-size:0.8rem;"> \u2014 ' + m.comment + '</span>' : '') +
        '</label>';
    }

    contentEl.innerHTML =
      // Ledareler
      '<div style="margin-bottom:1rem;">' +
      '<div style="font-weight:700;color:var(--accent);font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;">&#x1F4CB; Ledare (' + leaders.length + ')</div>' +
      (leaders.length > 0
        ? leaders.map(function(m) { return memberCheckbox(m, 'leader'); }).join('')
        : '<div style="color:var(--muted);font-size:0.85rem;">Inga ledare</div>') +
      '</div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:1.5rem;">' +

      // Gelenler
      '<div style="background:rgba(0,230,118,0.08);border:1px solid var(--green);border-radius:8px;padding:0.75rem;">' +
      '<div style="color:var(--green);font-weight:700;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>&#x2705; Ja (' + accepted.length + ')</span>' +
      '<button onclick="toggleAllCb(\'accepted\', true)" style="font-size:0.7rem;background:none;border:1px solid var(--green);color:var(--green);padding:1px 6px;border-radius:4px;cursor:pointer;">Alla</button>' +
      '</div>' +
      accepted.map(function(m) { return memberCheckbox(m, 'accepted'); }).join('') +
      '</div>' +

      // Gelmeyenler
      '<div style="background:rgba(255,23,68,0.08);border:1px solid var(--red);border-radius:8px;padding:0.75rem;">' +
      '<div style="color:var(--red);font-weight:700;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>&#x274C; Nej (' + denied.length + ')</span>' +
      '<button onclick="toggleAllCb(\'denied\', false)" style="font-size:0.7rem;background:none;border:1px solid var(--red);color:var(--red);padding:1px 6px;border-radius:4px;cursor:pointer;">Ingen</button>' +
      '</div>' +
      denied.map(function(m) { return memberCheckbox(m, 'denied'); }).join('') +
      '</div>' +

      // Cevap vermeyenler
      '<div style="background:rgba(255,214,0,0.08);border:1px solid var(--yellow);border-radius:8px;padding:0.75rem;">' +
      '<div style="color:var(--yellow);font-weight:700;margin-bottom:0.5rem;display:flex;justify-content:space-between;align-items:center;">' +
      '<span>&#x23F3; V\u00e4ntar (' + waiting.length + ')</span>' +
      '<button onclick="toggleAllCb(\'waiting\', false)" style="font-size:0.7rem;background:none;border:1px solid var(--yellow);color:var(--yellow);padding:1px 6px;border-radius:4px;cursor:pointer;">Ingen</button>' +
      '</div>' +
      waiting.map(function(m) { return memberCheckbox(m, 'waiting'); }).join('') +
      '</div>' +

      '</div>' +

      // Dokümana aktar butonu
      '<div style="text-align:center;">' +
      '<button onclick="openMatchDoc()" class="btn btn-primary" style="font-size:1rem;padding:0.6rem 2rem;">&#x1F4C4; Skapa/\u00f6ppna dokument</button>' +
      '</div>';

  } catch(e) {
    contentEl.innerHTML = '<div class="empty-state">Fel: ' + e.message + '</div>';
  }
}

function closeMyClubDetail() {
  var panel = document.getElementById('myClubDetailPanel');
  if (panel) panel.style.display = 'none';
}

function toggleAllCb(group, checked) {
  document.querySelectorAll('.doc-member-cb[data-group="' + group + '"]').forEach(function(cb) {
    cb.checked = checked;
  });
}

// ---- Doküman formunu aç ----
async function openMatchDoc() {
  var ev = _matchDocActivity;
  if (!ev) return;

  // Seçili kişileri topla
  var selected = [];
  document.querySelectorAll('.doc-member-cb:checked').forEach(function(cb) {
    selected.push({ name: cb.dataset.name, group: cb.dataset.group });
  });

  // Mevcut doküman var mı kontrol et
  var existing = null;
  try {
    var r = await fetch('/api/match-doc?action=get&activity_id=' + ev.id, {headers: authHeaders()});
    existing = await r.json();
  } catch(e) {}

  _matchDocData = existing || { activity_id: ev.id, activity_type: ev.activity_type };

  // Formu göster
  showMatchDocForm(ev, selected, existing);
}

function showMatchDocForm(ev, selected, existing) {
  var isMatch = ev.activity_type === 'Match';
  var c = existing ? (existing.content || {}) : {};
  var dateStr = ev.start ? new Date(ev.start).toLocaleDateString('sv-SE', {weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '';

  // Modal oluştur
  var modal = document.getElementById('matchDocModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'matchDocModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;overflow-y:auto;padding:2rem;';
    document.body.appendChild(modal);
  }

  // Seçili oyuncular listesi
  var playerGroups = { accepted: [], denied: [], waiting: [], leader: [] };
  selected.forEach(function(s) { if (playerGroups[s.group]) playerGroups[s.group].push(s.name); });

  var playerListHtml =
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;margin-bottom:1rem;">' +
    '<div style="background:rgba(0,230,118,0.08);border:1px solid var(--green);border-radius:8px;padding:0.75rem;">' +
    '<div style="color:var(--green);font-weight:700;font-size:0.85rem;margin-bottom:0.4rem;">&#x2705; Ja (' + playerGroups.accepted.length + ')</div>' +
    playerGroups.accepted.map(function(n) { return '<div style="font-size:0.85rem;padding:1px 0;">' + n + '</div>'; }).join('') +
    '</div>' +
    '<div style="background:rgba(255,23,68,0.08);border:1px solid var(--red);border-radius:8px;padding:0.75rem;">' +
    '<div style="color:var(--red);font-weight:700;font-size:0.85rem;margin-bottom:0.4rem;">&#x274C; Nej (' + playerGroups.denied.length + ')</div>' +
    playerGroups.denied.map(function(n) { return '<div style="font-size:0.85rem;padding:1px 0;">' + n + '</div>'; }).join('') +
    '</div>' +
    '<div style="background:rgba(255,214,0,0.08);border:1px solid var(--yellow);border-radius:8px;padding:0.75rem;">' +
    '<div style="color:var(--yellow);font-weight:700;font-size:0.85rem;margin-bottom:0.4rem;">&#x23F3; V\u00e4ntar (' + playerGroups.waiting.length + ')</div>' +
    playerGroups.waiting.map(function(n) { return '<div style="font-size:0.85rem;padding:1px 0;">' + n + '</div>'; }).join('') +
    '</div>' +
    '</div>';

  modal.innerHTML =
    '<div style="max-width:800px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:2rem;">' +

    // Başlık
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;">' +
    '<div>' +
    '<h2 style="font-family:\'Barlow Condensed\',sans-serif;font-size:1.5rem;color:var(--accent);margin:0;">' + (isMatch ? '&#x26BD; Matchdokument' : '&#x1F3CB; Tr\u00e4ningsdokument') + '</h2>' +
    '<div style="color:var(--muted);font-size:0.9rem;margin-top:0.25rem;">' + ev.title + ' \u2014 ' + dateStr + '</div>' +
    '</div>' +
    '<button onclick="closeMatchDocModal()" style="background:none;border:none;color:var(--muted);font-size:1.5rem;cursor:pointer;">&#x2715;</button>' +
    '</div>' +

    // Katılımcılar
    '<div style="margin-bottom:1.5rem;">' +
    '<div style="font-size:0.85rem;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.5rem;">Deltagare</div>' +
    playerListHtml +
    (playerGroups.leader.length > 0
      ? '<div style="font-size:0.85rem;color:var(--muted);margin-top:0.25rem;">Ledare: ' + playerGroups.leader.join(', ') + '</div>'
      : '') +
    '</div>' +

    // Form alanları
    (isMatch ? matchFormFields(c) : traningFormFields(c)) +

    // Kaydet/PDF butonları
    '<div style="display:flex;gap:1rem;margin-top:1.5rem;justify-content:flex-end;">' +
    '<button onclick="saveMatchDoc(' + JSON.stringify(selected).replace(/"/g, '&quot;') + ')" class="btn" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.6rem 1.5rem;">&#x1F4BE; Spara</button>' +
    '<button onclick="downloadMatchDocPdf()" class="btn btn-primary" style="padding:0.6rem 1.5rem;">&#x1F4E5; Ladda ner PDF</button>' +
    '</div>' +

    (existing ? '<div style="text-align:right;margin-top:0.5rem;font-size:0.8rem;color:var(--muted);">Senast sparad: ' + new Date(existing.updated_at).toLocaleDateString('sv-SE', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) + '</div>' : '') +

    '</div>';

  modal.style.display = 'block';
}

function matchFormFields(c) {
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Motst\u00e5ndare</label>' +
    '<input id="mdf_opponent" type="text" value="' + (c.opponent||'') + '" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Plats</label>' +
    '<input id="mdf_location" type="text" value="' + (c.location||'') + '" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Samling</label>' +
    '<input id="mdf_meetup" type="text" value="' + (c.meetup||'') + '" placeholder="t.ex. 12:30 vid omklädningsrum" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Formation</label>' +
    '<input id="mdf_formation" type="text" value="' + (c.formation||'') + '" placeholder="t.ex. 4-3-3" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '</div>' +

    '<div style="margin-bottom:1rem;"><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Taktiska instruktioner</label>' +
    '<textarea id="mdf_tactics" rows="4" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;resize:vertical;">' + (c.tactics||'') + '</textarea></div>' +

    '<div style="margin-bottom:1rem;"><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Startuppst\u00e4llning (en spelare per rad)</label>' +
    '<textarea id="mdf_lineup" rows="6" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;resize:vertical;">' + (c.lineup||'') + '</textarea></div>' +

    '<div style="margin-bottom:1rem;"><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">&#x1F4DD; \u00d6vriga anteckningar</label>' +
    '<textarea id="mdf_notes" rows="3" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;resize:vertical;">' + (c.notes||'') + '</textarea></div>';
}

function traningFormFields(c) {
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Plats</label>' +
    '<input id="mdf_location" type="text" value="' + (c.location||'') + '" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Samling</label>' +
    '<input id="mdf_meetup" type="text" value="' + (c.meetup||'') + '" placeholder="t.ex. 18:30 vid plan" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Fokus</label>' +
    '<input id="mdf_focus" type="text" value="' + (c.focus||'') + '" placeholder="t.ex. Press, omst\u00e4llningar" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '<div><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Varaktighet</label>' +
    '<input id="mdf_duration" type="text" value="' + (c.duration||'') + '" placeholder="t.ex. 90 min" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;"></div>' +

    '</div>' +

    '<div style="margin-bottom:1rem;"><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">Tr\u00e4ningsplan</label>' +
    '<textarea id="mdf_plan" rows="6" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;resize:vertical;">' + (c.plan||'') + '</textarea></div>' +

    '<div style="margin-bottom:1rem;"><label style="font-size:0.8rem;color:var(--muted);display:block;margin-bottom:0.3rem;">&#x1F4DD; Anteckningar</label>' +
    '<textarea id="mdf_notes" rows="3" style="width:100%;background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.5rem;border-radius:6px;font-size:0.9rem;box-sizing:border-box;resize:vertical;">' + (c.notes||'') + '</textarea></div>';
}

function closeMatchDocModal() {
  var modal = document.getElementById('matchDocModal');
  if (modal) modal.style.display = 'none';
}

// ---- Dokümanı kaydet ----
async function saveMatchDoc(selected) {
  var ev = _matchDocActivity;
  if (!ev) return;

  var isMatch = ev.activity_type === 'Match';
  var content = { selected: selected };

  // Form alanlarını topla
  var fields = isMatch
    ? ['opponent','location','meetup','formation','tactics','lineup','notes']
    : ['location','meetup','focus','duration','plan','notes'];

  fields.forEach(function(f) {
    var el = document.getElementById('mdf_' + f);
    if (el) content[f] = el.value;
  });

  try {
    var body = {
      activity_id: ev.id,
      activity_type: ev.activity_type,
      title: ev.title,
      content: content,
    };
    if (_matchDocData && _matchDocData.id) body.id = _matchDocData.id;

    var r = await fetch('/api/match-doc?action=save', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    var d = await r.json();
    if (d.ok) {
      if (d.result && Array.isArray(d.result) && d.result[0]) {
        _matchDocData = d.result[0];
      }
      // Kayıt zamanını güncelle
      var timeEl = document.querySelector('#matchDocModal [style*="Senast sparad"]');
      if (timeEl) {
        timeEl.textContent = 'Senast sparad: ' + new Date().toLocaleDateString('sv-SE', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
      } else {
        var footer = document.querySelector('#matchDocModal > div > div:last-child');
        if (footer) {
          var savedDiv = document.createElement('div');
          savedDiv.style.cssText = 'text-align:right;margin-top:0.5rem;font-size:0.8rem;color:var(--muted);';
          savedDiv.textContent = 'Senast sparad: ' + new Date().toLocaleDateString('sv-SE', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
          footer.after(savedDiv);
        }
      }
      alert('&#x2705; Dokumentet sparades!');
    }
  } catch(e) {
    alert('Fel: ' + e.message);
  }
}

// ---- PDF oluştur ----
function downloadMatchDocPdf() {
  var ev = _matchDocActivity;
  if (!ev) return;
  var isMatch = ev.activity_type === 'Match';
  var dateStr = ev.start ? new Date(ev.start).toLocaleDateString('sv-SE', {weekday:'long', day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'}) : '';

  // Form değerlerini topla
  var fields = isMatch
    ? ['opponent','location','meetup','formation','tactics','lineup','notes']
    : ['location','meetup','focus','duration','plan','notes'];

  var vals = {};
  fields.forEach(function(f) {
    var el = document.getElementById('mdf_' + f);
    vals[f] = el ? el.value : '';
  });

  // Seçili oyuncular
  var selected = [];
  document.querySelectorAll('.doc-member-cb:checked').forEach(function(cb) {
    selected.push({ name: cb.dataset.name, group: cb.dataset.group });
  });
  var accepted = selected.filter(function(s) { return s.group === 'accepted'; }).map(function(s) { return s.name; });
  var denied   = selected.filter(function(s) { return s.group === 'denied'; }).map(function(s) { return s.name; });
  var waiting  = selected.filter(function(s) { return s.group === 'waiting'; }).map(function(s) { return s.name; });
  var leaders  = selected.filter(function(s) { return s.group === 'leader'; }).map(function(s) { return s.name; });

  var pdfHtml = '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8">' +
    '<style>body{font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:2rem;color:#111;}' +
    'h1{font-size:1.6rem;color:#0a0e1a;border-bottom:3px solid #009245;padding-bottom:0.5rem;}' +
    'h2{font-size:1.1rem;color:#374151;margin-top:1.5rem;border-left:4px solid #009245;padding-left:0.75rem;}' +
    '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:1rem;}' +
    '.info-item{background:#f9fafb;border-radius:6px;padding:0.5rem 0.75rem;}' +
    '.info-label{font-size:0.75rem;color:#6b7280;text-transform:uppercase;}' +
    '.info-value{font-weight:600;font-size:0.95rem;}' +
    '.player-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;}' +
    '.player-col{border-radius:8px;padding:0.75rem;}' +
    '.yes{background:#f0fdf4;border:1px solid #86efac;}' +
    '.no{background:#fef2f2;border:1px solid #fca5a5;}' +
    '.wait{background:#fefce8;border:1px solid #fde047;}' +
    '.col-title{font-weight:700;font-size:0.85rem;margin-bottom:0.4rem;}' +
    '.player-name{font-size:0.85rem;padding:2px 0;}' +
    'pre{background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:0.75rem;white-space:pre-wrap;font-size:0.9rem;font-family:Arial,sans-serif;}' +
    '.logo{text-align:right;color:#6b7280;font-size:0.8rem;margin-top:2rem;border-top:1px solid #e5e7eb;padding-top:0.75rem;}' +
    '@media print{body{padding:1rem;}}' +
    '</style></head><body>' +

    '<h1>' + (isMatch ? '&#x26BD; Matchdokument' : '&#x1F3CB; Tr\u00e4ningsdokument') + '</h1>' +
    '<h2 style="border:none;padding:0;font-size:1.2rem;color:#009245;margin-top:0;">' + ev.title + '</h2>' +
    '<p style="color:#6b7280;margin:0 0 1.5rem 0;">' + dateStr + '</p>' +

    '<div class="info-grid">' +
    (vals.location ? '<div class="info-item"><div class="info-label">Plats</div><div class="info-value">' + vals.location + '</div></div>' : '') +
    (vals.meetup ? '<div class="info-item"><div class="info-label">Samling</div><div class="info-value">' + vals.meetup + '</div></div>' : '') +
    (vals.opponent ? '<div class="info-item"><div class="info-label">Motst\u00e5ndare</div><div class="info-value">' + vals.opponent + '</div></div>' : '') +
    (vals.formation ? '<div class="info-item"><div class="info-label">Formation</div><div class="info-value">' + vals.formation + '</div></div>' : '') +
    (vals.focus ? '<div class="info-item"><div class="info-label">Fokus</div><div class="info-value">' + vals.focus + '</div></div>' : '') +
    (vals.duration ? '<div class="info-item"><div class="info-label">Varaktighet</div><div class="info-value">' + vals.duration + '</div></div>' : '') +
    '</div>' +

    '<h2>Deltagare</h2>' +
    '<div class="player-grid">' +
    '<div class="player-col yes"><div class="col-title" style="color:#16a34a;">&#x2705; Ja (' + accepted.length + ')</div>' + accepted.map(function(n) { return '<div class="player-name">' + n + '</div>'; }).join('') + '</div>' +
    '<div class="player-col no"><div class="col-title" style="color:#dc2626;">&#x274C; Nej (' + denied.length + ')</div>' + denied.map(function(n) { return '<div class="player-name">' + n + '</div>'; }).join('') + '</div>' +
    '<div class="player-col wait"><div class="col-title" style="color:#ca8a04;">&#x23F3; V\u00e4ntar (' + waiting.length + ')</div>' + waiting.map(function(n) { return '<div class="player-name">' + n + '</div>'; }).join('') + '</div>' +
    '</div>' +
    (leaders.length > 0 ? '<p style="font-size:0.85rem;color:#6b7280;margin-top:0.5rem;">Ledare: ' + leaders.join(', ') + '</p>' : '') +

    (isMatch && vals.lineup ? '<h2>Startuppst\u00e4llning</h2><pre>' + vals.lineup + '</pre>' : '') +
    (isMatch && vals.tactics ? '<h2>Taktiska instruktioner</h2><pre>' + vals.tactics + '</pre>' : '') +
    (!isMatch && vals.plan ? '<h2>Tr\u00e4ningsplan</h2><pre>' + vals.plan + '</pre>' : '') +
    (vals.notes ? '<h2>Anteckningar</h2><pre>' + vals.notes + '</pre>' : '') +

    '<div class="logo">Sollentuna FK &bull; ' + new Date().toLocaleDateString('sv-SE') + '</div>' +
    '</body></html>';

  var win = window.open('', '_blank');
  win.document.write(pdfHtml);
  win.document.close();
  setTimeout(function() { win.print(); }, 500);
}
