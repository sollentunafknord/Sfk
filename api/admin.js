const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'sfk2026gizliAnahtar!';
const MINFOTBOLL_API = 'minfotboll-api.azurewebsites.net';

// Forma numarasından PlayerID bul
const SHIRT_TO_PLAYER_ID = {};
// Bu aşağıda SFK_PLAYERS tanımlandıktan sonra doldurulacak

const SFK_PLAYER_IDS = new Set([
  // P16A
  583483,562656,659792,571649,572299,597435,700142,595639,
  571652,558820,571659,589844,572290,572006,595633,606521,
  700147,576573,571068,595628,573259,
  // P14 Akademi
  905478,840406,923089,641517,923053,572533,734915,901342,
  865395,894640,844397,781978,922225,719424,748624,719632,
  798410,571065,865475,
  // A-lag Herr
  45070,507025,15860,103332,128718,561126,129841,127111,
  165240,130039,265398,506367,17431,158153,128664,180303,
  130014,160163,109240,
  // A-lag Dam
  137378,39053,152760,164218,580409,561100,577839,574228,183434,126528,172731,482220,391859,630573,121063,183458,499547,505767,15006,138278,15909,151551,137391,152763,121288,641407,214359,133599,172716,
  // Utveckling P16U
  583472,558818,571643,599134,583487,572832,571655,572826,571650,
  572840,573260,684078,572296,572304,583480,663383,565476,572297,
  589858,539763,571740,638706
]);

const SFK_PLAYERS = {
  // P16A
  583483:{name:'Gabriel Saadi',shirt:1},
  562656:{name:'Alexander Hansen',shirt:2},
  659792:{name:'Jeyson Sissah Nkanga Ngudi Jose',shirt:3},
  571649:{name:'Filip Kjellgren',shirt:4},
  572299:{name:'Alf Markusson',shirt:5},
  597435:{name:'Linus Olofsson',shirt:6},
  700142:{name:'Leo Olausson',shirt:7},
  595639:{name:'Hugo Meyer',shirt:8},
  571652:{name:'Gabriel Mocsary',shirt:9},
  558820:{name:'Frank Lundh',shirt:10},
  571659:{name:'Emil Wallberg',shirt:11},
  589844:{name:'Vincent Ekström Lundin',shirt:12},
  572290:{name:'Badou Badjan',shirt:14},
  572006:{name:'Gus Stefansson',shirt:16},
  595633:{name:'Cian Hogan',shirt:17},
  606521:{name:'Aksel Yesil',shirt:19},
  700147:{name:'Charlie Nordenson',shirt:20},
  576573:{name:'Albin Nordin',shirt:21},
  571068:{name:'Viggo Sejnäs',shirt:31},
  595628:{name:'Valter Ekehov',shirt:66},
  573259:{name:'Love Nytén',shirt:77},
  // P14 Akademi
  905478:{name:'Edvin Hörnquist',shirt:1},
  840406:{name:'Dominiq Johansson',shirt:2},
  923089:{name:'Ludvig Gerlach',shirt:3},
  641517:{name:'Sixten Oxhammar Lindwall',shirt:4},
  923053:{name:'Casper Zachén',shirt:5},
  572533:{name:'William Beijron',shirt:6},
  734915:{name:'Jack Meier',shirt:7},
  901342:{name:'Malte Sellgren',shirt:8},
  865395:{name:'Melker Åslund',shirt:9},
  894640:{name:'Adrian Johansson',shirt:10},
  844397:{name:'Christos Christoforidis',shirt:11},
  781978:{name:'Hugo Killander',shirt:12},
  922225:{name:'Philip Karlsson',shirt:13},
  719424:{name:'Frans Ramsell',shirt:14},
  748624:{name:'Max Sandelius',shirt:15},
  719632:{name:'Ture Andersson',shirt:16},
  798410:{name:'Philip Wallin',shirt:17},
  571065:{name:'Love Stålknapp',shirt:18},
  865475:{name:'Sander Frick',shirt:99},
  // A-lag Herr
  128664:{name:'Oscar Franck',shirt:1},
  506367:{name:'Lukas Johansson',shirt:2},
  130039:{name:'Kalle Selin Stregart',shirt:3},
  15860:{name:'David Bengtsson',shirt:4},
  165240:{name:'Jonathan Zeberga',shirt:5},
  180303:{name:'Oskar Käck',shirt:6},
  129841:{name:'Jakob Bäckström',shirt:7},
  128718:{name:'Emil Stenstrand',shirt:8},
  45070:{name:'Alexander Larsson',shirt:9},
  103332:{name:'Dida Rashidi',shirt:10},
  130014:{name:'Salim Nkubiri',shirt:11},
  160163:{name:'Umit Aras',shirt:12},
  158153:{name:'Noah Nytén',shirt:13},
  17431:{name:'Noah Josefsberg',shirt:16},
  127111:{name:'Johannes Danho',shirt:17},
  561126:{name:'Erik Lundell',shirt:18},
  265398:{name:'Ludvig Ennart',shirt:19},
  507025:{name:'Angel Rubino Huaiquio',shirt:20},
  109240:{name:'Wilgot Marshage',shirt:21},
  // A-lag Dam
  137378:{name:'Agnes Johansson',shirt:14},
  39053:{name:'Alicia Wood',shirt:28},
  152760:{name:'Amanda Gillberg',shirt:24},
  164218:{name:'Amani Ayed',shirt:11},
  580409:{name:'Celine Källström Thunström',shirt:23},
  561100:{name:'Ebba Aleblad',shirt:5},
  577839:{name:'Ella Arvidsson',shirt:13},
  574228:{name:'Emilia Hedfors',shirt:0},
  183434:{name:'Emma Sjöberg',shirt:19},
  126528:{name:'Emma Lund',shirt:25},
  172731:{name:'Emma Theorén',shirt:0},
  482220:{name:'Enya Dahlin',shirt:12},
  391859:{name:'Helin Tas',shirt:2},
  630573:{name:'Ida Nilsson',shirt:8},
  121063:{name:'Joanna Wallgren',shirt:17},
  183458:{name:'Johanna Ståhl',shirt:3},
  499547:{name:'Leia Aglert',shirt:9},
  505767:{name:'Mathilda Lindström',shirt:22},
  15006:{name:'Matilda Dahlgren',shirt:10},
  138278:{name:'Olivia Waller',shirt:29},
  15909:{name:'Piyatida Somkumpee',shirt:18},
  151551:{name:'Rafaela Kalaitzidou',shirt:15},
  137391:{name:'Saga Stork',shirt:16},
  152763:{name:'Sofia Norrby',shirt:20},
  121288:{name:'Stina Huss',shirt:6},
  641407:{name:'Tilde Dahl',shirt:4},
  214359:{name:'Tilde Wahlbom',shirt:1},
  133599:{name:'Tuva Klar',shirt:7},
  172716:{name:'Wilma Gidlöf',shirt:0},
  // Sollentuna Utveckling FK P16U
  583472:{name:'Love Jonare Backman',shirt:2},
  558818:{name:'Hjalmar Lejelöv',shirt:3},
  571643:{name:'Joel Hallberg',shirt:4},
  599134:{name:'Erik Rosvall',shirt:5},
  583487:{name:'Fred Ågeland',shirt:6},
  572832:{name:'Maximus Mnayarji',shirt:7},
  571655:{name:'William Sjögren',shirt:8},
  572826:{name:'Nathan Eriksson',shirt:9},
  571650:{name:'Arthur Konradsen',shirt:10},
  572840:{name:'Pepe Velasco',shirt:11},
  573260:{name:'Efe Rasim',shirt:12},
  684078:{name:'Mathias Werner',shirt:13},
  572296:{name:'Bilal Phonsak',shirt:14},
  572304:{name:'Filip Wirén',shirt:15},
  583480:{name:'Ivar Lindstrup',shirt:16},
  663383:{name:'Allan Abdel Razek',shirt:17},
  565476:{name:'Ossian Aldenroth',shirt:18},
  572297:{name:'Abu Bakr Kinenarath',shirt:19},
  589858:{name:'Vilmer Nordin',shirt:20},
  539763:{name:'Caspian Famili',shirt:21},
  571740:{name:'Carl Westerling',shirt:22},
  638706:{name:'Algot Lidälv',shirt:99},
};

// Forma no → PlayerID eşleştirmesi (static fallback)
Object.keys(SFK_PLAYERS).forEach(pid => {
  SHIRT_TO_PLAYER_ID[SFK_PLAYERS[pid].shirt] = parseInt(pid);
});

