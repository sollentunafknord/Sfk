// ===================== KULLANICI YÖNETİMİ FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: authHeaders(), state, setStatus(), setError() (auth-app.js'de tanımlı)
// =============================================================================


async function loadSfkRoster() {
  if (_sfkRoster) return _sfkRoster;
  try {
    const r = await fetch('/api/admin?action=activeroster', {headers: authHeaders()});
    const data = await r.json();
    // activeroster formatını sfkroster formatına çevir
    _sfkRoster = Array.isArray(data) ? data.map(p => ({
      playerId: p.playerId,
      memberId: p.memberId,
      name: p.name,
      shirt: p.shirt,
      team: p.teamName,
      type: p.type || (p.playerId ? 'player' : 'staff'),
      role: p.role || '',
      thumbnail: p.thumbnail || null,
    })) : [];
    return _sfkRoster;
  } catch(e) { return []; }
}

let _searchTimeout = null;
async function searchSfkPerson(query) {
  const resultsEl = document.getElementById('sfkPersonResults');
  if (!resultsEl) return;
  if (!query || query.length < 2) { resultsEl.style.display = 'none'; return; }

  clearTimeout(_searchTimeout);
  _searchTimeout = setTimeout(async () => {
    const roster = await loadSfkRoster();
    if (!Array.isArray(roster)) return;
    const q = query.toLowerCase();
    const matches = roster.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 10);

    if (!matches.length) { resultsEl.style.display = 'none'; return; }

    resultsEl.innerHTML = matches.map(p => `
      <div onclick="selectSfkPerson(${JSON.stringify(p).replace(/"/g,'&quot;')})"
        style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0.75rem;cursor:pointer;border-bottom:1px solid var(--border);"
        onmouseover="this.style.background='rgba(0,212,255,0.08)'" onmouseout="this.style.background=''">
        ${p.thumbnail && !p.thumbnail.includes('default') 
          ? `<img src="${p.thumbnail}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'">`
          : `<div style="width:36px;height:36px;border-radius:50%;background:var(--surface2);display:flex;align-items:center;justify-content:center;">👤</div>`}
        <div>
          <div style="font-weight:600;font-size:0.9rem;">${p.name}</div>
          <div style="font-size:0.75rem;color:var(--muted);">
            ${p.type === 'player' ? `#${p.shirt} · Spelare · ${p.team}` : `${p.role||'Ledare'} · ${p.team}`}
          </div>
        </div>
      </div>
    `).join('');
    resultsEl.style.display = 'block';

    // Dışarı tıklayınca kapat
    document.addEventListener('click', function closeResults(e) {
      if (!resultsEl.contains(e.target) && e.target.id !== 'sfkPersonSearch') {
        resultsEl.style.display = 'none';
        document.removeEventListener('click', closeResults);
      }
    });
  }, 200);
}

function selectSfkPerson(person) {
  // Formu doldur
  const fullname = document.getElementById('newFullname');
  const role = document.getElementById('newRole');

  if (fullname) fullname.value = person.name;
  if (role) {
    role.value = person.type === 'player' ? 'oyuncu' : 'antrenor';
    togglePlayerSelect();
  }

  // PlayerID seç
  if (person.type === 'player' && person.playerId) {
    const playerSelect = document.getElementById('newPlayerId');
    if (playerSelect) playerSelect.value = person.playerId;
  }

  // MemberID ve thumbnail state'e kaydet
  window._selectedSfkPerson = person;

  // Arama kutusunu temizle
  document.getElementById('sfkPersonSearch').value = person.name;
  document.getElementById('sfkPersonResults').style.display = 'none';
}

async function loadUsers() {
  try {
    const r = await fetch('/api/auth?action=users', {headers: authHeaders()});
    const users = await r.json();
    if (!Array.isArray(users)) { document.getElementById('usersList').innerHTML = '<div class="empty-state">Fel</div>'; return; }

    // Antrenör: sadece kendi takım oyuncularını göster
    let filtered = users;
    if (state.user && state.user.role === 'antrenor') {
      try {
        const tr = await fetch('/api/admin?action=getuserteams&userId=' + state.user.id, {headers: authHeaders()});
        const userTeams = await tr.json();
        if (Array.isArray(userTeams) && userTeams.length > 0) {
          const teamIds = new Set(userTeams.map(t => t.team_id));
          if (!window._activeRosterCache) {
            const rr = await fetch('/api/admin?action=activeroster', {headers: authHeaders()});
            const roster = await rr.json();
            if (Array.isArray(roster)) window._activeRosterCache = roster;
          }
          const roster = window._activeRosterCache || [];
          const allowedPlayerIds = new Set(roster.filter(p => teamIds.has(p.teamId)).map(p => p.playerId));
          filtered = users.filter(u => u.role === 'oyuncu' && allowedPlayerIds.has(u.player_id));
        }
      } catch(e) {}
    }

    window._allUsers = filtered;
    renderUsersList(filtered);
  } catch(e) { console.error(e); }
}

function filterUsers() {
  const search = (document.getElementById('usersSearch')?.value || '').toLowerCase();
  const roleFilter = document.getElementById('usersRoleFilter')?.value || '';
  const users = window._allUsers || [];
  const filtered = users.filter(function(u) {
    const matchSearch = !search ||
      (u.username || '').toLowerCase().includes(search) ||
      (u.full_name || '').toLowerCase().includes(search);
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  // Sadece tabloyu güncelle, editUserPanel ve changePassPanel'i koru
  const tableWrap = document.getElementById('usersTableWrap');
  const countEl = document.getElementById('usersCount');
  if (tableWrap) tableWrap.innerHTML = buildUsersTable(filtered);
  if (countEl) countEl.textContent = filtered.length + ' användare';
}

function buildUsersTable(users) {
  const roleLabel = {admin:'Admin', antrenor:'Tränare', klubbledare:'Klubbledare', oyuncu:'Spelare'};
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>Användarnamn</th><th>Namn</th><th>Roll</th><th>Spelare</th><th>E-post</th><th>Åtgärder</th>
    </tr></thead>
    <tbody>${users.map(u => `<tr id="urow_${u.id}">
      <td><strong>${u.username}</strong></td>
      <td>${u.full_name || '—'}</td>
      <td><span class="role-badge role-${u.role}">${roleLabel[u.role]||u.role}</span></td>
      <td>${u.player_id ? (window.SFK_PLAYERS?.[u.player_id]?.name || u.player_id) : '—'}</td>
      <td style="font-size:0.8rem;color:var(--muted);">${u.notification_email || '—'}</td>
      <td>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button onclick="showEditUser(${u.id},'${u.username}','${(u.full_name||'').replace(/'/g,String.fromCharCode(92)+"'")}','${u.role}',${u.player_id||'null'},${u.minfotboll_member_id||'null'},'${u.notification_email||''}')"
            style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;">
            ✏️ Redigera
          </button>
          ${(window.state?.user?.role === 'admin' || u.role !== 'admin') ? `<button onclick="showChangePassword(${u.id},'${u.username}')"
            style="background:var(--surface2);border:1px solid var(--border);color:var(--accent);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;">
            🔑 Lösenord
          </button>` : ''}
          ${u.id !== window.state?.user?.id ? `<button onclick="deleteUser(${u.id},'${u.username}')"
            style="background:rgba(255,23,68,0.1);border:1px solid var(--red);color:var(--red);padding:0.25rem 0.6rem;border-radius:4px;cursor:pointer;font-size:0.8rem;">
            🗑️
          </button>` : ''}
        </div>
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderUsersList(users) {
  document.getElementById('usersList').innerHTML = `
    <div style="display:flex;gap:0.75rem;margin-bottom:1rem;flex-wrap:wrap;align-items:center;">
      <input type="text" id="usersSearch" placeholder="🔍 Sök användare..." oninput="filterUsers()"
        style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.4rem 0.75rem;border-radius:8px;font-size:0.9rem;min-width:200px;">
      <select id="usersRoleFilter" onchange="filterUsers()"
        style="background:var(--surface2);border:1px solid var(--border);color:var(--text);padding:0.4rem 0.75rem;border-radius:8px;font-size:0.9rem;">
        <option value="">Alla roller</option>
        <option value="admin">Admin</option>
        <option value="klubbledare">Klubbledare</option>
        <option value="antrenor">Tränare</option>
        <option value="oyuncu">Spelare</option>
      </select>
      <span id="usersCount" style="color:var(--muted);font-size:0.85rem;">${users.length} användare</span>
    </div>
    <div id="usersTableWrap">${buildUsersTable(users)}</div>`;
}

let _editUserId = null;
let _changePassUserId = null;

function toggleEditPlayerSelect() {
  const role = document.getElementById('editRole')?.value;
  const wrap = document.getElementById('editPlayerWrap');
  const teamWrap = document.getElementById('editTeamAccessWrap');
  if (wrap) wrap.style.display = role === 'oyuncu' ? 'block' : 'none';
  if (teamWrap) teamWrap.style.display = role === 'antrenor' ? 'block' : 'none';
}

async function showEditUser(id, username, fullname, role, playerId, memberId, notifEmail) {
  _editUserId = id;
  document.getElementById('editUsername').value = username;
  document.getElementById('editFullname').value = fullname;
  document.getElementById('editRole').value = role;
  document.getElementById('editPlayerId').value = playerId || '';
  document.getElementById('editMemberId').value = memberId || '';
  const notifEl = document.getElementById('editNotificationEmail');
  if (notifEl) notifEl.value = notifEmail || '';
  toggleEditPlayerSelect();
  document.getElementById('editUserPanel').style.display = 'block';
  document.getElementById('changePassPanel').style.display = 'none';
  document.getElementById('editUserPanel').scrollIntoView({behavior:'smooth'});

  // Tränare ise takım erişimlerini yükle
  if (role === 'antrenor') {
    await loadUserTeamAccess(id);
  }
}

async function loadUserTeamAccess(userId) {
  const listEl = document.getElementById('editTeamAccessList');
  if (!listEl) return;
  listEl.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Yükleniyor...</div>';

  try {
    // Aktif takımlar + kullanıcının mevcut takımları paralel çek
    const [teamsRes, userTeamsRes] = await Promise.all([
      fetch('/api/admin?action=getactiveteams', {headers: authHeaders()}),
      fetch('/api/admin?action=getuserteams&userId=' + userId, {headers: authHeaders()})
    ]);
    const allTeams = await teamsRes.json();
    const userTeams = await userTeamsRes.json();
    const userTeamIds = new Set(Array.isArray(userTeams) ? userTeams.map(t => t.team_id) : []);

    if (!Array.isArray(allTeams) || !allTeams.length) {
      listEl.innerHTML = '<div style="color:var(--muted);font-size:0.85rem;">Aktif takım bulunamadı</div>';
      return;
    }

    listEl.innerHTML = allTeams.map(function(t) {
      var checked = userTeamIds.has(t.team_id) ? 'checked' : '';
      return `<label style="display:flex;align-items:center;gap:0.5rem;background:var(--surface);border:1px solid ${checked ? 'var(--accent)' : 'var(--border)'};border-radius:8px;padding:0.5rem 0.75rem;cursor:pointer;font-size:0.85rem;" id="uta_label_${t.team_id}">
        <input type="checkbox" ${checked} data-team-id="${t.team_id}" data-team-name="${t.team_name}"
          onchange="document.getElementById('uta_label_${t.team_id}').style.borderColor=this.checked?'var(--accent)':'var(--border)'"
          style="width:16px;height:16px;accent-color:var(--accent);">
        ${t.team_name}
      </label>`;
    }).join('');
  } catch(e) {
    listEl.innerHTML = '<div style="color:#f55;font-size:0.85rem;">Hata: ' + e.message + '</div>';
  }
}

async function fetchAvatarForUser() {
  const memberId = parseInt(document.getElementById('editMemberId').value);
  if (!memberId) { alert('Ange MemberID först'); return; }
  const btn = document.getElementById('fetchAvatarBtn');
  btn.disabled = true; btn.textContent = '⏳ Hämtar...';
  try {
    const r = await fetch('/api/admin?action=fetchavatar&memberId=' + memberId, {headers: authHeaders()});
    const d = await r.json();
    btn.disabled = false; btn.textContent = '🖼️ Hämta bild';
    if (d.avatarUrl) {
      const preview = document.getElementById('editAvatarPreview');
      document.getElementById('editAvatarImg').src = d.avatarUrl;
      document.getElementById('editAvatarStatus').textContent = 'Bild hittad! Spara för att uppdatera.';
      preview.style.display = 'flex';
      preview.style.alignItems = 'center';
      window._editAvatarUrl = d.avatarUrl;
    } else {
      alert('Ingen bild hittades för detta MemberID');
    }
  } catch(e) {
    btn.disabled = false; btn.textContent = '🖼️ Hämta bild';
    alert('Fel: ' + e.message);
  }
}

async function saveEditUser() {
  if (!_editUserId) return;
  const username = document.getElementById('editUsername').value.trim();
  const full_name = document.getElementById('editFullname').value.trim();
  const role = document.getElementById('editRole').value;
  const player_id = role === 'oyuncu' ? parseInt(document.getElementById('editPlayerId').value) || null : null;
  const minfotboll_member_id = parseInt(document.getElementById('editMemberId').value) || null;
  const notification_email = document.getElementById('editNotificationEmail')?.value.trim() || null;
  if (!username) { alert('Användarnamn krävs'); return; }
  try {
    const r = await fetch('/api/auth?action=edituser', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({id: _editUserId, username, full_name, role, player_id, minfotboll_member_id, notification_email, avatar_url: window._editAvatarUrl || undefined})
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }

    // Tränare ise takım erişimlerini kaydet
    if (role === 'antrenor') {
      const checkboxes = document.querySelectorAll('#editTeamAccessList input[type=checkbox]');
      const teamIds = [];
      checkboxes.forEach(function(cb) {
        if (cb.checked) {
          teamIds.push({team_id: parseInt(cb.dataset.teamId), team_name: cb.dataset.teamName});
        }
      });
      await fetch('/api/admin?action=saveuserteams', {
        method: 'POST',
        headers: Object.assign({'Content-Type':'application/json'}, authHeaders()),
        body: JSON.stringify({user_id: _editUserId, team_ids: teamIds})
      });
    }

    document.getElementById('editUserPanel').style.display = 'none';
    _editUserId = null;
    loadUsers();
  } catch(e) { alert('Fel: ' + e.message); }
}

function showChangePassword(id, username) {
  _changePassUserId = id;
  document.getElementById('changePassName').textContent = username;
  document.getElementById('newPassInput').value = '';
  document.getElementById('changePassPanel').style.display = 'block';
  document.getElementById('editUserPanel').style.display = 'none';
  document.getElementById('changePassPanel').scrollIntoView({behavior:'smooth'});
}

async function saveNewPassword() {
  if (!_changePassUserId) return;
  const password = document.getElementById('newPassInput').value;
  if (!password) { alert('Ange nytt lösenord'); return; }
  try {
    const r = await fetch('/api/auth?action=changepassword', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({id: _changePassUserId, password})
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    document.getElementById('changePassPanel').style.display = 'none';
    _changePassUserId = null;
    alert('Lösenordet har ändrats!');
  } catch(e) { alert('Fel: ' + e.message); }
}

async function deleteUser(id, username) {
  if (!confirm(`Ta bort användaren "${username}"?`)) return;
  try {
    const r = await fetch('/api/auth?action=deleteuser', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({id})
    });
    const d = await r.json();
    if (!r.ok) { alert(d.error); return; }
    loadUsers();
  } catch(e) { alert('Fel: ' + e.message); }
}

// ===================== OYUNCU FONKSİYONLARI =====================
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



// ===================== AYARLAR =====================

function toggleInstellningar() {
  const panel = document.getElementById('instellningarPanel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    document.getElementById('settCurrentPass').value = '';
    document.getElementById('settNewPass').value = '';
    document.getElementById('settConfirmPass').value = '';
    document.getElementById('settPassMsg').textContent = '';
  }
  // Dışarı tıklayınca kapat
  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', function closePanel(e) {
        if (!panel.contains(e.target) && !e.target.closest('[onclick*="toggleInstellningar"]')) {
          panel.style.display = 'none';
          document.removeEventListener('click', closePanel);
        }
      });
    }, 100);
  }
}

