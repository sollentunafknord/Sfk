// ===================== GITHUB DEPLOY FONKSİYONLARI =====================
// index.html'den ayrıldı
// Bağımlılıklar: authHeaders() (auth-app.js'de tanımlı)
// ======================================================================

const GITHUB_TOKEN = localStorage.getItem('sfk_gh_token') || '';
const GITHUB_OWNER = 'sollentunafknord';
const GITHUB_REPO = 'Sfk';
const GITHUB_BRANCH = 'main';

function toggleGithubPanel() {
  const panel = document.getElementById('githubPanel');
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    document.getElementById('deployMsg').textContent = '';
    const savedToken = localStorage.getItem('sfk_gh_token') || '';
    const tokenInput = document.getElementById('ghTokenInput');
    if (tokenInput) tokenInput.value = savedToken;
    const statusEl = document.getElementById('ghTokenStatus');
    if (statusEl) statusEl.textContent = savedToken ? '✓ Token kaydedildi' : '⚠️ Token gerekli';
    if (statusEl) statusEl.style.color = savedToken ? 'var(--green)' : 'var(--yellow)';
    if (typeof _updateNextVersionLabel === 'function') _updateNextVersionLabel();
    // Dışarı tıklayınca kapat
    setTimeout(() => {
      document.addEventListener('click', function closePanel(e) {
        if (!panel.contains(e.target) && !e.target.closest('#githubPushBtn')) {
          panel.style.display = 'none';
          document.removeEventListener('click', closePanel);
        }
      });
    }, 100);
  }
}

async function githubGetSha(filePath) {
  try {
    const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`, {
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d.sha || null;
  } catch(e) { return null; }
}

async function githubPushFile(filePath, content) {
  const b64 = btoa(unescape(encodeURIComponent(content)));
  const sha = await githubGetSha(filePath);
  const body = { message: `Update ${filePath}`, content: b64, branch: GITHUB_BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.message || r.status);
  }
  return true;
}

async function fetchFileContent(apiPath) {
  const r = await fetch(apiPath, { headers: authHeaders() });
  return await r.text();
}

function bumpVersion(current) {
  const m = (current || 'v4.0').match(/^v(\d+)\.(\d+)$/);
  if (!m) return 'v4.1';
  return `v${m[1]}.${parseInt(m[2]) + 1}`;
}

function generateVersionJsContent(version, date, notes, prevChangelog) {
  const entry = { version, date, notes };
  const history = [entry, ...(prevChangelog || [])].slice(0, 30);
  const lines = history.map(e => `  { version: '${e.version}', date: '${e.date}', notes: '${(e.notes||'').replace(/'/g,"\\'")}' }`).join(',\n');
  return `// ===================== VERSION INFO =====================\n// Autogenereras vid deploy – redigera ej manuellt\n// ========================================================\n\nconst SFK_VERSION = '${version}';\nconst SFK_BUILD_DATE = '${date}';\nconst SFK_CHANGELOG = [\n${lines}\n];\n`;
}

function showChangelogModal() {
  const modal = document.getElementById('changelogModal');
  const content = document.getElementById('changelogContent');
  if (!modal || !content) return;
  const log = (typeof SFK_CHANGELOG !== 'undefined') ? SFK_CHANGELOG : [];
  if (log.length === 0) {
    content.innerHTML = '<p style="color:var(--muted)">Ingen logg tillgänglig.</p>';
  } else {
    content.innerHTML = log.map(e => `
      <div style="padding:0.6rem 0;border-bottom:1px solid var(--border);">
        <div style="display:flex;gap:0.75rem;align-items:baseline;">
          <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;color:var(--accent);min-width:3.5rem;">${e.version}</span>
          <span style="font-size:0.75rem;color:var(--muted);">${e.date}</span>
        </div>
        <div style="margin-top:0.2rem;color:var(--text);">${e.notes || '—'}</div>
      </div>`).join('');
  }
  modal.style.display = 'flex';
}

async function doDeploy() {
  const btn = document.getElementById('deployRunBtn');
  const msg = document.getElementById('deployMsg');
  btn.disabled = true;
  btn.textContent = '⏳ Pushar...';
  msg.style.color = 'var(--muted)';
  msg.textContent = '';

  const currentToken = localStorage.getItem('sfk_gh_token') || '';
  if (!currentToken || !currentToken.startsWith('ghp_')) {
    msg.style.color = 'var(--red)';
    msg.textContent = '⚠️ Ange ett giltigt GitHub Token först!';
    btn.disabled = false;
    btn.textContent = '🚀 Push till GitHub';
    return;
  }
  try {
    const currentVersion = (typeof SFK_VERSION !== 'undefined') ? SFK_VERSION : 'v4.0';
    const newVersion = bumpVersion(currentVersion);
    const today = new Date().toISOString().slice(0, 10);
    const notes = (document.getElementById('deployNotes')?.value || '').trim() || `Deploy ${newVersion}`;
    const prevChangelog = (typeof SFK_CHANGELOG !== 'undefined') ? SFK_CHANGELOG : [];

    // Push version.js first
    msg.textContent = `Genererar ${newVersion}...`;
    const versionContent = generateVersionJsContent(newVersion, today, notes, prevChangelog);
    await githubPushFile('js/version.js', versionContent);

    // Push index.html — at this point window.SFK_VERSION is still old; that's fine,
    // Vercel will serve the new version.js which is loaded first.
    msg.textContent = 'Pushar index.html...';
    const fileContent = document.documentElement.outerHTML;
    await githubPushFile('index.html', fileContent);

    // Update local state so badge reflects new version immediately
    if (typeof window !== 'undefined') {
      window.SFK_VERSION = newVersion;
      window.SFK_BUILD_DATE = today;
      window.SFK_CHANGELOG = [{ version: newVersion, date: today, notes }, ...prevChangelog].slice(0, 30);
    }
    const badge = document.getElementById('sfkVersionBadge');
    if (badge) badge.textContent = newVersion;
    const buildDate = document.getElementById('sfkBuildDate');
    if (buildDate) buildDate.textContent = today;

    msg.style.color = 'var(--green)';
    msg.textContent = `✓ ${newVersion} pushat! Vercel deployas om ~30 sek.`;
    btn.textContent = '✓ Klart!';
    if (document.getElementById('deployNotes')) document.getElementById('deployNotes').value = '';
    setTimeout(() => {
      document.getElementById('githubPanel').style.display = 'none';
      btn.textContent = '🚀 Push till GitHub';
      btn.disabled = false;
    }, 3000);
  } catch(e) {
    msg.style.color = 'var(--red)';
    msg.textContent = '✗ Fel: ' + e.message;
    btn.textContent = '🚀 Push till GitHub';
    btn.disabled = false;
  }
}