// Dinamik roster yükleme — MinFotboll'dan güncel kadroyu çeker
let _rosterCache = null;
let _rosterCacheTime = 0;
async function getDynamicRoster(mfToken) {
  // 5 dakika cache
  if (_rosterCache && Date.now() - _rosterCacheTime < 5 * 60 * 1000) return _rosterCache;
  try {
    const activeTeams = await supabaseGet('/active_teams?is_active=eq.true&select=team_id,team_name');
    if (!Array.isArray(activeTeams)) return { playerIds: new Set(Object.keys(SFK_PLAYERS).map(Number)), players: SFK_PLAYERS };
    
    const dynamicPlayers = {};
    const dynamicIds = new Set();
    
    await Promise.all(activeTeams.map(async (t) => {
      try {
        const players = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${t.team_id}`, mfToken);
        if (!Array.isArray(players)) return;
        players.forEach(p => {
          if (!p.PlayerID) return;
          dynamicIds.add(p.PlayerID);
          dynamicPlayers[p.PlayerID] = {
            name: p.FullName || `${p.FirstName||''} ${p.LastName||''}`.trim(),
            shirt: p.ShirtNumber || 0,
            team: t.team_name,
          };
        });
      } catch(e) {}
    }));
    
    // Fallback: statik SFK_PLAYERS'ı da ekle (MinFotboll'da olmayan oyuncular için)
    Object.keys(SFK_PLAYERS).forEach(pid => {
      if (!dynamicIds.has(parseInt(pid))) {
        dynamicIds.add(parseInt(pid));
        dynamicPlayers[pid] = SFK_PLAYERS[pid];
      }
    });
    
    _rosterCache = { playerIds: dynamicIds, players: dynamicPlayers };
    _rosterCacheTime = Date.now();
    return _rosterCache;
  } catch(e) {
    return { playerIds: new Set(Object.keys(SFK_PLAYERS).map(Number)), players: SFK_PLAYERS };
  }
}

const LEAGUES = [
  {id:59554, type:'lig',      team:457347, label:'P16 Div.1 2025'},
  {id:68703, type:'kupa',     team:398871, label:'P16 Ligacupen Grupp 3 2026'},
  {id:129362,type:'lig',      team:398871, label:'P16 Div.1 2026'},
  {id:70389, type:'kupa',     team:398871, label:'P16 Ligacupen 2026'},
  {id:59382, type:'hazirlik', team:398871, label:'P16 Träningsmatcher 2025'},
  {id:69555, type:'hazirlik', team:398871, label:'P16 Träningsmatcher 2026'},
  {id:69500, type:'lig',      team:74782,  label:'P17 Allsvenskan 2026'},
  {id:70384, type:'kupa',     team:74782,  label:'P17 Ligacupen 2026'},
  {id:70816, type:'hazirlik', team:74782,  label:'P17 Träningsmatcher 2026'},
  {id:70125, type:'hazirlik', team:74782,  label:'P17 Träningsmatcher Västergötland 2026'},
  {id:71503, type:'lig',      team:512525, label:'P14 Akademi Div.1 2026'},
  {id:75630, type:'hazirlik', team:512525, label:'P14 Akademi LUX invite 2026'},
  {id:71305, type:'hazirlik', team:512525, label:'P14 Akademi Träningsmatcher 2026'},
  {id:69616, type:'lig',      team:68503,  label:'A-lag Herr Ettan Norra 2026'},
  {id:69633, type:'lig',      team:201387, label:'A-lag Dam Div.1 Norra 2026'},
  {id:68369, type:'kupa',     team:201387, label:'A-lag Dam Victoria Cup 2026'},
  {id:71059, type:'lig',      team:511901, label:'Utveckling P16U kval till P17 2026'},
  {id:74514, type:'hazirlik', team:511901, label:'Utveckling P16U Träningsmatcher 2026'},
];

// MinFotboll'da eksik/yanlış yazılan takım adları için override
const TEAM_NAME_OVERRIDE = {
  201387: 'Sollentuna FK A-lag Dam',
  68503:  'Sollentuna FK A-lag Herr',
};
function fixTeamName(teamId, displayName) {
  return TEAM_NAME_OVERRIDE[teamId] || displayName;
}

function verifyToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch(e) { return null; }
}

function httpGet(host, path, headers={}) {
  return new Promise((resolve, reject) => {
    const req = https.request({host, path, method:'GET', headers}, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        try{resolve(JSON.parse(data))}catch(e){resolve(data)};
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPost(host, path, body, headers={}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      host, path, method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(bodyStr),...headers}
    }, (res) => {
      let data='';
      res.on('data', chunk => data+=chunk);
      res.on('end', () => { try{resolve(JSON.parse(data))}catch(e){resolve(data)} });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function supabaseRequest(method, path, body) {
  const url = new URL(SUPABASE_URL);
  return new Promise((resolve, reject) => {
    const bodyStr = (body && method !== 'DELETE') ? JSON.stringify(body) : '';
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);
    const req = https.request({
      host: url.host,
      path: `/rest/v1${path}`,
      method,
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', (e) => { console.error('supabaseRequest error:', e); resolve(null); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function supabaseGet(path) {
  return httpGet(new URL(SUPABASE_URL).host, `/rest/v1${path}`, {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  });
}

// Token cache - process lifetime boyunca geçerli
let _cachedToken = null;
let _cachedTokenExp = 0;

async function updateVercelToken(newAccessToken, newRefreshToken) {
  const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || '';
  if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) return;
  try {
    const listPath = `/v9/projects/${VERCEL_PROJECT_ID}/env${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`;
    const listResult = await new Promise((resolve, reject) => {
      const r = https.request({ host: 'api.vercel.com', path: listPath, method: 'GET',
        headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
      }, (res) => { let d=''; res.on('data', c => d+=c); res.on('end', () => { try{resolve(JSON.parse(d))}catch(e){resolve({})} }); });
      r.on('error', reject); r.end();
    });
    const envs = listResult.envs || [];
    const accessEnv = envs.find(e => e.key === 'MINFOTBOLL_ACCESS_TOKEN');
    const refreshEnv = envs.find(e => e.key === 'MINFOTBOLL_REFRESH_TOKEN');
    const patch = (envId, value) => {
      const body = JSON.stringify({ value });
      return new Promise((resolve, reject) => {
        const r = https.request({ host: 'api.vercel.com',
          path: `/v9/projects/${VERCEL_PROJECT_ID}/env/${envId}${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`,
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
        }, (res) => { let d=''; res.on('data', c => d+=c); res.on('end', () => resolve(d)); });
        r.on('error', reject); r.write(body); r.end();
      });
    };
    if (accessEnv) await patch(accessEnv.id, newAccessToken);
    if (refreshEnv && newRefreshToken) await patch(refreshEnv.id, newRefreshToken);
  } catch(e) { console.error('Vercel token update error:', e.message); }
}

async function getMinfotbollToken() {
  const now = Math.floor(Date.now() / 1000);

  // Cache'de geçerli token var mı? (30 dakika buffer ile kontrol)
  if (_cachedToken && _cachedTokenExp > now + 60) {
    return _cachedToken;
  }

  const refreshToken = process.env.MINFOTBOLL_REFRESH_TOKEN;
  const accessToken = process.env.MINFOTBOLL_ACCESS_TOKEN;

  // Mevcut access token hâlâ geçerliyse direkt kullan (30 dakika buffer)
  if (accessToken) {
    try {
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.exp && payload.exp > now + 1800) {
          _cachedToken = accessToken;
          _cachedTokenExp = payload.exp;
          return accessToken;
        }
      }
    } catch(e) {}
  }

  // Token expire olmuş veya 30 dakikadan az kaldı — yenile
  const result = await httpPost(MINFOTBOLL_API, '/api/jwtapi/refreshtoken', {accessToken, refreshToken});
  if (!result.AccessToken) throw new Error('MinFotboll-token kunde inte hämtas');

  // Cache'e kaydet
  try {
    const parts = result.AccessToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    _cachedTokenExp = payload.exp || (now + 900);
  } catch(e) { _cachedTokenExp = now + 900; }
  _cachedToken = result.AccessToken;

  // Vercel'e yeni token'ları arka planda kaydet
  updateVercelToken(result.AccessToken, result.RefreshToken).catch(() => {});

  return result.AccessToken;
}

function minfotbollGet(path, token) {
  return httpGet(MINFOTBOLL_API, path, {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  });
}

function getGameType(leagueName) {
  if (!leagueName) return 'hazirlik';
  const l = leagueName.toLowerCase();
  if (l.includes('träning')) return 'hazirlik';
  if (l.includes('cup') || l.includes('cupen')) return 'kupa';
  return 'lig';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Token doğrula
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Vänligen logga in' });
  const action = req.query.action;

  // savedmatches tüm roller için açık (lig listesi için)
  if (action !== 'savedmatches' && action !== 'getrooms' && action !== 'deleteroom' && user.role !== 'admin' && user.role !== 'antrenor' && user.role !== 'klubbledare') return res.status(403).json({ error: 'Behörighet krävs' });

  // Maçları çek (önizleme)
  if (action === 'fetchmatches') {
    const { gameType, dateFrom, dateTo } = req.query;
    const mfToken = await getMinfotbollToken();

    // Tränare için izin verilen takım ID'lerini çek
    let allowedTeamIds = null;
    if (user.role === 'antrenor') {
      const userTeams = await supabaseGet(`/user_team_access?user_id=eq.${user.id}&select=team_id`);
      allowedTeamIds = new Set(Array.isArray(userTeams) ? userTeams.map(t => t.team_id) : []);
    }

    const filteredLeagues = LEAGUES.filter(l => {
      if (allowedTeamIds && !allowedTeamIds.has(l.team)) return false;
      if (gameType && gameType !== 'hepsi') return l.type === gameType;
      return true;
    });

    const allGames = [];
    const seen = new Set();

    await Promise.all(filteredLeagues.map(async (league) => {
      try {
        const games = await minfotbollGet(`/api/leagueapi/getleaguegames?leagueId=${league.id}`, mfToken);
        if (!Array.isArray(games)) return;
        games.forEach(g => {
          if (seen.has(g.GameID)) return;
          if (g.HomeTeamID !== league.team && g.AwayTeamID !== league.team) return;
          if (g.GameStatusID !== 3) return;
          if (dateFrom && new Date(g.GameTime) < new Date(dateFrom)) return;
          if (dateTo && new Date(g.GameTime) > new Date(dateTo + 'T23:59:59')) return;
          seen.add(g.GameID);
          allGames.push({
            gameId: g.GameID,
            gameDate: g.GameTime,
            homeTeam: g.HomeTeamDisplayName,
            awayTeam: g.AwayTeamDisplayName,
            homeScore: g.HomeTeamScore,
            awayScore: g.AwayTeamScore,
            homeLogo: g.HomeTeamClubLogoURL || '',
            awayLogo: g.AwayTeamClubLogoURL || '',
            homeTeamId: g.HomeTeamID,
            awayTeamId: g.AwayTeamID,
            leagueName: league.label,
            gameType: league.type,
            teamId: league.team,
          });
        });
      } catch(e) {}
    }));

    // MagazineBlurbs fallback — aktif takımlar için bilinmeyen ligleri de çek
    const activeTeams = await supabaseGet('/active_teams?is_active=eq.true&select=team_id,team_name');
    let activeTeamIds = Array.isArray(activeTeams) ? activeTeams.map(t => t.team_id) : [74782, 398871, 457347, 402766];
    // Tränare için sadece kendi takımları
    if (allowedTeamIds) {
      activeTeamIds = activeTeamIds.filter(id => allowedTeamIds.has(id));
    }

    await Promise.all(activeTeamIds.map(async (teamId) => {
      try {
        const site = await minfotbollGet(`/api/teamapi/initteamsite?teamId=${teamId}`, mfToken);
        if (!site?.MagazineBlurbs) return;
        site.MagazineBlurbs.forEach(b => {
          const g = b.GameHeaderInfo;
          if (!g) return;
          if (seen.has(g.GameID)) return;
          if (g.HomeTeamID !== teamId && g.AwayTeamID !== teamId) return;
          if (g.GameStatusID !== 3) return;
          if (dateFrom && new Date(g.GameTime) < new Date(dateFrom)) return;
          if (dateTo && new Date(g.GameTime) > new Date(dateTo + 'T23:59:59')) return;
          seen.add(g.GameID);
          const teamInfo = Array.isArray(activeTeams) ? activeTeams.find(t => t.team_id === teamId) : null;
          allGames.push({
            gameId    : g.GameID,
            gameDate  : g.GameTime,
            homeTeam  : g.HomeTeamDisplayName,
            awayTeam  : g.AwayTeamDisplayName,
            homeScore : g.HomeTeamScore,
            awayScore : g.AwayTeamScore,
            homeLogo  : g.HomeTeamClubLogoURL || '',
            awayLogo  : g.AwayTeamClubLogoURL || '',
            homeTeamId: g.HomeTeamID,
            awayTeamId: g.AwayTeamID,
            leagueName: g.LeagueDisplayName || '—',
            gameType  : 'hazirlik',
            teamId    : teamId,
            teamName  : teamInfo?.team_name || '',
          });
        });
      } catch(e) {}
    }));

    allGames.sort((a,b) => new Date(b.gameDate) - new Date(a.gameDate));
    return res.status(200).json(allGames);
  }

  // Maç detayı çek (oyuncular + olaylar)
  if (action === 'matchdetail') {
    const { gameId, teamId } = req.query;
    if (!gameId) return res.status(400).json({ error: 'gameId krävs' });

    const mfToken = await getMinfotbollToken();
    const tid = parseInt(teamId);

    // Dinamik roster yükle
    const { playerIds: SFK_PLAYER_IDS_DYN, players: SFK_PLAYERS_DYN } = await getDynamicRoster(mfToken);

    const [overview, lineups, header, rosterData, timelineData] = await Promise.all([
      minfotbollGet(`/api/magazinegameviewapi/initgameoverview?GameID=${gameId}`, mfToken),
      minfotbollGet(`/api/magazinegameviewapi/initgamelineups?GameID=${gameId}`, mfToken),
      minfotbollGet(`/api/gameapi/getgameheaderinfo?id=${gameId}`, mfToken),
      minfotbollGet(`/api/followgameapi/initlivetimelineblurbs?GameID=${gameId}`, mfToken),
      minfotbollGet(`/api/followgameapi/initlivetimelineblurbs?GameID=${gameId}`, mfToken),
    ]);

    // Rapportörleri bul - her iki takımın TeamStaff'ından MemberID → isim
    const memberMap = {};
    [lineups.HomeTeamGameTeamRoster, lineups.AwayTeamGameTeamRoster].forEach(roster => {
      if (roster?.TeamStaff) {
        roster.TeamStaff.forEach(s => {
          memberMap[s.MemberID] = { name: s.FullName, teamId: roster.TeamID };
        });
      }
    });

    // Timeline'daki olayları rapportöre göre grupla
    const reporterEvents = {}; // memberID -> [EREventID]
    if (rosterData?.TimelineBlurbs) {
      rosterData.TimelineBlurbs.forEach(b => {
        if (b.EREventInfo && b.InsertMemberID) {
          if (!reporterEvents[b.InsertMemberID]) reporterEvents[b.InsertMemberID] = new Set();
          reporterEvents[b.InsertMemberID].add(b.EREventInfo.EREventID);
        }
      });
    }

    // Birden fazla SFK rapportörü var mı?
    const sfkReporters = Object.entries(reporterEvents)
      .filter(([mid]) => memberMap[mid]?.teamId === tid)
      .map(([mid, events]) => ({
        memberId: parseInt(mid),
        name: memberMap[mid]?.name || `ID: ${mid}`,
        eventCount: events.size,
      }));

    // Seçili rapportör varsa filtrele
    const selectedReporterId = req.query.reporterId ? parseInt(req.query.reporterId) : null;

    const isHome = header.HomeTeamID === tid || lineups?.HomeTeamGameTeamRoster?.TeamID === tid;
    const lineupTeam = isHome ? lineups.HomeTeamLineUp : lineups.AwayTeamLineUp;
    const rosterTeam = isHome ? lineups.HomeTeamGameTeamRoster : lineups.AwayTeamGameTeamRoster;

    // findPlayer - forma numarası veya isimle oyuncu bul
    const findPlayer = (nameOrShirt) => {
      const s = String(nameOrShirt).trim();
      const shirtNum = parseInt(s.split(' ')[0]);
      if (!isNaN(shirtNum) && SHIRT_TO_PLAYER_ID[shirtNum]) return SHIRT_TO_PLAYER_ID[shirtNum];
      const nl = s.toLowerCase();
      return parseInt(Object.keys(SFK_PLAYERS_DYN).find(id => {
        const full = SFK_PLAYERS_DYN[id].name.toLowerCase();
        const lastName = full.split(' ').pop();
        return full === nl || full.includes(nl) || nl.includes(full) || lastName === nl;
      }));
    };

    // ADIM 1: ROSTER — Kadroya çağrılan tüm SFK oyuncuları
    const playerThumbnails = {};
    const playerShirtNos = {};
    const playerIsStarter = {};
    const playerIsInSquad = {};
    const playerPositions = {};
    const squadPlayerIds = new Set();
    const unknownRosterPlayers = []; // Listede olmayan oyuncular

    if (rosterTeam && rosterTeam.Players) {
      rosterTeam.Players.forEach(p => {
        if (!SFK_PLAYER_IDS_DYN.has(p.PlayerID)) {
          // Listede olmayan oyuncu — ambiguous olarak sor
          if (p.FirstName || p.LastName || p.ShirtNumber) {
            unknownRosterPlayers.push({
              type: 'unknownPlayer',
              rawName: `${p.ShirtNumber ? p.ShirtNumber + '. ' : ''}${p.FirstName || ''} ${p.LastName || ''}`.trim(),
              originalPlayerID: p.PlayerID,
              shirtNumber: p.ShirtNumber,
              minute: null,
              description: 'Kadroda ama listede yok'
            });
          }
          return;
        }
        squadPlayerIds.add(p.PlayerID);
        playerIsInSquad[p.PlayerID] = true;
        playerIsStarter[p.PlayerID] = false;
        playerShirtNos[p.PlayerID] = p.ShirtNumber || SFK_PLAYERS_DYN[p.PlayerID]?.shirt || 0;
        playerThumbnails[p.PlayerID] = p.ThumbnailURL || null;
      });
    }

    // ADIM 2: LINEUP — İlk 11'i işaretle
    if (lineupTeam && lineupTeam.GameLineUpPlayers) {
      lineupTeam.GameLineUpPlayers.forEach(p => {
        if (!SFK_PLAYER_IDS_DYN.has(p.PlayerID)) return;
        squadPlayerIds.add(p.PlayerID);
        playerIsInSquad[p.PlayerID] = true;
        playerIsStarter[p.PlayerID] = true;
        playerPositions[p.PlayerID] = p.Position || '';
        playerShirtNos[p.PlayerID] = playerShirtNos[p.PlayerID] || p.ShirtNumber || SFK_PLAYERS_DYN[p.PlayerID]?.shirt || 0;
        playerThumbnails[p.PlayerID] = playerThumbnails[p.PlayerID] || p.ThumbnailURL || null;
      });
    }

    // ADIM 3: DEĞİŞİKLİKLER — Kim girdi/çıktı, hangi dakikada
    const substitutions = {};
    const defaultDur = 90;

    // Değişiklikleri işlemeden önce duplicate'leri temizle ve SIRALA
    const seenSubs = new Set();
    const uniqueSubBlurbs = [];
    if (overview && overview.Blurbs) {
      overview.Blurbs.forEach(b => {
        if (b.TypeID !== 4) return;
        const isOurTeam = isHome ? !b.IsAwayTeamAction : b.IsAwayTeamAction;
        if (!isOurTeam) return;
        const sec = b.GameClockSecond || 0;
        const roundedSec = Math.round(sec / 5) * 5;
        const key = `${b.Title}|${b.Description}|${roundedSec}`;
        if (!seenSubs.has(key)) {
          seenSubs.add(key);
          uniqueSubBlurbs.push(b);
        }
      });
    }

    // Kronolojik sıraya koy - önce erken dakikalar işlensin
    uniqueSubBlurbs.sort((a, b) => (a.GameClockSecond || 0) - (b.GameClockSecond || 0));

    uniqueSubBlurbs.forEach(b => {
      const clockSec = b.GameClockSecond || 0;
      const minute = Math.ceil(clockSec / 60);
      const inName = b.Title ? b.Title.replace(/^\d+\.\s*/, '').trim() : null;
      const outRaw = b.Description ? b.Description.replace(/^Out\s+/i, '').replace(/^\d+\.\s*/, '').trim() : null;
      const inPid = inName ? findPlayer(inName) : null;
      const outPid = outRaw ? findPlayer(outRaw) : null;
      if (inPid && SFK_PLAYER_IDS_DYN.has(inPid)) {
        squadPlayerIds.add(inPid);
        if (!substitutions[inPid]) substitutions[inPid] = [];
        substitutions[inPid].push({ inAt: minute, outAt: null });
      }
      if (outPid && SFK_PLAYER_IDS_DYN.has(outPid)) {
        if (!substitutions[outPid]) substitutions[outPid] = [];
        const arr = substitutions[outPid];
        let last = null;
        for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].outAt === null) { last = arr[i]; break; } }
        if (last) last.outAt = minute;
        else substitutions[outPid].push({ inAt: 0, outAt: minute });
      }
    });

    // Dakika hesabı
    const calcMinutes = (pidNum, isStarter, gameDur) => {
      const subs = substitutions[pidNum] || [];
      if (isStarter) {
        const outSub = subs.find(s => s.inAt === 0 && s.outAt !== null);
        if (outSub) {
          let total = outSub.outAt;
          subs.filter(s => s.inAt > 0).forEach(s => total += (s.outAt || gameDur) - s.inAt);
          return total;
        }
        return gameDur;
      } else {
        if (subs.length === 0) return 0; // Kadroda ama oyuna girmedi
        let total = 0;
        subs.forEach(s => total += (s.outAt || gameDur) - s.inAt);
        return total;
      }
    };

    // ADIM 4: OLAYLAR — Gol, asist, kart
    const events = { goals:{}, assists:{}, yellowCards:{}, redCards:{} };
    const ambiguous = [...unknownRosterPlayers]; // Listede olmayan kadro oyuncuları

    // Rapportör filtresi - sadece manuel seçimde uygula
    let effectiveReporterId = selectedReporterId;
    let allowedEventIds = null;
    if (effectiveReporterId && reporterEvents[effectiveReporterId]) {
      allowedEventIds = reporterEvents[effectiveReporterId];
    }

    // Olaylar: SFK rapportörü varsa onun olaylarını al
    // SFK rapportörünün olmadığı tip+oyuncu kombinasyonları için diğer rapportörden tamamla
    const seenEvents = new Set(); // işlenen olaylar (tip+oyuncu key)
    const sfkRepEventIds = sfkReporters.length > 0 && reporterEvents[sfkReporters[0]?.memberId]
      ? reporterEvents[sfkReporters[0].memberId] : null;

    // SFK rapportörünün hangi tip+oyuncu kombinasyonlarını kapsadığını bul
    const sfkCoveredKeys = new Set();
    if (sfkRepEventIds && overview?.Blurbs) {
      overview.Blurbs.forEach(b => {
        if (sfkRepEventIds.has(b.ItemID)) {
          const key = `${b.TypeID}|${b.Title}`;
          sfkCoveredKeys.add(key);
        }
      });
    }

    if (overview && overview.Blurbs) {
      // SFK rapportörünün olayları önce, diğerleri sonra
      const sortedBlurbs = [...overview.Blurbs].sort((a, b) => {
        const aIsSfk = sfkRepEventIds?.has(a.ItemID) ? 0 : 1;
        const bIsSfk = sfkRepEventIds?.has(b.ItemID) ? 0 : 1;
        return aIsSfk - bIsSfk;
      });
      sortedBlurbs.forEach(b => {
        if (allowedEventIds && b.ItemID && !allowedEventIds.has(b.ItemID)) return;
        // SFK rapportörü bu tip+oyuncuyu kapsamışsa, başkasından geleni reddet
        const coverKey = `${b.TypeID}|${b.Title}`;
        if (sfkRepEventIds && sfkCoveredKeys.has(coverKey) && !sfkRepEventIds.has(b.ItemID)) return;
        const isOurTeam = isHome ? !b.IsAwayTeamAction : b.IsAwayTeamAction;
        if (!isOurTeam) return;
        // Duplicate kontrolü - her zaman uygula
        const eventKey = `${b.TypeID}|${b.Title}|${b.GameMinute}`;
        if (seenEvents.has(eventKey)) return;
        seenEvents.add(eventKey);
        const playerName = b.Title ? b.Title.replace(/^\d+\.\s*/, '').trim() : null;
        if (!playerName) return;
        const pid = findPlayer(playerName);
        if (b.TypeID === 1 && b.IsGoal) {
          if (pid) events.goals[pid] = (events.goals[pid] || 0) + 1;
          else ambiguous.push({ type: 'goal', rawName: playerName, minute: b.GameMinute, description: b.Description });
          const assistPrefix = b.Description && (b.Description.includes('Assist av:') ? 'Assist av:' : b.Description.includes('Assist by:') ? 'Assist by:' : null);
          if (assistPrefix) {
            const assistName = b.Description.replace(assistPrefix, '').trim().replace(/^\d+\.\s*/, '').trim();
            const apid = findPlayer(assistName);
            if (apid) events.assists[apid] = (events.assists[apid] || 0) + 1;
            else ambiguous.push({ type: 'assist', rawName: assistName, minute: b.GameMinute, description: b.Description });
          }
        } else if (b.TypeID === 6) {
          if (pid) events.yellowCards[pid] = (events.yellowCards[pid] || 0) + 1;
          else ambiguous.push({ type: 'yellowCard', rawName: playerName, minute: b.GameMinute, description: b.Description });
        } else if (b.TypeID === 7) {
          if (pid) events.redCards[pid] = (events.redCards[pid] || 0) + 1;
          else ambiguous.push({ type: 'redCard', rawName: playerName, minute: b.GameMinute, description: b.Description });
        }
      });
    }

    // TÜM KADRO — roster + lineup + değişiklikle giren oyuncular
    const players = [...squadPlayerIds].map(pidNum => {
      const isStarter = playerIsStarter[pidNum] === true;
      const minutesPlayed = calcMinutes(pidNum, isStarter, defaultDur);
      const playedInMatch = isStarter || (substitutions[pidNum] && substitutions[pidNum].length > 0);
      return {
        playerId: pidNum,
        name: SFK_PLAYERS_DYN[pidNum].name,
        shirt: playerShirtNos[pidNum] || SFK_PLAYERS_DYN[pidNum].shirt,
        thumbnail: playerThumbnails[pidNum] || null,
        position: playerPositions[pidNum] || '',
        isGoalkeeper: (playerPositions[pidNum] || '').includes('Goalkeeper'),
        isStarter,
        isInSquad: true,
        playedInMatch,
        played: true,
        selected: true,
        minutesPlayed,
        goals: events.goals[pidNum] || 0,
        assists: events.assists[pidNum] || 0,
        yellowCards: events.yellowCards[pidNum] || 0,
        redCards: events.redCards[pidNum] || 0,
      };
    }).sort((a,b) => {
      if (a.isGoalkeeper && !b.isGoalkeeper) return -1;
      if (!a.isGoalkeeper && b.isGoalkeeper) return 1;
      if (a.isStarter && !b.isStarter) return -1;
      if (!a.isStarter && b.isStarter) return 1;
      return a.shirt - b.shirt;
    });

    return res.status(200).json({
      gameId: parseInt(gameId),
      _debug: { homeTeamId: header?.HomeTeamID, awayTeamId: header?.AwayTeamID, homeRosterId: lineups?.HomeTeamGameTeamRoster?.TeamID, awayRosterId: lineups?.AwayTeamGameTeamRoster?.TeamID, tid, lineupKeys: lineups ? Object.keys(lineups) : [], homeLineupKeys: lineups?.HomeTeamLineUp ? Object.keys(lineups.HomeTeamLineUp) : [] },
      homeTeam: header.HomeTeamDisplayName,
      awayTeam: header.AwayTeamDisplayName,
      homeScore: header.HomeTeamScore,
      awayScore: header.AwayTeamScore,
      gameDate: header.GameTime,
      leagueName: header.LeagueName,
      gameType: getGameType(header.LeagueName),
      players,
      ambiguous,
      reporters: sfkReporters,
      selectedReporterId,

    });
  }

  // Maçı onayla ve database'e kaydet
  if (action === 'savematch' && req.method === 'POST') {
    const { gameId, gameDate, homeTeam, awayTeam, homeScore, awayScore,
            leagueName, gameType, players } = req.body || {};

    if (!gameId || !players) return res.status(400).json({ error: 'Information saknas' });
    const gameDuration = req.body.gameDuration || 90;

    // Maç zaten kayıtlı mı?
    const existing = await supabaseGet(`/matches?game_id=eq.${gameId}&select=id`);
    let matchId;

    if (Array.isArray(existing) && existing.length > 0) {
      matchId = existing[0].id;
      // Güncelle
      await httpPost(new URL(SUPABASE_URL).host, `/rest/v1/matches?id=eq.${matchId}`, {
        game_date: gameDate, home_team: homeTeam, away_team: awayTeam,
        home_score: homeScore, away_score: awayScore,
        league_name: leagueName, game_type: gameType,
        approved_by: user.id, approved_at: new Date().toISOString(),
      }, {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'X-HTTP-Method-Override': 'PATCH',
      });
    } else {
      // Yeni maç ekle
      const match = await supabaseRequest('POST', '/matches', {
        game_id: gameId, game_date: gameDate, home_team: homeTeam,
        away_team: awayTeam, home_score: parseInt(homeScore),
        away_score: parseInt(awayScore), league_name: leagueName,
        game_type: gameType, game_duration: parseInt(gameDuration) || 90,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      });
      matchId = Array.isArray(match) ? match[0].id : match.id;
    }

    // Oyuncu istatistiklerini kaydet
    for (const p of players) {
      const existingStat = await supabaseGet(`/player_stats?match_id=eq.${matchId}&player_id=eq.${p.playerId}&select=id`);
      const statData = {
        player_name: p.name,
        shirt_number: p.shirt,
        played: p.played,
        is_starter: p.isStarter || false,
        minutes_played: p.minutesPlayed || 0,
        goals: p.goals || 0,
        assists: p.assists || 0,
        yellow_cards: p.yellowCards || 0,
        red_cards: p.redCards || 0,
        thumbnail: p.thumbnail || null,
      };

      if (Array.isArray(existingStat) && existingStat.length > 0) {
        // Güncelle - DELETE + INSERT (PATCH güvenilir değil)
        const statId = existingStat[0].id;
        await supabaseRequest('DELETE', `/player_stats?id=eq.${statId}`, null);
        await supabaseRequest('POST', '/player_stats', {
          match_id: matchId,
          player_id: p.playerId,
          ...statData,
        });
      } else {
        await supabaseRequest('POST', '/player_stats', {
          match_id: matchId,
          player_id: p.playerId,
          ...statData,
        });
      }
    }

    return res.status(200).json({ success: true, matchId });
  }

  // Kayıtlı maçları listele
  if (action === 'savedmatches') {
    try {
      const matches = await supabaseGet('/matches?select=*&order=game_date.desc');
      if (!Array.isArray(matches)) return res.status(200).json([]);
      if (user.role === 'oyuncu') {
        return res.status(200).json(matches.map(m => ({ league_name: m.league_name })));
      }
      return res.status(200).json(matches);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Soyunma odası atamasını kaydet


  // Soyunma odası atamalarını getir
  // Kullanıcının takım erişimlerini getir
  if (action === 'getuserteams') {
    try {
      const userId = req.query.userId;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      const teams = await supabaseGet(`/user_team_access?user_id=eq.${userId}&select=*`);
      return res.status(200).json(Array.isArray(teams) ? teams : []);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Kullanıcının takım erişimlerini kaydet
  if (action === 'saveuserteams') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    if (user.role !== 'admin' && user.role !== 'klubbledare') return res.status(403).json({ error: 'Yetkisiz' });
    try {
      const { user_id, team_ids } = req.body; // team_ids: [{team_id, team_name}]
      if (!user_id) return res.status(400).json({ error: 'user_id required' });
      // Önce mevcut erişimleri sil
      await supabaseRequest('DELETE', `/user_team_access?user_id=eq.${user_id}`, null);
      // Yenilerini ekle
      if (Array.isArray(team_ids) && team_ids.length > 0) {
        for (const t of team_ids) {
          await supabaseRequest('POST', '/user_team_access', {
            user_id: parseInt(user_id),
            team_id: t.team_id,
            team_name: t.team_name,
          });
        }
      }
      return res.status(200).json({ ok: true });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Aktif takımları getir
  if (action === 'getactiveteams') {
    try {
      const teams = await supabaseGet('/active_teams?select=*&order=team_name.asc');
      return res.status(200).json(Array.isArray(teams) ? teams : []);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Takım aktif/pasif güncelle
  if (action === 'setactiveteam') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
    try {
      const { team_id, is_active } = req.body;
      if (!team_id) return res.status(400).json({ error: 'team_id required' });
      const result = await supabaseRequest('PATCH', `/active_teams?team_id=eq.${team_id}`, {
        is_active,
        updated_at: new Date().toISOString()
      });
      return res.status(200).json({ ok: true, result });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Aktif takımların oyuncularını çek
  if (action === 'fetchavatar') {
    const memberId = parseInt(req.query.memberId);
    if (!memberId) return res.status(400).json({ error: 'memberId krävs' });
    try {
      const mfToken = await getMinfotbollToken();
      // activeroster'dan ara
      const teams = await supabaseGet('/active_teams?is_active=eq.true&select=team_id,team_name');
      let avatarUrl = null;
      if (Array.isArray(teams)) {
        for (const t of teams) {
          try {
            const staffList = await minfotbollGet(`/api/teamapi/initteamstaffadminvc?TeamID=${t.team_id}`, mfToken);
            if (Array.isArray(staffList)) {
              const found = staffList.find(s => s.MemberID === memberId);
              if (found?.ThumbnailURL && !found.ThumbnailURL.includes('default')) {
                avatarUrl = found.ThumbnailURL; break;
              }
            }
          } catch(e) {}
          if (avatarUrl) break;
          try {
            const players = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${t.team_id}`, mfToken);
            if (Array.isArray(players)) {
              const found = players.find(p => p.MemberID === memberId);
              if (found?.ThumbnailURL && !found.ThumbnailURL.includes('default')) {
                avatarUrl = found.ThumbnailURL; break;
              }
            }
          } catch(e) {}
          if (avatarUrl) break;
        }
      }
      return res.status(200).json({ avatarUrl });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'activeroster') {
    try {
      const mfToken = await getMinfotbollToken();
      const teams = await supabaseGet('/active_teams?is_active=eq.true&select=team_id,team_name&order=team_id.asc');
      if (!Array.isArray(teams) || teams.length === 0) return res.status(200).json([]);
      const results = [];
      const seenPlayerIds = new Set(); // Her oyuncu sadece BİR takımda görünsün (ilk geldiği takım)
      // Paralel değil sıralı çek - sıra önemli (ilk takım kazanır)
      for (const t of teams) {
        try {
          const players = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${t.team_id}`, mfToken);
          if (!Array.isArray(players)) continue;
          players.forEach(p => {
            if (seenPlayerIds.has(p.PlayerID)) return; // Zaten başka takımda kayıtlı
            seenPlayerIds.add(p.PlayerID);
            results.push({
              teamId  : t.team_id,
              teamName: t.team_name,
              playerId: p.PlayerID,
              memberId: p.MemberID,
              name    : p.FullName || `${p.FirstName} ${p.LastName}`,
              shirt   : p.ShirtNumber,
              thumbnail: p.ThumbnailURL || null,
            });
          });
        } catch(e) {}
      }
      // Staff (lag ledare) - initteamstaffadminvc endpoint'i ile çek
      try {
        const seenStaffIds = new Set();
        for (const t of teams) {
          try {
            const staffList = await minfotbollGet(`/api/teamapi/initteamstaffadminvc?TeamID=${t.team_id}`, mfToken);
            if (!Array.isArray(staffList)) continue;
            staffList.forEach(s => {
              if (!s.MemberID || !s.FullName) return;
              if (seenStaffIds.has(s.MemberID)) return;
              seenStaffIds.add(s.MemberID);
              results.push({
                teamId  : t.team_id,
                teamName: t.team_name,
                playerId: null,
                memberId: s.MemberID,
                name    : s.FullName,
                shirt   : null,
                thumbnail: s.ThumbnailURL || null,
                type    : 'staff',
                role    : s.TeamStaffRoleName || s.RoleName || '',
              });
            });
          } catch(e) {}
        }
      } catch(e) {}

      results.sort((a,b) => a.teamName.localeCompare(b.teamName, 'sv') || a.name.localeCompare(b.name, 'sv'));
      return res.status(200).json(results);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'getrooms') {
    try {
      const sessionName = req.query.session;
      const from = req.query.from || '';
      const to   = req.query.to   || '';
      if (sessionName) {
        // Belirli bir session'ın kayıtları
        const path = `/room_assignments?session_name=eq.${encodeURIComponent(sessionName)}&select=*&order=game_date.asc`;
        const rooms = await supabaseGet(path);
        return res.status(200).json(Array.isArray(rooms) ? rooms : []);
      }
      // Manuel maçları tarih aralığına göre getir
      if (req.query.manual === 'true') {
        let path = `/room_assignments?is_manual=eq.true&select=*&order=game_date.asc`;
        if (from) path += `&game_date=gte.${from}`;
        if (to)   path += `&game_date=lte.${to}T23:59:59`;
        const manualGames = await supabaseGet(path);
        return res.status(200).json(Array.isArray(manualGames) ? manualGames : []);
      }
      // Tüm session bilgilerini getir
      const path = `/room_assignments?select=session_name,game_date,updated_at&order=updated_at.desc`;
      const rows = await supabaseGet(path);
      if (!Array.isArray(rows)) return res.status(200).json({ sessions: [] });
      // Her session için: en son updated_at, min/max game_date
      const sessionMap = {};
      rows.forEach(r => {
        if (!r.session_name) return;
        if (!sessionMap[r.session_name]) {
          sessionMap[r.session_name] = { name: r.session_name, updatedAt: r.updated_at, minDate: r.game_date, maxDate: r.game_date };
        } else {
          const s = sessionMap[r.session_name];
          if (r.updated_at > s.updatedAt) s.updatedAt = r.updated_at;
          if (r.game_date < s.minDate) s.minDate = r.game_date;
          if (r.game_date > s.maxDate) s.maxDate = r.game_date;
        }
      });
      // En son güncellenen önce
      const sessions = Object.values(sessionMap).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      return res.status(200).json({ sessions });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Arena/Venue bilgisi - maçtan arena ID'si al
  if (action === 'venueinfo') {
    const gameId = req.query.gameId;
    if (!gameId) return res.status(400).json({ error: 'gameId kravs' });
    try {
      const mfToken = await getMinfotbollToken();
      const overview = await minfotbollGet(`/api/magazinegameviewapi/initgameoverview?GameID=${gameId}`, mfToken);
      const arena = overview?.Arena || {};
      // getgamedetail'den takım bilgisi çek
      const detail = await minfotbollGet(`/api/getgamedetail?GameID=${gameId}`, mfToken);
      // GameResults içinden takım bilgisi çek
      const results = overview?.GameResults || {};
      const homeTeamId   = results.HomeTeamID || null;
      const awayTeamId   = results.AwayTeamID || null;
      const homeTeamName = results.HomeTeamName || results.HomeTeamDisplayName || null;
      const awayTeamName = results.AwayTeamName || results.AwayTeamDisplayName || null;
      const homeClubId   = results.HomeTeamClubID || null;
      const awayClubId   = results.AwayTeamClubID || null;
      // GameStats'tan da dene
      const stats = overview?.GameStats || {};
      return res.status(200).json({
        arenaId: arena.ArenaID || null,
        arenaName: arena.ArenaName || null,
        latitude: arena.Latitude || null,
        longitude: arena.Longitude || null,
        homeTeamId: detail?.HomeTeamID || null,
        homeTeamName: detail?.HomeTeamDisplayName || null,
        homeClubId: detail?.HomeTeamClubID || null,
        homeClubName: detail?.HomeTeamClubName || null,
        awayTeamId: detail?.AwayTeamID || null,
        awayTeamName: detail?.AwayTeamDisplayName || null,
        awayClubId: detail?.AwayTeamClubID || null,
        awayClubName: detail?.AwayTeamClubName || null,
      });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Omklädningsrum - tüm SFK arenalarındaki maçlar, tarih aralığına göre
  // Yöntem: ClubID=1917 ile tüm kulüp maçlarını çek, SFK arenalarına göre filtrele
  if (action === 'arenagames') {
    const { dateFrom, dateTo } = req.query;

    // SFK arenalarının MinFotboll ArenaID'leri (doğrulanmış):
    // 21808 = Norrvikens IP 1
    // 21815 = Norrvikens IP 2 Hall
    // 20977 = Sollentuna Fotbollshall 1
    // 20976 = Sollentuna Fotbollshall
    // 20586 = Edsbergs Sportfält
    // 20588 = Edsbergs Sportfält 2
    // 20591 = Edsbergs Sportfält 3
    const SFK_ARENA_IDS = new Set([21808, 21815, 20977, 20976, 20586, 20588, 20591, 21807]);

    const from = dateFrom || new Date().toISOString().slice(0, 10);
    const to   = dateTo   || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    try {
      const mfToken = await getMinfotbollToken();
      const allGames = [];
      const seen = new Set();

      // Kulübün tüm coming maçlarını çek (pagination ile)
      const allClubGames = [];
      let lastGameId = 0;
      let page = 0;
      while (page < 20) { // max 20 sayfa (200 maç)
        const batch = await minfotbollGet(
          `/api/clubapi/getcomingclubgames?ClubID=1917&LastGameID=${lastGameId}`, mfToken
        );
        if (!Array.isArray(batch) || batch.length === 0) break;
        allClubGames.push(...batch);
        lastGameId = batch[batch.length - 1].GameID;
        // Tarih aralığı aşıldıysa erken çık
        const lastDate = batch[batch.length - 1].GameTime?.slice(0, 10) || '';
        if (lastDate > to) break;
        if (batch.length < 10) break; // son sayfa
        page++;
      }

      allClubGames.forEach(g => {
        if (!SFK_ARENA_IDS.has(g.ArenaID)) return;
        if (seen.has(g.GameID)) return;
        const gDate = g.GameTime ? g.GameTime.slice(0, 10) : '';
        if (gDate < from || gDate > to) return;
        seen.add(g.GameID);
        allGames.push({
          gameId    : g.GameID,
          gameDate  : g.GameTime,
          homeTeam  : fixTeamName(g.HomeTeamID, g.HomeTeamDisplayName),
          awayTeam  : fixTeamName(g.AwayTeamID, g.AwayTeamDisplayName),
          homeTeamId: g.HomeTeamID || null,
          awayTeamId: g.AwayTeamID || null,
          homeClubId: g.HomeTeamClubID || null,
          awayClubId: g.AwayTeamClubID || null,
          homeLogo  : g.HomeTeamClubLogoURL || null,
          awayLogo  : g.AwayTeamClubLogoURL || null,
          homeScore : g.HomeTeamScore ?? null,
          awayScore : g.AwayTeamScore ?? null,
          arenaId   : g.ArenaID,
          arenaName : g.ArenaName,
          leagueName: g.LeagueName || g.LeagueDisplayName || '—',
          gameType  : getGameType(g.LeagueName || g.LeagueDisplayName || ''),
          statusId  : g.GameStatusID,
        });
      });

      // Sollentuna Utveckling FK (ClubID: 4485) — ayrı kulüp, aynı arenalar
      // TeamID 511901: P16 U, TeamID 526570: P18 U
      for (const utvTeamId of [511901, 526570]) {
        const utvGames = await minfotbollGet(`/api/teamapi/getcomingteamgames?TeamID=${utvTeamId}`, mfToken);
        if (Array.isArray(utvGames)) {
          utvGames.forEach(g => {
            if (!SFK_ARENA_IDS.has(g.ArenaID)) return;
            if (seen.has(g.GameID)) return;
            const gDate = g.GameTime ? g.GameTime.slice(0, 10) : '';
            if (gDate < from || gDate > to) return;
            seen.add(g.GameID);
            allGames.push({
              gameId    : g.GameID,
              gameDate  : g.GameTime,
              homeTeam  : fixTeamName(g.HomeTeamID, g.HomeTeamDisplayName),
              awayTeam  : fixTeamName(g.AwayTeamID, g.AwayTeamDisplayName),
              homeTeamId: g.HomeTeamID || null,
              awayTeamId: g.AwayTeamID || null,
              homeClubId: g.HomeTeamClubID || null,
              awayClubId: g.AwayTeamClubID || null,
              homeLogo  : g.HomeTeamClubLogoURL || null,
              awayLogo  : g.AwayTeamClubLogoURL || null,
              homeScore : g.HomeTeamScore ?? null,
              awayScore : g.AwayTeamScore ?? null,
              arenaId   : g.ArenaID,
              arenaName : g.ArenaName,
              leagueName: g.LeagueName || g.LeagueDisplayName || '—',
              gameType  : getGameType(g.LeagueName || g.LeagueDisplayName || ''),
              statusId  : g.GameStatusID,
            });
          });
        }
      }

      allGames.sort((a, b) => new Date(a.gameDate) - new Date(b.gameDate));
      return res.status(200).json({ count: allGames.length, games: allGames });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DEBUG: Gerçek bir maçın arena bilgisini ve çevre endpoint'leri incele
  if (action === 'debugarena') {
    const from = req.query.from || '2026-04-01';
    const to   = req.query.to   || '2026-06-30';
    try {
      const mfToken = await getMinfotbollToken();
      const results = {};

      // Adım 1: Bilinen bir ligden gerçek maçları çek
      // P16 2026 liginden maç al
      const leagueGames = await minfotbollGet(
        `/api/leagueapi/getleaguegames?leagueId=129362`, mfToken
      );
      const sample = Array.isArray(leagueGames) ? leagueGames.slice(0, 3) : [];
      results['league_sample'] = sample.map(g => ({
        GameID: g.GameID,
        GameTime: g.GameTime,
        Home: g.HomeTeamDisplayName,
        Away: g.AwayTeamDisplayName,
        StatusID: g.GameStatusID,
      }));

      // Adım 2: İlk maçın overview'unu çek — arena bilgisi
      if (sample.length > 0) {
        const gameId = sample[0].GameID;
        const overview = await minfotbollGet(
          `/api/magazinegameviewapi/initgameoverview?GameID=${gameId}`, mfToken
        );
        results['overview_arena'] = overview?.Arena || 'No Arena field';
        results['overview_keys'] = overview ? Object.keys(overview) : [];

        // Adım 3: getgameheaderinfo — arena var mı?
        const header = await minfotbollGet(
          `/api/gameapi/getgameheaderinfo?id=${gameId}`, mfToken
        );
        results['header_keys'] = header ? Object.keys(header) : [];
        results['header_arena'] = header?.Arena || header?.ArenaID || header?.Facility || 'none';
        results['header_sample'] = header;
      }

      // Adım 4: Farklı tarih formatlarıyla dene
      const arenaId = '21808';
      const formatTests = [
        `/api/leagueapi/getleaguegamesbyfacility?facilityId=${arenaId}&fromDate=${from}&toDate=${to}`,
        `/api/leagueapi/getgamesbyfacility?facilityId=${arenaId}&fromDate=${from}&toDate=${to}`,
        `/api/gameresultapi/getresults?facilityId=${arenaId}&fromDate=${from}&toDate=${to}`,
        `/api/gameresultapi/getresults?ArenaID=${arenaId}&DateFrom=${from}&DateTo=${to}`,
        `/api/gameapi/getgames?facilityId=${arenaId}&fromDate=${from}&toDate=${to}`,
        `/api/matchapi/getmatchesbyfacility?facilityId=${arenaId}&fromDate=${from}&toDate=${to}`,
      ];
      for (const ep of formatTests) {
        try {
          const r = await minfotbollGet(ep, mfToken);
          const isArr = Array.isArray(r);
          const len = isArr ? r.length : (r && typeof r === 'object' ? Object.keys(r).length : -1);
          if (len > 0) {
            results[ep] = { HIT: true, isArray: isArr, length: len, sample: isArr ? r[0] : r };
          } else {
            results[ep] = { empty: true, type: typeof r };
          }
        } catch(e) {
          results[ep] = { error: e.message };
        }
      }

      return res.status(200).json(results);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }


  // SFK kadro listesi - oyuncular + staff
  if (action === 'sfkroster') {
    try {
      const mfToken = await getMinfotbollToken();
      const results = [];

      // Her iki takımın oyuncularını çek
      for (const teamId of [398871, 74782]) {
        const teamLabel = teamId === 398871 ? 'P16' : 'P17';
        const players = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${teamId}`, mfToken);
        if (Array.isArray(players)) {
          players.forEach(p => {
            results.push({
              type: 'player',
              memberId: p.MemberID,
              playerId: p.PlayerID,
              name: p.FullName || `${p.FirstName} ${p.LastName}`,
              shirt: p.ShirtNumber,
              team: teamLabel,
              thumbnail: p.ThumbnailURL || null,
            });
          });
        }
      }

      // Son maçlardan staff listesini çek
      const matches = await supabaseGet('/matches?select=game_id&order=game_date.desc&limit=3');
      const seenMembers = new Set();
      if (Array.isArray(matches)) {
        for (const match of matches) {
          const lineups = await minfotbollGet(`/api/magazinegameviewapi/initgamelineups?GameID=${match.game_id}`, mfToken);
          for (const roster of [lineups?.HomeTeamGameTeamRoster, lineups?.AwayTeamGameTeamRoster]) {
            if (!roster?.TeamStaff) continue;
            if (roster.TeamID !== 398871 && roster.TeamID !== 74782) continue;
            roster.TeamStaff.forEach(s => {
              if (seenMembers.has(s.MemberID)) return;
              seenMembers.add(s.MemberID);
              results.push({
                type: 'staff',
                memberId: s.MemberID,
                playerId: null,
                name: s.FullName,
                role: s.TeamStaffRoleName,
                team: roster.TeamID === 398871 ? 'P16' : 'P17',
                thumbnail: s.ThumbnailURL || null,
              });
            });
          }
        }
      }

      return res.status(200).json(results.sort((a,b) => a.name.localeCompare(b.name, 'sv')));
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }
  if (action === 'pastteamgames') {
    try {
      const mfToken = await getMinfotbollToken();
      const teamId = req.query.teamId;
      if (!teamId) return res.status(400).json({ error: 'teamId required' });
      const site = await minfotbollGet(`/api/teamapi/initteamsite?teamId=${teamId}`, mfToken);
      if (!site || typeof site !== 'object') return res.status(200).json({ error: 'no data' });
      const mag = site.MagazineBlurbs || [];
      const rankings = site.TeamRankings || [];
      return res.status(200).json({
        magCount: mag.length,
        magSample: mag.slice(0, 3),
        rankingsCount: rankings.length,
        rankingsSample: rankings.slice(0, 2),
        allKeys: Object.keys(site),
      });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'getlineup') {
    try {
      const mfToken = await getMinfotbollToken();
      const gameId = req.query.gameId;
      const teamId = parseInt(req.query.teamId);
      if (!gameId) return res.status(400).json({ error: 'gameId required' });
      const lineups = await minfotbollGet(`/api/magazinegameviewapi/initgamelineups?GameID=${gameId}`, mfToken);
      const isHome = lineups?.HomeTeamLineUp?.TeamID === teamId || lineups?.HomeTeamGameTeamRoster?.TeamID === teamId;
      const roster = isHome ? lineups?.HomeTeamGameTeamRoster : lineups?.AwayTeamGameTeamRoster;
      if (!roster?.Players) return res.status(200).json({ players: [], teamId, isHome });
      const players = roster.Players.map(p => ({
        playerId: p.PlayerID,
        name: `${p.FirstName || ''} ${p.LastName || ''}`.trim(),
        shirt: p.ShirtNumber || 0,
      }));
      return res.status(200).json({ players, teamId, isHome, rosterTeamId: roster.TeamID });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'teamgames') {
    try {
      const mfToken = await getMinfotbollToken();
      const teamId = req.query.teamId || '511901';
      // Takımın coming maçlarını çek
      const games = await minfotbollGet(`/api/teamapi/getcomingteamgames?TeamID=${teamId}`, mfToken);
      if (!Array.isArray(games)) return res.status(200).json({ raw: games, count: 0 });
      return res.status(200).json({
        count: games.length,
        games: games.map(g => ({
          gameId   : g.GameID,
          gameDate : g.GameTime,
          homeTeam : g.HomeTeamDisplayName,
          awayTeam : g.AwayTeamDisplayName,
          arenaId  : g.ArenaID,
          arenaName: g.ArenaName,
          leagueId : g.LeagueID,
          leagueName: g.LeagueDisplayName,
          homeClubId: g.HomeTeamClubID,
        }))
      });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'clubteams') {
    try {
      const mfToken = await getMinfotbollToken();
      const clubId = req.query.clubId || '4485';
      const data = await minfotbollGet(`/api/clubapi/initclubteams?ClubID=${clubId}`, mfToken);
      return res.status(200).json(data);
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

if (action === 'clubgames') {
    try {
      const mfToken = await getMinfotbollToken();
      const clubId = req.query.clubId || '1917';
      // Tüm coming maçları pagination ile çek
      const allGamesForTeams = [];
      let lastId = 0;
      for (let p = 0; p < 20; p++) {
        const batch = await minfotbollGet(`/api/clubapi/getcomingclubgames?ClubID=${clubId}&LastGameID=${lastId}`, mfToken);
        if (!Array.isArray(batch) || batch.length === 0) break;
        allGamesForTeams.push(...batch);
        lastId = batch[batch.length - 1].GameID;
        if (batch.length < 10) break;
      }
      const teams = {};
      allGamesForTeams.forEach(g => {
        if (g.HomeTeamClubID === parseInt(clubId) || g.HomeTeamClubName?.toLowerCase().includes('sollentuna')) {
          teams[g.HomeTeamID] = g.HomeTeamDisplayName;
        }
        if (g.AwayTeamClubID === parseInt(clubId) || g.AwayTeamClubName?.toLowerCase().includes('sollentuna')) {
          teams[g.AwayTeamID] = g.AwayTeamDisplayName;
        }
      });
      return res.status(200).json({
        comingCount: allGamesForTeams.length,
        sfkTeams: teams,
        comingSample: allGamesForTeams.slice(0, 2),
        searchResult: req.query.gameId ? (allGamesForTeams.find(g => g.GameID === parseInt(req.query.gameId)) || null) : undefined,
      });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'rawgame') {
    try {
      const mfToken = await getMinfotbollToken();
      const leagueId = req.query.leagueId || '59554';
      const games = await minfotbollGet('/api/leagueapi/getleaguegames?leagueId=' + leagueId, mfToken);
      if (!Array.isArray(games) || games.length === 0) return res.status(200).json({ count: 0 });
      // SFK olan ilk maçı bul
      const sfk = games.find(g =>
        g.HomeTeamClubName?.toLowerCase().includes('sollentuna') ||
        g.AwayTeamClubName?.toLowerCase().includes('sollentuna')
      );
      return res.status(200).json({ raw: sfk || games[0] });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'playerraw') {
    try {
      const mfToken = await getMinfotbollToken();
      const playerId = parseInt(req.query.playerId || '597435');
      const roster = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=398871`, mfToken);
      const player = Array.isArray(roster) ? roster.find(p => p.PlayerID === playerId) : null;
      // Ayrıca member endpoint dene
      // Farklı endpointler dene
      let memberData = null;
      const memberId = player?.MemberID;
      const teamPlayerID = player?.TeamPlayerID;
      const endpoints = [
        `/api/playerapi/initplayerprofile?TeamPlayerID=${teamPlayerID}&GamePlayerID=0`,
      ];
      // Her endpoint'i ayrı ayrı dene ve sonuçları topla
      const allResults = {};
      for (const ep of endpoints) {
        try {
          const r = await minfotbollGet(ep, mfToken);
          if (r !== null && r !== undefined && r !== '') {
            allResults[ep] = { keys: typeof r === 'object' ? Object.keys(r) : [], data: r };
          }
        } catch(e) { allResults[ep] = { error: e.message }; }
      }
      memberData = allResults;
      return res.status(200).json({
        playerKeys: player ? Object.keys(player) : [],
        playerRaw: player,
        memberData,
      });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  if (action === 'testleague') {
    try {
      const mfToken = await getMinfotbollToken();
      const leagueId = req.query.leagueId || '59554';
      const teamId   = parseInt(req.query.teamId || '398871');
      const games    = await minfotbollGet('/api/leagueapi/getleaguegames?leagueId=' + leagueId, mfToken);
      if (!Array.isArray(games) || games.length === 0) {
        return res.status(200).json({ count: 0, raw: typeof games === 'string' ? games.slice(0,200) : games });
      }
      // teamId=0 -> debug: ligdeki tum takimlari listele
      if (teamId === 0) {
        const teams = {};
        games.forEach(g => {
          teams[g.HomeTeamID] = g.HomeTeamDisplayName;
          teams[g.AwayTeamID] = g.AwayTeamDisplayName;
        });
        // Sollentuna iceren takim isimlerini ayir
        const sfkTeams = Object.entries(teams)
          .filter(([id, name]) => name && name.toLowerCase().includes('sollentuna'))
          .reduce((acc, [id, name]) => { acc[id] = name; return acc; }, {});
        // ClubID'leri de topla
        const clubs = {};
        games.forEach(g => {
          clubs[g.HomeTeamClubID] = g.HomeTeamClubName;
          clubs[g.AwayTeamClubID] = g.AwayTeamClubName;
        });
        const sfkClubs = Object.entries(clubs)
          .filter(([id, name]) => name && name.toLowerCase().includes('sollentuna'))
          .reduce((acc, [id, name]) => { acc[id] = name; return acc; }, {});
        return res.status(200).json({ count: games.length, sfkTeams, sfkClubs, allTeams: teams, allClubs: clubs });
      }

      // Sadece ev macları
      const homeGames = games
        .filter(g => g.HomeTeamID === teamId)
        .map(g => ({
          GameID   : g.GameID,
          GameTime : g.GameTime,
          Home     : g.HomeTeamDisplayName,
          Away     : g.AwayTeamDisplayName,
          ArenaID  : g.ArenaID,
          ArenaName: g.ArenaName,
          StatusID : g.GameStatusID,
        }));
      // Ligdeki tüm benzersiz ArenaID'ler
      const arenaIds     = [...new Set(games.map(g => g.ArenaID).filter(Boolean))];
      const facilityIds  = [...new Set(games.map(g => g.FacilityID).filter(Boolean))];
      return res.status(200).json({
        count      : games.length,
        allKeys    : Object.keys(games[0]),
        hasArenaID : 'ArenaID' in games[0],
        hasFacilityID: 'FacilityID' in games[0],
        arenaIds,
        facilityIds,
        homeGames,
      });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }


  // Tek oda atamasını kaydet/güncelle
  if (action === 'saveroom') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    try {
      const { game_id, game_date, home_team, away_team, arena_id, arena_name,
              home_room, away_room, notes, status, extra_json,
              home_logo, away_logo, session_name, is_manual, manual_label } = req.body;
      const gameIdVal = game_id || req.body.gameId;
      if (!gameIdVal) return res.status(400).json({ error: 'game_id required' });
      const row = {
        game_id: gameIdVal, game_date, home_team, away_team, arena_id, arena_name,
        home_room: home_room || null, away_room: away_room || null,
        notes: notes || null, status: status || 'pending',
        extra_json: extra_json || null,
        home_logo: home_logo || null, away_logo: away_logo || null,
        session_name: session_name || null,
        is_manual: is_manual || false,
        manual_label: manual_label || null,
        updated_at: new Date().toISOString()
      };
      let result;
      if (session_name) {
        const existing = await supabaseGet(
          `/room_assignments?game_id=eq.${gameIdVal}&session_name=eq.${encodeURIComponent(session_name)}`
        );
        if (Array.isArray(existing) && existing.length > 0) {
          result = await supabaseRequest('PATCH',
            `/room_assignments?game_id=eq.${gameIdVal}&session_name=eq.${encodeURIComponent(session_name)}`, row);
        } else {
          result = await supabaseRequest('POST', '/room_assignments', row);
        }
      } else {
        const existing = await supabaseGet(`/room_assignments?game_id=eq.${gameIdVal}&session_name=is.null`);
        if (Array.isArray(existing) && existing.length > 0) {
          result = await supabaseRequest('PATCH',
            `/room_assignments?game_id=eq.${gameIdVal}&session_name=is.null`, row);
        } else {
          result = await supabaseRequest('POST', '/room_assignments', row);
        }
      }
      return res.status(200).json({ ok: true, result });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Oda atamasını sil
  if (action === 'deleteroom') {
    try {
      const gameId     = req.query.gameId;
      const sessionDel = req.query.session;
      if (sessionDel) {
        // Tüm session'ı sil
        await supabaseRequest('DELETE', `/room_assignments?session_name=eq.${encodeURIComponent(sessionDel)}`, null);
        return res.status(200).json({ ok: true, deleted: 'session' });
      }
      if (!gameId) return res.status(400).json({ error: 'gameId required' });
      await supabaseRequest('DELETE', `/room_assignments?game_id=eq.${gameId}`, null);
      return res.status(200).json({ ok: true });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  // Onay durumunu güncelle
  if (action === 'approveroom') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
    try {
      const { game_id, status } = req.body; // status: 'approved' | 'pending' | 'rejected'
      if (!game_id) return res.status(400).json({ error: 'game_id required' });
      const result = await supabaseRequest('PATCH', `/room_assignments?game_id=eq.${game_id}`,
        { status, updated_at: new Date().toISOString() });
      return res.status(200).json({ ok: true, result });
    } catch(e) { return res.status(500).json({ error: e.message }); }
  }

  res.status(400).json({ error: 'Ogiltig åtgärd' });
};

// deploy trigger Wed Mar 25 13:32:45 UTC 2026
