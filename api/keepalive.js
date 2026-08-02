// ===================== SUPABASE KEEP-ALIVE =====================
// Supabase free tier 7 gün hareketsizlikte projeyi durdurur.
// Bu endpoint DB'ye minik bir sorgu atarak projeyi uyanık tutar.
// GitHub Actions (.github/workflows/keepalive.yml) 2 günde bir tetikler.
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

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
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    // En hafif sorgu: tek bir id çek
    await supabaseGet('/users?select=id&limit=1');
    return res.status(200).json({ ok: true, ping: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
