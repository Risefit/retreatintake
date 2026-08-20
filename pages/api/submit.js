// POST /api/submit
// Body: { answers: { ... } }
// Generates PDF from answers and emails it to guest + info@wyrdpharm.com via SMTP.
//
// Env vars:
//   SMTP_HOST       : SMTP host (default: smtp.gmail.com)
//   SMTP_PORT       : SMTP port (default: 465, SSL)
//   SMTP_USER       : SMTP account username (your Gmail address)
//   SMTP_PASS       : SMTP password / Gmail App Password (16 chars, no spaces)
//   MAIL_FROM       : "Display Name <you@gmail.com>"  (defaults to SMTP_USER)
//   MAIL_TO_RETREAT : override recipient (default: info@wyrdpharm.com)
//   INTAKE_DRY_RUN=1: skip actually sending (useful for local testing)

const { generatePdf } = require('../../lib/pdf');
const { ALL_QUESTIONS } = require('../../lib/questions');
const nodemailer = require('nodemailer');

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};

// Simple per-instance rate-limit
const RATE = new Map();
function tooMany(ip) {
  const now = Date.now();
  const arr = (RATE.get(ip) || []).filter(t => now - t < 60_000);
  arr.push(now);
  RATE.set(ip, arr);
  return arr.length > 5;
}

function sanitizeAnswers(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = new Set(ALL_QUESTIONS.map(q => q.id));
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!allowed.has(k)) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 8000);
    else if (Array.isArray(v)) out[k] = v.slice(0, 60).map(x => String(x).slice(0, 300));
    else if (typeof v === 'boolean') out[k] = v;
    else if (v == null) continue;
    else out[k] = String(v).slice(0, 8000);
  }
  return out;
}

function validEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function safeFilename(s) {
  return String(s || 'guest').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'guest';
}

let cachedTransporter = null;
function makeTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''), // Gmail app passwords are shown with spaces
    },
  });
  return cachedTransporter;
}