async function saveSettPassword() {
  const current = document.getElementById('settCurrentPass').value;
  const newPass = document.getElementById('settNewPass').value;
  const confirm = document.getElementById('settConfirmPass').value;
  const msg = document.getElementById('settPassMsg');
  if (!current || !newPass || !confirm) { msg.style.color='var(--red)'; msg.textContent='Fyll i alla fält.'; return; }
  if (newPass !== confirm) { msg.style.color='var(--red)'; msg.textContent='Lösenorden matchar inte.'; return; }
  if (newPass.length < 6) { msg.style.color='var(--red)'; msg.textContent='Minst 6 tecken krävs.'; return; }
  try {
    const r = await fetch('/api/auth?action=changeownpassword', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    const d = await r.json();
    if (!r.ok) { msg.style.color='var(--red)'; msg.textContent=d.error||'Fel uppstod.'; }
    else { msg.style.color='var(--green)'; msg.textContent='✓ Lösenordet har ändrats!'; setTimeout(()=>document.getElementById('instellningarPanel').style.display='none',2000); }
  } catch(e) { msg.style.color='var(--red)'; msg.textContent='Fel: '+e.message; }
}

function showChangeOwnPassword() {
  const panel = document.getElementById('changeOwnPassPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    document.getElementById('ownCurrentPass').value = '';
    document.getElementById('ownNewPass').value = '';
    document.getElementById('ownConfirmPass').value = '';
    document.getElementById('ownPassMsg').textContent = '';
  }
}

async function saveOwnPassword() {
  const current = document.getElementById('ownCurrentPass').value;
  const newPass = document.getElementById('ownNewPass').value;
  const confirm = document.getElementById('ownConfirmPass').value;
  const msg = document.getElementById('ownPassMsg');

  if (!current || !newPass || !confirm) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Fyll i alla fält.';
    return;
  }
  if (newPass !== confirm) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Lösenorden matchar inte.';
    return;
  }
  if (newPass.length < 6) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Lösenordet måste vara minst 6 tecken.';
    return;
  }

  try {
    const r = await fetch('/api/auth?action=changeownpassword', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword: current, newPassword: newPass })
    });
    const d = await r.json();
    if (!r.ok) {
      msg.style.color = 'var(--red)';
      msg.textContent = d.error || 'Fel uppstod.';
    } else {
      msg.style.color = 'var(--green)';
      msg.textContent = '✓ Lösenordet har ändrats!';
      setTimeout(() => {
        document.getElementById('changeOwnPassPanel').style.display = 'none';
      }, 2000);
    }
  } catch(e) {
    msg.style.color = 'var(--red)';
    msg.textContent = 'Fel: ' + e.message;
  }
}
