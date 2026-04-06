const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'sfk2026gizliAnahtar!';

const SFK_PLAYERS = {
  // P16A
  583483:{name:'Gabriel Saadi',shirt:1,birthYear:2010},
  562656:{name:'Alexander Hansen',shirt:2,birthYear:2010},
  659792:{name:'Jeyson Sissah Nkanga Ngudi Jose',shirt:3,birthYear:2010},
  571649:{name:'Filip Kjellgren',shirt:4,birthYear:2010},
  572299:{name:'Alf Markusson',shirt:5,birthYear:2010},
  597435:{name:'Linus Olofsson',shirt:6,birthYear:2010},
  700142:{name:'Leo Olausson',shirt:7,birthYear:2010},
  595639:{name:'Hugo Meyer',shirt:8,birthYear:2010},
  571652:{name:'Gabriel Mocsary',shirt:9,birthYear:2010},
  558820:{name:'Frank Lundh',shirt:10,birthYear:2010},
  571659:{name:'Emil Wallberg',shirt:11,birthYear:2010},
  589844:{name:'Vincent Ekström Lundin',shirt:12,birthYear:2010},
  572290:{name:'Badou Badjan',shirt:14,birthYear:2010},
  572006:{name:'Gus Stefansson',shirt:16,birthYear:2010},
  595633:{name:'Cian Hogan',shirt:17,birthYear:2010},
  606521:{name:'Aksel Yesil',shirt:19,birthYear:2010},
  700147:{name:'Charlie Nordenson',shirt:20,birthYear:2010},
  576573:{name:'Albin Nordin',shirt:21,birthYear:2010},
  571068:{name:'Viggo Sejnäs',shirt:31,birthYear:2010},
  595628:{name:'Valter Ekehov',shirt:66,birthYear:2010},
  573259:{name:'Love Nytén',shirt:77,birthYear:2010},
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
  // Utveckling P16U
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

// Dinamik roster cache
let _rosterCache = null;
let _rosterCacheTime = 0;
async function getDynamicRoster(mfToken) {
  if (_rosterCache && Date.now() - _rosterCacheTime < 5 * 60 * 1000) return _rosterCache;
  try {
    const activeTeams = await supabaseGet('/active_teams?is_active=eq.true&select=team_id,team_name');
    if (!Array.isArray(activeTeams)) return SFK_PLAYERS;
    const dynamicPlayers = {};
    await Promise.all(activeTeams.map(async (t) => {
      try {
        const players = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${t.team_id}`, mfToken);
        if (!Array.isArray(players)) return;
        players.forEach(p => {
          if (!p.PlayerID) return;
          dynamicPlayers[p.PlayerID] = {
            name: p.FullName || `${p.FirstName||''} ${p.LastName||''}`.trim(),
            shirt: p.ShirtNumber || 0,
            team: t.team_name,
            memberId: p.MemberID || null,
            thumbnail: p.ThumbnailURL || null,
          };
        });
      } catch(e) {}
    }));
    // Statik fallback ekle
    Object.keys(SFK_PLAYERS).forEach(pid => {
      if (!dynamicPlayers[pid]) dynamicPlayers[pid] = SFK_PLAYERS[pid];
    });
    _rosterCache = dynamicPlayers;
    _rosterCacheTime = Date.now();
    return _rosterCache;
  } catch(e) { return SFK_PLAYERS; }
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

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL);
    const req = https.request({
      host: url.host,
      path: `/rest/v1${path}`,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => { const data = Buffer.concat(chunks).toString('utf-8'); try{resolve(JSON.parse(data))}catch(e){resolve(data)} });
    });
    req.on('error', reject);
    req.end();
  });
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

const MINFOTBOLL_API = 'minfotboll-api.azurewebsites.net';

function minfotbollGet(path, token) {
  return httpGet(MINFOTBOLL_API, path, { 'Authorization': `Bearer ${token}` });
}

async function getMinfotbollToken() {
  const refreshToken = process.env.MINFOTBOLL_REFRESH_TOKEN;
  const accessToken = process.env.MINFOTBOLL_ACCESS_TOKEN;
  const result = await httpPost(MINFOTBOLL_API, '/api/jwtapi/refreshtoken', {accessToken, refreshToken});
  if (!result?.AccessToken) throw new Error('MinFotboll-token kunde inte hämtas');
  return result.AccessToken;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const user = verifyToken(token);
  if (!user) return res.status(401).json({ error: 'Vänligen logga in' });

  const action = req.query.action;

  // Tüm oyuncu istatistikleri (admin + antrenör)
  if (action === 'playerstats') {
    if (user.role === 'oyuncu') return res.status(403).json({ error: 'Yetki yok' });

    const { gameType, dateFrom, dateTo, leagueNames, playerIds, teamId } = req.query;
    const leagueNameList = leagueNames ? leagueNames.split('|') : [];
    const playerIdList = playerIds ? playerIds.split('|').map(Number) : [];

    // Dinamik roster yükle
    const mfToken = await getMinfotbollToken().catch(() => null);
    const DYNAMIC_PLAYERS = mfToken ? await getDynamicRoster(mfToken) : DYNAMIC_PLAYERS;

    // Maçları filtrele
    let matchQuery = '/matches?select=*';
    if (gameType && gameType !== 'hepsi') matchQuery += `&game_type=eq.${gameType}`;
    if (dateFrom) matchQuery += `&game_date=gte.${dateFrom}`;
    if (dateTo) matchQuery += `&game_date=lte.${dateTo}T23:59:59`;

    let matches = await supabaseGet(matchQuery);
    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(200).json({ players: [], totalGames: 0 });
    }

    // teamId varsa: o takımın adını bul ve maçları filtrele
    if (teamId) {
      const activeTeams = await supabaseGet('/active_teams?select=team_id,team_name');
      const teamObj = Array.isArray(activeTeams) ? activeTeams.find(t => t.team_id === parseInt(teamId)) : null;
      const teamName = teamObj?.team_name;
      if (teamName) {
        // Esnek eşleşme — takım adındaki kelimeleri kontrol et
        const teamWords = teamName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        matches = matches.filter(m => {
          const home = (m.home_team || '').toLowerCase();
          const away = (m.away_team || '').toLowerCase();
          return teamWords.every(w => home.includes(w)) || teamWords.every(w => away.includes(w));
        });
      }
    }

    // Lig ismine göre filtrele
    if (leagueNameList.length > 0) {
      matches = matches.filter(m => leagueNameList.includes(m.league_name));
    }
    if (matches.length === 0) {
      return res.status(200).json({ players: [], totalGames: 0 });
    }

    const matchIds = matches.map(m => m.id);
    const stats = await supabaseGet(`/player_stats?match_id=in.(${matchIds.join(',')})&select=*`);

    // Oyuncu bazında topla
    const playerMap = {};
    if (Array.isArray(stats)) {
      stats.forEach(s => {
        // playerIds filtresi varsa sadece o oyuncuları dahil et
        if (playerIdList.length > 0 && !playerIdList.includes(s.player_id)) return;
        if (!playerMap[s.player_id]) {
          playerMap[s.player_id] = {
            playerId: s.player_id,
            name: DYNAMIC_PLAYERS[s.player_id]?.name || s.player_name,
            shirt: DYNAMIC_PLAYERS[s.player_id]?.shirt || 0,
            games: 0, starterGames: 0, goals: 0, assists: 0,
            yellowCards: 0, redCards: 0, minutesPlayed: 0,
          };
        }
        if (s.played) {
          playerMap[s.player_id].games++;
          if (s.is_starter) playerMap[s.player_id].starterGames++;
          playerMap[s.player_id].minutesPlayed += s.minutes_played || 0;
        }
        playerMap[s.player_id].goals += s.goals || 0;
        playerMap[s.player_id].assists += s.assists || 0;
        playerMap[s.player_id].yellowCards += s.yellow_cards || 0;
        playerMap[s.player_id].redCards += s.red_cards || 0;
      });
    }

    // Oyuncu listesi
    let playerKeys;
    if (playerIdList.length > 0) {
      // Manuel oyuncu filtresi varsa sadece onlar
      playerKeys = [...new Set([
        ...Object.keys(DYNAMIC_PLAYERS).filter(pid => playerIdList.includes(parseInt(pid))),
        ...Object.keys(playerMap).filter(pid => playerIdList.includes(parseInt(pid)))
      ])];
    } else if (teamId) {
      // teamId varsa: sadece o maçlarda gerçekten oynayan oyuncuları göster
      playerKeys = Object.keys(playerMap).filter(pid => playerMap[parseInt(pid)]?.games > 0);
    } else {
      // Filtre yoksa tüm kayıtlı oyuncular + maçta oynayanlar
      playerKeys = [...new Set([
        ...Object.keys(DYNAMIC_PLAYERS),
        ...Object.keys(playerMap)
      ])];
    }
    const players = playerKeys.map(pid => {
      const pidNum = parseInt(pid);
      return playerMap[pidNum] || {
        playerId: pidNum,
        name: DYNAMIC_PLAYERS[pid]?.name || playerMap[pidNum]?.name || ('Oyuncu ' + pid),
        shirt: DYNAMIC_PLAYERS[pid]?.shirt || 0,
        games: 0, goals: 0, assists: 0,
        yellowCards: 0, redCards: 0,
        minutesPlayed: 0,
      };
    });

    // Dakikaya göre sırala, ortalamalar ekle
    players.forEach(p => {
      p.goalsPerGame = p.games > 0 ? Math.round((p.goals / p.games) * 100) / 100 : 0;
      p.minutesPerGoal = p.goals > 0 ? Math.round(p.minutesPlayed / p.goals) : null;
      p.minutesPerGame = p.games > 0 ? Math.round(p.minutesPlayed / p.games) : 0;
    });
    const sorted = players.sort((a,b) => b.minutesPlayed - a.minutesPlayed || b.goals - a.goals);

    return res.status(200).json({
      players: sorted,
      totalGames: matches.length,
      matches: matches.map(m => ({
        id: m.id, gameId: m.game_id, gameDate: m.game_date,
        homeTeam: m.home_team, awayTeam: m.away_team,
        homeScore: m.home_score, awayScore: m.away_score,
        leagueName: m.league_name, gameType: m.game_type,
      })),
    });
  }

  // Kendi istatistikleri (oyuncu)
  if (action === 'mystats') {
    const playerId = user.player_id;
    if (!playerId) return res.status(400).json({ error: 'Spelar-ID är inte definierat' });

    // Filtreleme parametreleri
    const { gameType, dateFrom, dateTo, leagueNames: myLeagueNames } = req.query;
    const myLeagueList = myLeagueNames ? myLeagueNames.split('|') : [];

    // Önce maçları filtrele
    let matchQuery = '/matches?select=id,league_name';
    if (gameType && gameType !== 'hepsi') matchQuery += `&game_type=eq.${gameType}`;
    if (dateFrom) matchQuery += `&game_date=gte.${dateFrom}`;
    if (dateTo) matchQuery += `&game_date=lte.${dateTo}T23:59:59`;
    let filteredMatches = await supabaseGet(matchQuery);
    if (myLeagueList.length > 0 && Array.isArray(filteredMatches)) {
      filteredMatches = filteredMatches.filter(m => myLeagueList.includes(m.league_name));
    }
    const matchIds = Array.isArray(filteredMatches) ? filteredMatches.map(m => m.id) : [];

    let statsQuery = `/player_stats?player_id=eq.${playerId}&select=*,matches(*)`;
    if (matchIds.length > 0 && (gameType || dateFrom || dateTo)) {
      statsQuery = `/player_stats?player_id=eq.${playerId}&match_id=in.(${matchIds.join(',')})&select=*,matches(*)`;
    } else if (matchIds.length === 0 && (gameType || dateFrom || dateTo)) {
      return res.status(200).json({ playerId, name: SFK_PLAYERS[playerId]?.name, shirt: SFK_PLAYERS[playerId]?.shirt || 0, games: 0, starterGames: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0, matchDetails: [] });
    }

    const stats = await supabaseGet(statsQuery);
    if (!Array.isArray(stats)) return res.status(200).json({ stats: [] });

    // Thumbnail'i player_stats'tan al, yoksa MinFotboll'dan çek
    const thumbnailRow = await supabaseGet(`/player_stats?player_id=eq.${playerId}&select=thumbnail&limit=1`);
    let thumbnail = Array.isArray(thumbnailRow) && thumbnailRow[0]?.thumbnail || null;
    
    // DB'de yoksa MinFotboll'dan çek
    if (!thumbnail) {
      try {
        const mfToken = await getMinfotbollToken();
        const teamId = 398871; // P16 team
        const roster = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${teamId}`, mfToken);
        if (Array.isArray(roster)) {
          const player = roster.find(p => p.PlayerID === playerId);
          if (player?.ThumbnailURL) thumbnail = player.ThumbnailURL;
        }
      } catch(e) {}
    }

    const summary = {
      playerId,
      name: SFK_PLAYERS[playerId]?.name || user.full_name,
      shirt: SFK_PLAYERS[playerId]?.shirt || 0,
      thumbnail,
      games: 0, starterGames: 0, minutesPlayed: 0,
      goals: 0, assists: 0, yellowCards: 0, redCards: 0,
      matchDetails: [],
    };

    stats.forEach(s => {
      if (s.played) {
        summary.games++;
        if (s.is_starter) summary.starterGames++;
        summary.minutesPlayed += s.minutes_played || 0;
      }
      summary.goals += s.goals || 0;
      summary.assists += s.assists || 0;
      summary.yellowCards += s.yellow_cards || 0;
      summary.redCards += s.red_cards || 0;
      if (s.played) {
        summary.matchDetails.push({
          gameDate: s.matches?.game_date,
          homeTeam: s.matches?.home_team,
          awayTeam: s.matches?.away_team,
          homeScore: s.matches?.home_score,
          awayScore: s.matches?.away_score,
          leagueName: s.matches?.league_name,
          isStarter: s.is_starter,
          minutesPlayed: s.minutes_played || 0,
          goals: s.goals, assists: s.assists,
          yellowCards: s.yellow_cards, redCards: s.red_cards,
        });
      }
    });

    summary.matchDetails.sort((a,b) => new Date(b.gameDate) - new Date(a.gameDate));
    return res.status(200).json(summary);
  }

  // Belirli oyuncu için CV verisi (admin + antrenör)
  if (action === 'playercv') {
    const playerId = parseInt(req.query.playerId);
    // Oyuncu sadece kendi CV'sini görebilir
    if (user.role === 'oyuncu' && user.player_id !== playerId) return res.status(403).json({ error: 'Yetki yok' });
    if (!playerId) return res.status(400).json({ error: 'Ogiltigt spelar-ID' });

    const statsRaw = await supabaseGet(`/player_stats?player_id=eq.${playerId}&select=*,matches(*)&order=matches(game_date).desc`);
    if (!Array.isArray(statsRaw)) return res.status(200).json({ error: 'Ingen data' });

    // Thumbnail + pozisyon
    const thumbnailRow = await supabaseGet(`/player_stats?player_id=eq.${playerId}&select=thumbnail&limit=1`);
    let thumbnail = Array.isArray(thumbnailRow) && thumbnailRow[0]?.thumbnail || null;
    let position = '';
    let teamLabel = '';
    let birthYear = null;
    if (!thumbnail) {
      try {
        const mfToken = await getMinfotbollToken();
        const posMap = {
          'Goalkeeper':'Målvakt','Defender':'Back','Centre-Back':'Mittback',
          'Full-Back':'Back','Left-Back':'Vänsterback','Right-Back':'Högerback',
          'Midfielder':'Mittfältare','Central Midfield':'Central mittfältare',
          'Defensive Midfield':'Defensiv mittfältare','Attacking Midfield':'Offensiv mittfältare',
          'Left Midfield':'Vänster mittfältare','Right Midfield':'Höger mittfältare',
          'Forward':'Anfallare','Centre-Forward':'Anfallare',
          'Left Wing':'Vänsterytter','Right Wing':'Högerytter',
          'Winger':'Ytter','Striker':'Anfallare',
        };
        // Önce initplayersadminvc ile TeamPlayerID'yi bul
        let teamPlayerID = null;
        for (const tid of [398871, 74782]) {
          const roster = await minfotbollGet(`/api/teamapi/initplayersadminvc?TeamID=${tid}`, mfToken);
          if (Array.isArray(roster)) {
            const p = roster.find(p => p.PlayerID === playerId);
            if (p) {
              if (p.ThumbnailURL) thumbnail = p.ThumbnailURL;
              if (p.Position) position = posMap[p.Position] || p.Position;
              teamPlayerID = p.TeamPlayerID;
              teamLabel = tid === 398871 ? 'P16' : 'P17';
              break;
            }
          }
        }
        // initplayerprofile ile doğum yılını çek
        if (teamPlayerID) {
          const profile = await minfotbollGet(
            `/api/playerapi/initplayerprofile?TeamPlayerID=${teamPlayerID}&GamePlayerID=0`, mfToken
          );
          const pv = profile?.PlayerForDetailsView;
          if (pv) {
            if (pv.YearOfBirth) birthYear = pv.YearOfBirth.toString();
            else if (pv.BirthDate) birthYear = new Date(pv.BirthDate).getFullYear().toString();
            if (pv.ThumbnailURL && !thumbnail) thumbnail = pv.ThumbnailURL;
            if (pv.Position && !position) position = posMap[pv.Position] || pv.Position;
          }
        }
      } catch(e) {}
    }

    // Toplam istatistikler
    const totals = { games:0, starterGames:0, minutesPlayed:0, goals:0, assists:0, yellowCards:0, redCards:0 };
    const seasonMap = {};

    statsRaw.forEach(s => {
      const year = s.matches?.game_date ? new Date(s.matches.game_date).getFullYear() : 'Okänt';
      if (!seasonMap[year]) seasonMap[year] = { season: year, league: '', games:0, goals:0, assists:0, minutesPlayed:0, leagueNames: new Set() };
      if (s.played) {
        totals.games++;
        if (s.is_starter) totals.starterGames++;
        totals.minutesPlayed += s.minutes_played || 0;
        seasonMap[year].games++;
        seasonMap[year].minutesPlayed += s.minutes_played || 0;
        if (s.matches?.league_name) seasonMap[year].leagueNames.add(s.matches.league_name);
      }
      totals.goals += s.goals || 0;
      totals.assists += s.assists || 0;
      totals.yellowCards += s.yellow_cards || 0;
      totals.redCards += s.red_cards || 0;
      seasonMap[year].goals += s.goals || 0;
      seasonMap[year].assists += s.assists || 0;
    });

    const seasons = Object.values(seasonMap)
      .map(s => ({ ...s, league: [...s.leagueNames].join(', ') || 'SFK' }))
      .sort((a,b) => b.season - a.season);

    // Maç detayları
    const matchDetails = statsRaw
      .filter(s => s.played)
      .map(s => ({
        gameDate: s.matches?.game_date,
        homeTeam: s.matches?.home_team,
        awayTeam: s.matches?.away_team,
        homeScore: s.matches?.home_score,
        awayScore: s.matches?.away_score,
        leagueName: s.matches?.league_name,
        gameType: s.matches?.game_type,
        isStarter: s.is_starter,
        minutesPlayed: s.minutes_played || 0,
        goals: s.goals || 0,
        assists: s.assists || 0,
        yellowCards: s.yellow_cards || 0,
        redCards: s.red_cards || 0,
      }))
      .sort((a, b) => new Date(b.gameDate) - new Date(a.gameDate));

    return res.status(200).json({
      name: SFK_PLAYERS[playerId].name,
      shirt: SFK_PLAYERS[playerId].shirt,
      thumbnail,
      playerId,
      position,
      team: teamLabel,
      birthYear: birthYear || SFK_PLAYERS[playerId]?.birthYear?.toString() || null,
      totals,
      seasons,
      matchDetails,
      videos: []
    });
  }

  // MinFotboll'dan highlight'ları otomatik çek ve kaydet
  if (action === 'fetchhighlights') {
    const playerId = parseInt(req.query.playerId);
    if (!playerId) return res.status(400).json({ error: 'playerId krävs' });
    // Oyuncu sadece kendi highlight'larını güncelleyebilir
    if (user.role === 'oyuncu' && user.player_id !== playerId) return res.status(403).json({ error: 'Yetki yok' });

    try {
      // Dinamik roster'dan memberId bul
      const mfToken = await getMinfotbollToken();
      const dynPlayers = await getDynamicRoster(mfToken);
      const playerInfo = dynPlayers[playerId];
      if (!playerInfo?.memberId) return res.status(200).json({ success: false, error: 'MemberID bulunamadı', saved: 0 });

      const memberId = playerInfo.memberId;

      // MinFotboll highlight API'si - PlayerID ile çalışıyor
      const data = await minfotbollGet(
        `/api/playerapi/getplayerhighlights?PlayerID=${playerId}`,
        mfToken
      );

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(200).json({ success: true, saved: 0, skipped: 0, message: 'Highlight bulunamadı' });
      }

      // Highlight verilerini düzenle
      const highlights = data
        .filter(h => h.VideoURL || h.Highlight?.VideoURL)
        .map(h => {
          const hl = h.Highlight || h;
          return {
            highlightId: hl.HighlightID || h.HighlightID,
            gameId: hl.GameID || h.GameID,
            videoUrl: hl.VideoURL || h.VideoURL,
            thumbnailUrl: hl.ThumbnailURL || h.ThumbnailURL || null,
            infoText: h.InfoText || hl.InfoText || null,
            gameTime: h.GameTime || hl.GameTime || null,
          };
        })
        .filter(h => h.highlightId && h.videoUrl);

      if (!highlights.length) return res.status(200).json({ success: true, saved: 0, skipped: 0 });

      // Mevcut highlight'ları kontrol et
      const ids = highlights.map(h => h.highlightId).join(',');
      const existing = await supabaseGet(`/player_highlights?highlight_id=in.(${ids})&player_id=eq.${playerId}&select=highlight_id`);
      const existingIds = new Set(Array.isArray(existing) ? existing.map(e => e.highlight_id) : []);
      const newHighlights = highlights.filter(h => !existingIds.has(h.highlightId));

      if (!newHighlights.length) return res.status(200).json({ success: true, saved: 0, skipped: highlights.length });

      // Toplu insert
      const url2 = new URL(SUPABASE_URL);
      const rows = newHighlights.map(h => ({
        player_id: playerId, game_id: h.gameId, highlight_id: h.highlightId,
        video_url: h.videoUrl, thumbnail_url: h.thumbnailUrl || null,
        info_text: h.infoText || null, game_time: h.gameTime || null,
      }));

      const bodyStr = JSON.stringify(rows);
      await new Promise((resolve, reject) => {
        const req2 = require('https').request({
          host: url2.host, path: '/rest/v1/player_highlights',
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json', 'Prefer': 'return=minimal',
            'Content-Length': Buffer.byteLength(bodyStr)
          }
        }, res2 => { res2.on('data', ()=>{}); res2.on('end', resolve); });
        req2.on('error', reject);
        req2.write(bodyStr);
        req2.end();
      });

      return res.status(200).json({ success: true, saved: newHighlights.length, skipped: existingIds.size });
    } catch(e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  }

  // Highlight'ları DB'ye kaydet (admin/antrenör, MinFotboll DOM'undan)
  if (action === 'savehighlights') {
    if (user.role === 'oyuncu') return res.status(403).json({ error: 'Yetki yok' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST gerekli' });

    let body = '';
    await new Promise(resolve => { req.on('data', c => body += c); req.on('end', resolve); });
    const { playerId, highlights } = JSON.parse(body);

    if (!playerId || !Array.isArray(highlights)) return res.status(400).json({ error: 'Eksik veri' });

    // Mevcut highlight_id + player_id kombinasyonlarını tek sorguda al
    const validHighlights = highlights.filter(h => h.highlightId && h.videoUrl);
    if (!validHighlights.length) return res.status(200).json({ success: true, saved: 0, skipped: 0 });

    const ids = validHighlights.map(h => h.highlightId).join(',');
    const existing = await supabaseGet(`/player_highlights?highlight_id=in.(${ids})&player_id=eq.${playerId}&select=highlight_id`);
    const existingIds = new Set(Array.isArray(existing) ? existing.map(e => e.highlight_id) : []);

    const newHighlights = validHighlights.filter(h => !existingIds.has(h.highlightId));
    const skipped = validHighlights.length - newHighlights.length;

    if (!newHighlights.length) return res.status(200).json({ success: true, saved: 0, skipped });

    // Toplu insert
    const url = new URL(SUPABASE_URL);
    const rows = newHighlights.map(h => ({
      player_id: playerId, game_id: h.gameId, highlight_id: h.highlightId,
      video_url: h.videoUrl, thumbnail_url: h.thumbnailUrl || null,
      info_text: h.infoText || null, game_time: h.gameTime || null,
    }));

    await new Promise((resolve, reject) => {
      const bodyStr = JSON.stringify(rows);
      const req2 = require('https').request({
        host: url.host, path: '/rest/v1/player_highlights',
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      }, res2 => { res2.on('data', ()=>{}); res2.on('end', resolve); });
      req2.on('error', reject);
      req2.write(bodyStr);
      req2.end();
    });

    return res.status(200).json({ success: true, saved: newHighlights.length, skipped });
  }

  // Oyuncu video highlights - DB'den
  if (action === 'playervideos') {
    const playerId = parseInt(req.query.playerId);
    if (!playerId) return res.status(400).json({ error: 'playerId krävs' });

    // DB'den oyuncunun highlight'larını çek, maç bilgisiyle birleştir
    const highlights = await supabaseGet(
      `/player_highlights?player_id=eq.${playerId}&order=game_time.desc&select=*`
    );

    if (!Array.isArray(highlights) || highlights.length === 0) {
      return res.status(200).json({ videos: [], count: 0 });
    }

    // Maç bilgilerini DB'den çek (game_id eşleşmesi)
    const gameIds = [...new Set(highlights.map(h => h.game_id))];
    const matches = await supabaseGet(
      `/matches?game_id=in.(${gameIds.join(',')})&select=game_id,home_team,away_team,home_score,away_score,game_date,league_name`
    );
    const matchMap = {};
    if (Array.isArray(matches)) matches.forEach(m => { matchMap[m.game_id] = m; });

    const videos = highlights.map(h => {
      const match = matchMap[h.game_id] || {};
      const date = h.game_time ? new Date(h.game_time).toLocaleDateString('sv-SE', {day:'2-digit', month:'short', year:'numeric'}) : '';
      const matchName = match.home_team && match.away_team
        ? `${match.home_team} vs ${match.away_team} (${match.home_score}-${match.away_score})`
        : `Maç ${h.game_id}`;
      return {
        label: `${h.info_text || 'Höjdpunkt'} · ${matchName}`,
        url: h.video_url,
        thumbnailUrl: h.thumbnail_url,
        date: h.game_time,
        dateStr: date,
        gameId: h.game_id,
        infoText: h.info_text,
        leagueName: match.league_name || '',
      };
    });

    return res.status(200).json({ videos, count: videos.length });
  }

  res.status(400).json({ error: 'Ogiltig åtgärd' });
};