async function sendOne(transporter, msg) {
  try {
    const info = await transporter.sendMail(msg);
    return { ok: true, id: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (e) {
    return { ok: false, error: e.message || String(e), code: e.code, response: e.response };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.socket?.remoteAddress || 'unknown';
  if (tooMany(ip)) {
    return res.status(429).json({ error: 'Too many submissions from this address. Please try again shortly.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const answers = sanitizeAnswers(body.answers);

    if (!validEmail(answers.email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!answers.full_name || String(answers.full_name).trim().length < 2) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }

    const submittedAt = new Date();
    const pdf = await generatePdf({ answers, submittedAt });
    const filename = `Wyrd_Pharm_Intake_${safeFilename(answers.full_name)}.pdf`;

    // Dry-run for local testing
    if (process.env.INTAKE_DRY_RUN === '1') {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        pdfBytes: pdf.length,
        filename,
        wouldSendTo: [answers.email, process.env.MAIL_TO_RETREAT || 'info@wyrdpharm.com'],
      });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return res.status(500).json({ error: 'Email service is not configured. SMTP_USER and SMTP_PASS env vars must be set in Vercel.' });
    }

    const transporter = makeTransporter();
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    const retreatEmail = process.env.MAIL_TO_RETREAT || 'info@wyrdpharm.com';

    const firstName = (answers.full_name || '').split(' ')[0];
    const guestHtml = renderGuestEmail(firstName);
    const teamHtml = renderTeamEmail(answers);

    const attachment = { filename, content: pdf, contentType: 'application/pdf' };

    const [guestRes, teamRes] = await Promise.all([
      sendOne(transporter, {
        from,
        to: answers.email,
        subject: 'Your Wyrd Pharm retreat intake — confirmation',
        html: guestHtml,
        text: guestTextFallback(firstName),
        attachments: [attachment],
      }),
      sendOne(transporter, {
        from,
        to: retreatEmail,
        replyTo: answers.email,
        subject: `New intake — ${answers.full_name}`,
        html: teamHtml,
        text: teamTextFallback(answers),
        attachments: [attachment],
      }),
    ]);

    // Both failed → surface the actual SMTP error so the operator can fix it.
    if (!guestRes.ok && !teamRes.ok) {
      console.error('Both sends failed', { guest: guestRes, team: teamRes });
      const detail = guestRes.error || teamRes.error || 'Unknown SMTP error';
      let hint = '';
      if (/invalid login|authentication|username|password/i.test(detail)) {
        hint = ' — Fix: check SMTP_USER and SMTP_PASS in Vercel. For Gmail, SMTP_PASS must be a 16-character App Password (not your normal Google password), and 2-Step Verification must be turned on for the Google account.';
      } else if (/ETIMEDOUT|ECONNECTION|ECONNREFUSED/i.test(detail)) {
        hint = ' — Fix: check SMTP_HOST and SMTP_PORT. Default is smtp.gmail.com:465.';
      }
      return res.status(502).json({ error: `Email send failed: ${detail}.${hint}` });
    }

    if (!guestRes.ok || !teamRes.ok) {
      console.warn('Partial send', { guest: guestRes, team: teamRes });
    }

    return res.status(200).json({
      ok: true,
      guest: guestRes.ok ? { id: guestRes.id } : { error: guestRes.error },
      team:  teamRes.ok  ? { id: teamRes.id  } : { error: teamRes.error  },
    });
  } catch (e) {
    console.error('submit handler error', e);
    return res.status(500).json({ error: e.message || 'Unexpected server error.' });
  }
}

/* ─────────────── Email HTML ─────────────── */

const emailShell = (inner) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F5EFE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2E2820;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5EFE4;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FDFAF3;border:1px solid rgba(58,50,40,0.12);border-radius:14px;">
        <tr><td style="padding:36px 32px;">
          <div style="font-size:12px;letter-spacing:4px;color:#665F53;text-align:center;margin-bottom:8px;">W Y R D &nbsp; P H A R M</div>
          <div style="height:1px;background:#A76A28;width:40px;margin:0 auto 24px;"></div>
          ${inner}
        </td></tr>
      </table>
      <div style="font-size:11px;color:rgba(58,50,40,0.4);margin-top:20px;">Wyrd Pharm</div>
    </td></tr>
  </table>
</body>
</html>`;

function renderGuestEmail(firstName) {
  const inner = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-style:italic;font-size:26px;color:#2E2820;margin:0 0 16px;">Thank you${firstName ? `, ${firstName}` : ''}.</h1>
    <p style="font-size:15px;line-height:1.65;color:#4A4238;margin:0 0 14px;">
      We've received your intake questionnaire. A copy is attached to this email for your records.
    </p>
    <p style="font-size:15px;line-height:1.65;color:#4A4238;margin:0 0 14px;">
      The retreat team will review your responses and be in touch if we need any clarification. If anything about your health or medications changes before the retreat, please write to us at
      <a href="mailto:info@wyrdpharm.com" style="color:#A76A28;">info@wyrdpharm.com</a>.
    </p>
    <p style="font-size:15px;line-height:1.65;color:#4A4238;margin:24px 0 0;">
      With care,<br/>
      <span style="font-family:Georgia,'Times New Roman',serif;font-style:italic;">The Wyrd Pharm team</span>
    </p>
  `;
  return emailShell(inner);
}

function guestTextFallback(firstName) {
  return `Thank you${firstName ? `, ${firstName}` : ''}.

We've received your Wyrd Pharm intake questionnaire. A PDF copy is attached for your records.

The retreat team will review your responses and be in touch if we need any clarification. If anything about your health or medications changes before the retreat, please write to info@wyrdpharm.com.

With care,
The Wyrd Pharm team`;
}

function renderTeamEmail(a) {
  const flags = [];
  if (a.conditions && Array.isArray(a.conditions) && a.conditions.length) flags.push(`${a.conditions.length} medical condition(s) reported`);
  if (a.psych_conditions && Array.isArray(a.psych_conditions) && a.psych_conditions.length) flags.push(`${a.psych_conditions.length} psychiatric condition(s) reported`);
  if (a.antidepressants && String(a.antidepressants).trim() && !/^\s*(no|none|n\/a)\s*\.?\s*$/i.test(a.antidepressants)) flags.push('Antidepressant history noted');
  if (a.allergies && String(a.allergies).trim() && !/^\s*(no|none|n\/a)\s*\.?\s*$/i.test(a.allergies)) flags.push('Medication allergies noted');

  const flagsHtml = flags.length
    ? `<div style="margin:20px 0;padding:14px 16px;border:1px solid rgba(167,106,40,0.4);border-radius:10px;background:rgba(167,106,40,0.08);">
         <div style="font-size:11px;letter-spacing:2px;color:#A76A28;text-transform:uppercase;margin-bottom:8px;">Highlights</div>
         ${flags.map(f => `<div style="font-size:14px;color:#2E2820;line-height:1.5;">• ${escapeHtml(f)}</div>`).join('')}
       </div>`
    : '';

  const inner = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-style:italic;font-size:24px;color:#2E2820;margin:0 0 6px;">New intake received</h1>
    <div style="font-size:13px;color:#665F53;margin-bottom:22px;">From ${escapeHtml(a.full_name || 'a guest')}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#2E2820;">
      <tr><td style="padding:4px 0;color:#928A7B;width:100px;">Name</td><td>${escapeHtml(a.full_name || '')}</td></tr>
      <tr><td style="padding:4px 0;color:#928A7B;">Email</td><td><a style="color:#A76A28;" href="mailto:${escapeHtml(a.email || '')}">${escapeHtml(a.email || '')}</a></td></tr>
      <tr><td style="padding:4px 0;color:#928A7B;">DOB</td><td>${escapeHtml(a.dob || '')}</td></tr>
    </table>

    ${flagsHtml}

    <p style="font-size:14px;line-height:1.6;color:#4A4238;margin:22px 0 0;">
      Full intake attached as PDF. Reply to this email to write directly to the guest.
    </p>
  `;
  return emailShell(inner);
}

function teamTextFallback(a) {
  return `NEW WYRD PHARM INTAKE

Name:  ${a.full_name || ''}
Email: ${a.email || ''}
DOB:   ${a.dob || ''}

Full intake attached as PDF. Reply to this email to write directly to the guest.`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
