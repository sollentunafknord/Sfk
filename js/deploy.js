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
    btn.textContent = '🚀 Push index.html → GitHub';
    return;
  }
  try {
    msg.style.color = 'var(--muted)';
    msg.textContent = 'Hämtar senaste SHA...';
    const fileContent = document.documentElement.outerHTML;
    msg.textContent = 'Pushar index.html...';
    await githubPushFile('index.html', fileContent);
    msg.style.color = 'var(--green)';
    msg.textContent = '✓ index.html pushat! Vercel deployas om ~30 sek.';
    btn.textContent = '✓ Klart!';
    setTimeout(() => {
      document.getElementById('githubPanel').style.display = 'none';
      btn.textContent = '🚀 Push index.html → GitHub';
    }, 3000);
  } catch(e) {
    msg.style.color = 'var(--red)';
    msg.textContent = '✗ Fel: ' + e.message;
    btn.textContent = '🚀 Push index.html → GitHub';
  }
}

