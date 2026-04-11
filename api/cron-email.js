// ===================== PERŞEMBE CRON MAİL =====================
// Her Perşembe saat 07:00 UTC'de çalışır
// Klubbledare'lere o haftaki omklädningsrum listesini gönderir
// ==============================================================

const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

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

function sendEmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      from: 'Sollentuna FK <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    const req = https.request({
      host: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getWeekDates() {
  const now = new Date();
  // Bu haftanın Pazartesi ve Pazar'ını bul
  const day = now.getDay(); // 0=Pazar, 1=Pazartesi...
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d) => d.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

function buildEmailHtml(rooms, weekFrom, weekTo) {
  const weekLabel = `${weekFrom} – ${weekTo}`;

  if (!rooms || rooms.length === 0) {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#111827;color:#e8eaf6;padding:2rem;border-radius:12px;">
        <h2 style="color:#00d4ff;font-family:sans-serif;">🏟️ Omklädningsrum – vecka ${weekLabel}</h2>
        <p style="color:#6b7280;">Inga matcher inlagda för denna vecka.</p>
        <p style="color:#6b7280;font-size:0.85rem;">Sollentuna FK</p>
      </div>`;
  }

  const rows = rooms.map(r => `
    <tr style="border-bottom:1px solid #1e2d45;">
      <td style="padding:0.6rem 0.8rem;">${r.game_date ? new Date(r.game_date).toLocaleDateString('sv-SE', {weekday:'short',day:'numeric',month:'short'}) : '—'}</td>
      <td style="padding:0.6rem 0.8rem;">${r.home_team || '—'}</td>
      <td style="padding:0.6rem 0.8rem;">${r.away_team || '—'}</td>
      <td style="padding:0.6rem 0.8rem;">${r.arena_name || '—'}</td>
      <td style="padding:0.6rem 0.8rem;color:#00d4ff;">${r.home_room || '—'}</td>
      <td style="padding:0.6rem 0.8rem;color:#00d4ff;">${r.away_room || '—'}</td>
      <td style="padding:0.6rem 0.8rem;color:#6b7280;font-size:0.85rem;">${r.notes || ''}</td>
    </tr>`).join('');

  return `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto;background:#111827;color:#e8eaf6;padding:2rem;border-radius:12px;">
      <h2 style="color:#00d4ff;margin-bottom:0.25rem;">🏟️ Omklädningsrum</h2>
      <p style="color:#6b7280;margin-top:0;margin-bottom:1.5rem;">Vecka ${weekLabel}</p>
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
        <thead>
          <tr style="background:#1a2235;color:#6b7280;font-size:0.8rem;text-transform:uppercase;">
            <th style="padding:0.6rem 0.8rem;text-align:left;">Datum</th>
            <th style="padding:0.6rem 0.8rem;text-align:left;">Hemmalag</th>
            <th style="padding:0.6rem 0.8rem;text-align:left;">Bortalag</th>
            <th style="padding:0.6rem 0.8rem;text-align:left;">Arena</th>
            <th style="padding:0.6rem 0.8rem;text-align:left;">Hem rum</th>
            <th style="padding:0.6rem 0.8rem;text-align:left;">Bort rum</th>
            <th style="padding:0.6rem 0.8rem;text-align:left;">Notering</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#6b7280;font-size:0.8rem;margin-top:2rem;">
        Detta mail skickas automatiskt varje torsdag av Sollentuna FK systemet.
      </p>
    </div>`;
}

module.exports = async (req, res) => {
  // Sadece Vercel cron veya manuel tetikleme (GET ile test)
  const isManual = req.query.manual === '1';
  const cronSecret = req.headers['x-vercel-cron-secret'] || req.headers['authorization'];

  res.setHeader('Content-Type', 'application/json');

  try {
    // Bu haftanın tarih aralığı
    const { from, to } = getWeekDates();

    // Supabase'den bu haftanın oda atamalarını çek
    const rooms = await supabaseGet(
      `/room_assignments?game_date=gte.${from}&game_date=lte.${to}&select=*&order=game_date.asc`
    );

    // Klubbledare + admin'lerin notification_email'lerini çek
    const users = await supabaseGet(
      `/users?role=in.(klubbledare,admin)&notification_email=not.is.null&select=full_name,notification_email`
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(200).json({ ok: true, message: 'Alıcı bulunamadı', sent: 0 });
    }

    const emails = users.map(u => u.notification_email).filter(Boolean);
    const html = buildEmailHtml(Array.isArray(rooms) ? rooms : [], from, to);

    // Test modunda sadece ilk adrese gönder
    const recipients = isManual ? [emails[0]] : emails;

    const result = await sendEmail(
      recipients,
      `(Påminnelse) 🏟️ Omklädningsrum – ${from} till ${to}`,
      html
    );

    return res.status(200).json({
      ok: true,
      sent: recipients.length,
      recipients,
      week: { from, to },
      roomCount: Array.isArray(rooms) ? rooms.length : 0,
      resend: result,
    });

  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
