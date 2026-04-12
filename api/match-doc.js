// ===================== MAÇ/ANTRENMAN DOKÜMANI API =====================
const https = require('https');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'sfk2026gizliAnahtar!';

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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const url = new URL(SUPABASE_URL);
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
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Body parse
  if (req.method === 'POST' && !req.body) {
    await new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try { req.body = JSON.parse(body); } catch(e) { req.body = {}; }
        resolve();
      });
    });
  }

  // Token doğrula
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'antrenor' && payload.role !== 'klubbledare')) {
    return res.status(403).json({ error: 'Behörighet saknas' });
  }

  const action = req.query.action;

  // Doküman kaydet / güncelle
  if (action === 'save' && req.method === 'POST') {
    try {
      const { id, activity_id, activity_type, title, content } = req.body || {};
      if (!activity_id) return res.status(400).json({ error: 'activity_id required' });

      const row = {
        activity_id,
        activity_type: activity_type || 'Match',
        title: title || '',
        content: content || {},
        created_by: payload.id,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (id) {
        // Güncelle
        result = await supabaseRequest('PATCH', `/match_documents?id=eq.${id}`, row);
      } else {
        // Yeni oluştur
        result = await supabaseRequest('POST', '/match_documents', row);
      }
      return res.status(200).json({ ok: true, result });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Doküman getir (activity_id ile)
  if (action === 'get') {
    try {
      const activity_id = req.query.activity_id;
      if (!activity_id) return res.status(400).json({ error: 'activity_id required' });
      const docs = await supabaseGet(`/match_documents?activity_id=eq.${encodeURIComponent(activity_id)}&order=updated_at.desc&limit=1`);
      return res.status(200).json(Array.isArray(docs) && docs.length > 0 ? docs[0] : null);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Tüm dokümanları listele
  if (action === 'list') {
    try {
      const docs = await supabaseGet('/match_documents?order=updated_at.desc&limit=50');
      return res.status(200).json(Array.isArray(docs) ? docs : []);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Doküman sil
  if (action === 'delete' && req.method === 'POST') {
    try {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      await supabaseRequest('DELETE', `/match_documents?id=eq.${id}`, null);
      return res.status(200).json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Ogiltig åtgärd' });
};
