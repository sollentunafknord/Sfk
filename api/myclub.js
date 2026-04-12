// ===================== MYCLUB API =====================
// MyClub'dan etkinlik ve müsaitlik verisi çeker
// ======================================================

const https = require('https');

const MYCLUB_TOKEN = process.env.MYCLUB_TOKEN;
const MYCLUB_CLUB_ID = process.env.MYCLUB_CLUB_ID;
const MYCLUB_BASE = 'member.myclub.se';

const JWT_SECRET = process.env.JWT_SECRET || 'sfk2026gizliAnahtar!';
const crypto = require('crypto');

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

function myClubGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: MYCLUB_BASE,
      path: `/api/v3/member-admin/${MYCLUB_CLUB_ID}${path}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MYCLUB_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, data: null }); }
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

  // Token doğrula
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  const payload = verifyToken(token);
  if (!payload || (payload.role !== 'admin' && payload.role !== 'antrenor' && payload.role !== 'klubbledare')) {
    return res.status(403).json({ error: 'Behörighet saknas' });
  }

  const action = req.query.action;

  // Yaklaşan etkinlikler + müsaitlik özeti
  if (action === 'upcoming') {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      // Takvimden etkinlikleri çek
      const calRes = await myClubGet(
        `/activities/calendar/?limit=null&search_start_day=${today}&search_end_day=${future}`
      );

      if (calRes.status !== 200 || !calRes.data) {
        return res.status(200).json({ events: [], error: 'MyClub API erişilemedi' });
      }

      const events = calRes.data.results || [];

      // Her etkinlik için müsaitlik verisi çek
      const enriched = await Promise.all(events.map(async (ev) => {
        try {
          // invitation_id varsa detay çek
          const invId = ev.invitation_id || ev.id;
          const detailRes = await myClubGet(`/activities/${invId}/`);

          if (detailRes.status !== 200 || !detailRes.data) {
            return {
              id: ev.id,
              title: ev.title,
              start: ev.start,
              location: ev.location,
              activity_type: ev.activity_type,
              accepted: 0, denied: 0, waiting: 0, total: 0,
            };
          }

          const members = detailRes.data.activity?.invited_members || [];
          // Sadece oyuncular (leader: false)
          const players = members.filter(m => !m.leader);
          const accepted = players.filter(m => m.status === 'accepted').length;
          const denied   = players.filter(m => m.status === 'denied').length;
          const waiting  = players.filter(m => m.status === 'waiting').length;

          return {
            id: ev.id,
            invitation_id: ev.invitation_id || ev.id,
            title: ev.title,
            start: ev.start,
            location: ev.location,
            activity_type: ev.activity_type,
            calendar_name: ev.calendar_name,
            accepted,
            denied,
            waiting,
            total: players.length,
          };
        } catch(e) {
          return {
            id: ev.id,
            invitation_id: ev.invitation_id || ev.id,
            title: ev.title,
            start: ev.start,
            location: ev.location,
            activity_type: ev.activity_type,
            accepted: 0, denied: 0, waiting: 0, total: 0,
          };
        }
      }));

      return res.status(200).json({ events: enriched });

    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Etkinlik detayı — oyuncu listesi
  if (action === 'detail') {
    try {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id required' });

      // Önce verilen ID ile dene, olmassa invitation endpoint'i dene
      let detailRes = await myClubGet('/activities/' + id + '/');
      
      // Eğer invited_members boşsa farklı bir endpoint dene
      if (detailRes.status === 200 && detailRes.data) {
        const testMembers = detailRes.data.activity?.invited_members || detailRes.data.invited_members || [];
        if (testMembers.length === 0) {
          // activity_id ile dene
          const altRes = await myClubGet('/activities/?activity_id=' + id);
          if (altRes.status === 200 && altRes.data) {
            detailRes = altRes;
          }
        }
      }

      if (detailRes.status !== 200 || !detailRes.data) {
        return res.status(200).json({ members: [] });
      }

      const members = (detailRes.data.activity?.invited_members || detailRes.data.invited_members || []);
      // Tüm üyeler (oyuncu + lider)
      const players = members.map(m => ({
        member_name: m.member_name,
        status: m.status,
        leader: m.leader || false,
        comment: m.comment || null,
        response_date: m.response_date,
      }));

      return res.status(200).json({ members: players });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(400).json({ error: 'Ogiltig åtgärd' });
};
