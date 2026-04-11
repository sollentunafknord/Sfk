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
      <th>Användarnamn</th><th>Namn</th><th>Roll</th><th>Spelare</th><th>Åtgärder</th>
    </tr></thead>
    <tbody>${users.map(u => `<tr id="urow_${u.id}">
      <td><strong>${u.username}</strong></td>
      <td>${u.full_name || '—'}</td>
      <td><span class="role-badge role-${u.role}">${roleLabel[u.role]||u.role}</span></td>
      <td>${u.player_id ? (window.SFK_PLAYERS?.[u.player_id]?.name || u.player_id) : '—'}</td>
      <td>
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button onclick="showEditUser(${u.id},'${u.username}','${(u.full_name||'').replace(/'/g,String.fromCharCode(92)+"'")}','${u.role}',${u.player_id||'null'},${u.minfotboll_member_id||'null'})"
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

async function showEditUser(id, username, fullname, role, playerId, memberId) {
  _editUserId = id;
  document.getElementById('editUsername').value = username;
  document.getElementById('editFullname').value = fullname;
  document.getElementById('editRole').value = role;
  document.getElementById('editPlayerId').value = playerId || '';
  document.getElementById('editMemberId').value = memberId || '';
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
  if (!username) { alert('Användarnamn krävs'); return; }
  try {
    const r = await fetch('/api/auth?action=edituser', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({id: _editUserId, username, full_name, role, player_id, minfotboll_member_id, avatar_url: window._editAvatarUrl || undefined})
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
// → stats-render.js
function oyuncuTab(tab) {
