// ===================== PERŞEMBE CRON MAİL =====================
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = 'https://sollentuna-fk.vercel.app';

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

function getDateRange() {
  const now = new Date();
  const from = now.toISOString().slice(0, 10);
  const future = new Date(now);
  future.setDate(now.getDate() + 5);
  const to = future.toISOString().slice(0, 10);
  return { from, to };
}

function buildEmailHtml(rooms) {
  const emptyMsg = !rooms || rooms.length === 0
    ? '<p style="color:#6b7280;padding:1rem 0;margin:0;">Inga matcher inlagda för de kommande dagarna.</p>'
    : '';

  const rows = (rooms || []).map(function(r) {
    var dateStr = r.game_date
      ? new Date(r.game_date).toLocaleDateString('sv-SE', {weekday:'long', day:'numeric', month:'short'})
      : '—';
    return '<tr style="border-bottom:1px solid #e5e7eb;">' +
      '<td style="padding:0.6rem 0.8rem;color:#374151;white-space:nowrap;">' + dateStr + '</td>' +
      '<td style="padding:0.6rem 0.8rem;font-weight:600;color:#111827;">' + (r.home_team || '—') + '</td>' +
      '<td style="padding:0.6rem 0.8rem;color:#9ca3af;text-align:center;">vs</td>' +
      '<td style="padding:0.6rem 0.8rem;font-weight:600;color:#111827;">' + (r.away_team || '—') + '</td>' +
      '<td style="padding:0.6rem 0.8rem;color:#374151;">' + (r.arena_name || '—') + '</td>' +
      '<td style="padding:0.6rem 0.8rem;color:#2563eb;font-weight:600;">' + (r.home_room || '—') + '</td>' +
      '<td style="padding:0.6rem 0.8rem;color:#2563eb;font-weight:600;">' + (r.away_room || '—') + '</td>' +
      '<td style="padding:0.6rem 0.8rem;color:#9ca3af;font-size:0.85rem;">' + (r.notes || '') + '</td>' +
      '</tr>';
  }).join('');

  var tableHtml = rooms && rooms.length > 0
    ? '<div style="overflow-x:auto;">' +
      '<table style="width:100%;border-collapse:collapse;font-size:0.9rem;">' +
      '<thead><tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;white-space:nowrap;">DATUM</th>' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;">HEMMALAG</th>' +
      '<th></th>' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;">BORTALAG</th>' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;">ARENA</th>' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;">HEM RUM</th>' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;">BORT RUM</th>' +
      '<th style="padding:0.6rem 0.8rem;text-align:left;color:#6b7280;font-size:0.75rem;font-weight:600;">NOTERING</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '</table></div>'
    : '';

  return '<!DOCTYPE html>' +
    '<html lang="sv"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">' +
    '<div style="max-width:700px;margin:2rem auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">' +

    // Header
    '<a href="' + APP_URL + '" style="text-decoration:none;display:block;background:#0a0e1a;padding:1.25rem 2rem;">' +
    '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="vertical-align:middle;padding-right:1rem;">' +
    '<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sollentuna_FK_logo_%282022%29.svg/960px-Sollentuna_FK_logo_%282022%29.svg.png" alt="SFK" width="48" height="48" style="display:block;">' +
    '</td>' +
    '<td style="vertical-align:middle;">' +
    '<div style="color:#00d4ff;font-size:1.3rem;font-weight:700;letter-spacing:0.5px;">SOLLENTUNA FK</div>' +
    '<div style="color:#6b7280;font-size:0.85rem;margin-top:2px;">(P&aring;minnelse) Omkl&auml;dningsrum</div>' +
    '</td></tr></table></a>' +

    // Varning
    '<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:1rem 2rem;">' +
    '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="font-size:1.4rem;padding-right:0.75rem;">&#9888;&#65039;</td>' +
    '<td>' +
    '<div style="font-weight:700;color:#92400e;font-size:0.95rem;">Gl&ouml;m inte omkl&auml;dningsrummen i helgen!</div>' +
    '<div style="color:#b45309;font-size:0.85rem;margin-top:2px;">Kontrollera och bekr&auml;fta rumsf&ouml;rdelningen innan matcherna.</div>' +
    '</td></tr></table></div>' +

    // Matcher
    '<div style="padding:1.5rem 2rem;">' +
    '<h2 style="margin:0 0 1rem 0;font-size:1rem;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">&#127966; Kommande matcher</h2>' +
    emptyMsg +
    tableHtml +

    // Knapp
    '<div style="margin-top:2rem;text-align:center;">' +
    '<a href="' + APP_URL + '" style="display:inline-block;background:#0a0e1a;color:#00d4ff;text-decoration:none;padding:0.75rem 2rem;border-radius:8px;font-weight:700;font-size:0.95rem;">' +
    '&#127966; &Ouml;ppna Omkl&auml;dningsrum' +
    '</a></div></div>' +

    // Footer
    '<div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:1rem 2rem;text-align:center;">' +
    '<p style="margin:0 0 0.4rem 0;color:#9ca3af;font-size:0.8rem;">Detta mail skickas automatiskt varje torsdag av Sollentuna FK systemet.</p>' +
    '<a href="' + APP_URL + '" style="color:#6b7280;font-size:0.8rem;text-decoration:underline;">' + APP_URL + '</a>' +
    '</div>' +

    '</div></body></html>';
}

module.exports = async (req, res) => {
  const isManual = req.query.manual === '1';
  res.setHeader('Content-Type', 'application/json');

  // Güvenlik — sadece GitHub Actions veya manuel test
  const cronSecret = req.headers['x-cron-secret'] || '';
  const expectedSecret = process.env.CRON_SECRET || '';
  if (!isManual && expectedSecret && cronSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { from, to } = getDateRange();

    const rooms = await supabaseGet(
      '/room_assignments?game_date=gte.' + from + '&game_date=lte.' + to + '&select=*&order=game_date.asc'
    );

    const users = await supabaseGet(
      '/users?role=in.(klubbledare,admin)&notification_email=not.is.null&select=full_name,notification_email'
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(200).json({ ok: true, message: 'Ingen mottagare hittades', sent: 0 });
    }

    const emails = users.map(function(u) { return u.notification_email; }).filter(Boolean);
    const html = buildEmailHtml(Array.isArray(rooms) ? rooms : []);
    const recipients = isManual ? [emails[0]] : emails;

    const result = await sendEmail(
      recipients,
      '(Påminnelse) 🏟️ Omklädningsrum – Sollentuna FK',
      html
    );

    return res.status(200).json({
      ok: true,
      sent: recipients.length,
      recipients,
      dateRange: { from, to },
      roomCount: Array.isArray(rooms) ? rooms.length : 0,
      resend: result,
    });

  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};
