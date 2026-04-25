// ===================== MYCLUB API =====================
// MyClub närvaro ve aktivite verisi
// Endpoint: member.myclub.se/api/v3/member-admin/{memberId}/
// ======================================================

const https = require('https');
const crypto = require('crypto');

const MYCLUB_TOKEN     = process.env.MYCLUB_TOKEN;
const MYCLUB_MEMBER_ID = process.env.MYCLUB_MEMBER_ID;
const JWT_SECRET       = process.env.JWT_SECRET || 'sfk2026gizliAnahtar!';

function verifyToken(token) {
  try {
    const [data, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('hex');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch(e) { return null; }
}

function myClubGet(memberId, path) {
  return new Promise((resolve, reject) => {
    const fullPath = `/api/v3/member-admin/${memberId}${path}`;
    const req = https.request({
      host: 'member.myclub.se',
      path: fullPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MYCLUB_TOKEN}`,
        'Accept': 'application/json',
        'Origin': 'https://app.myclub.se',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data: null, raw: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = req.headers.authorization || '';
  const sfkToken = auth.replace('Bearer ', '');
  const payload = verifyToken(sfkToken);
  if (!payload || !['admin','antrenor','klubbledare'].includes(payload.role)) {
    return res.status(403).json({ error: 'Behörighet saknas' });
  }

  const action   = req.query.action;
  const memberId = MYCLUB_MEMBER_ID;

  if (!memberId || !MYCLUB_TOKEN) {
    return res.status(500).json({ error: 'MyClub konfiguration saknas' });
  }

  // ── Aktiviteler listesi ──────────────────────────────
  if (action === 'activities') {
    try {
      const from = req.query.from || new Date().toISOString().slice(0,10);
      const to   = req.query.to   || new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0,10);
      const qs = `limit=null&search_start_day=${from}&search_end_day=${to}&open_activity=true`;
      const r = await myClubGet(memberId, `/calendar/?${qs}`);
      if (r.status !== 200) return res.status(200).json({ error: `MyClub svarade ${r.status}`, activities: [] });
      const list = Array.isArray(r.data) ? r.data : (r.data?.results || r.data?.activities || []);
      return res.status(200).json({ activities: list });
    } catch(e) {
      return res.status(200).json({ error: e.message, activities: [] });
    }
  }

  // ── Tek aktivite detayı (närvaro listesi) ───────────
  if (action === 'attendance') {
    const invId = req.query.id;
    if (!invId) return res.status(400).json({ error: 'id gerekli' });
    const r = await myClubGet(memberId, `/activities/${invId}/`);
    if (r.status !== 200) return res.status(r.status).json({ error: 'Aktivite bulunamadı', status: r.status });

    const d        = r.data;
    const activity = d.activity || {};
    const members  = activity.invited_members || [];

    const leaders = members.filter(m =>  m.leader).map(m => ({
      name: m.member_name, status: m.status, comment: m.comment || null, response_date: m.response_date
    }));
    const players = members.filter(m => !m.leader).map(m => ({
      name: m.member_name, status: m.status, comment: m.comment || null, response_date: m.response_date
    }));

    return res.status(200).json({
      id:            invId,
      title:         activity.title,
      day:           activity.day,
      start_time:    activity.start_time,
      end_time:      activity.end_time,
      meet_up_time:  activity.meet_up_time_display,
      meet_up_place: activity.meet_up_place,
      location:      activity.activity_location,
      type:          activity.activity_type_name,
      calendar_name: activity.calendar_name,
      total:         players.length,
      accepted:      players.filter(m => m.status === 'accepted').length,
      denied:        players.filter(m => m.status === 'denied').length,
      waiting:       players.filter(m => m.status === 'waiting').length,
      leaders,
      players,
    });
  }

  return res.status(400).json({ error: 'Okänd åtgärd' });
};
