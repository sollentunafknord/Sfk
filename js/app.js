// ===================== APP CORE =====================
// State ve navigasyon fonksiyonları
// ===================================================

const state = {
  token: localStorage.getItem('sfk_token') || null,
  user: JSON.parse(localStorage.getItem('sfk_user') || 'null'),
  sortCol: 'goals',
  sortDir: -1,
  selectedMatch: null,
  savedMatchIds: new Set(),
};

function goHome() {
  const u = state.user;
  if (!u) return;
  if (u.role === 'oyuncu') {
    document.getElementById('oyuncuTabStats').classList.add('active');
    document.getElementById('oyuncuTabCv').classList.remove('active');
    document.getElementById('oyuncuViewStats').style.display = 'block';
    document.getElementById('oyuncuViewCv').style.display = 'none';
  } else {
    adminTab('matches');
  }
}

function adminTab(tab) {
  const tabs = ['matches','stats','users','cv','omkladningsrum','parametrar','dashboard'];
  document.querySelectorAll('#viewAdmin .tab').forEach((t, i) => {
    t.classList.toggle('active', tabs[i] === tab);
  });
  document.getElementById('adminMatches').style.display = tab === 'matches' ? 'block' : 'none';
  document.getElementById('adminStats').style.display = tab === 'stats' ? 'block' : 'none';
  document.getElementById('adminUsers').style.display = tab === 'users' ? 'block' : 'none';
  document.getElementById('adminCv').style.display = tab === 'cv' ? 'block' : 'none';
  document.getElementById('adminOmkladningsrum').style.display = tab === 'omkladningsrum' ? 'block' : 'none';
  document.getElementById('adminParametrar').style.display = tab === 'parametrar' ? 'block' : 'none';
  document.getElementById('adminDashboard').style.display = tab === 'dashboard' ? 'block' : 'none';
  if (tab === 'cv') populateCvPlayerSelect().catch(()=>{});
  if (tab === 'omkladningsrum') initOmkladningsrum();
  if (tab === 'parametrar') loadActiveTeams();
  if (tab === 'dashboard' && typeof loadDashboard === 'function') loadDashboard();
}

function oyuncuTab(tab) {
  document.getElementById('oyuncuTabStats').classList.toggle('active', tab === 'stats');
  document.getElementById('oyuncuTabCv').classList.toggle('active', tab === 'cv');
  const matchTab = document.getElementById('oyuncuTabMatches');
  if (matchTab) matchTab.classList.toggle('active', tab === 'matches');
  document.getElementById('oyuncuViewStats').style.display = tab === 'stats' ? 'block' : 'none';
  document.getElementById('oyuncuViewCv').style.display = tab === 'cv' ? 'block' : 'none';
  const matchView = document.getElementById('oyuncuViewMatches');
  if (matchView) matchView.style.display = tab === 'matches' ? 'block' : 'none';
  if (tab === 'cv') loadOyuncuCv();
}

// Flatpickr - İsveçce takvim
document.addEventListener('DOMContentLoaded', () => {
  const dateConfig = {
    locale: 'sv',
    dateFormat: 'Y-m-d',
    allowInput: true,
  };
  ['adminFrom','adminTo','statsFrom','statsTo','trFrom','trTo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) flatpickr(el, dateConfig);
  });
});
