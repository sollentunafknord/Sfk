// ===================== SUPABASE KEEP-ALIVE =====================
// Supabase free tier, 7 günlük pencerede "yeterli kullanıcı aktivitesi"
// görmeyen projeleri duraklatır. Resmî ölçüt: her gün DB'ye BİRKAÇ istek.
//
// Eski kurulum 2 günde bir TEK sorgu atıyordu (~0.5 istek/gün) ve workflow
// yeşil görünmesine rağmen eşiğin altında kaldı — 2026-09-09'da yine
// "proje duraklatılacak" maili geldi. Artık her çağrıda 3 ayrı tabloya
// gidiyoruz; workflow 6 saatte bir tetiklediği için günde ~12 istek oluyor.
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Farklı tablolar: tek tablo silinse/yeniden adlandırılsa bile ping ölmesin.
const TABLES = ['matches', 'player_stats', 'room_assignments'];

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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) {
          return reject(new Error(`HTTP ${res.statusCode} — ${String(data).slice(0, 200)}`));
        }
        try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ ok: false, error: 'SUPABASE_URL/SUPABASE_SERVICE_KEY tanımlı değil' });
  }
  try {
    // Sıralı: tek TCP patlaması yerine DB'ye yayılmış birkaç ayrı istek.
    for (const table of TABLES) {
      await supabaseGet(`/${table}?select=*&limit=1`);
    }
    return res.status(200).json({ ok: true, tables: TABLES.length, ping: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
