// POST /api/submit
// Body: { answers: { ... } }
// - Generates PDF from answers
// - Emails PDF to guest (answers.email) + info@wyrdpharm.com via Resend
// Env vars required:
//   RESEND_API_KEY      : Resend API key
//   MAIL_FROM           : verified sender, e.g. "Wyrd Pharm <intake@wyrdpharm.com>"
//                         (falls back to Resend's onboarding@resend.dev in dev)
//   MAIL_TO_RETREAT     : override recipient (default: info@wyrdpharm.com)
//   INTAKE_DRY_RUN=1    : skip email send (useful for local testing)

const { generatePdf } = require('../../lib/pdf');
const { ALL_QUESTIONS } = require('../../lib/questions');
const { Resend } = require('resend');

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};

// Simple in-memory rate-limit per IP (per-instance; good enough for 14 guests)
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

    // Dry-run for local testing without sending
    if (process.env.INTAKE_DRY_RUN === '1') {
      return res.status(200).json({
        ok: true,
        dryRun: true,
        pdfBytes: pdf.length,
        filename,
        wouldSendTo: [answers.email, process.env.MAIL_TO_RETREAT || 'info@wyrdpharm.com'],
      });
    }

    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service is not configured. Please contact the retreat team.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.MAIL_FROM || 'Wyrd Pharm <onboarding@resend.dev>';
    const retreatEmail = process.env.MAIL_TO_RETREAT || 'info@wyrdpharm.com';

    const firstName = (answers.full_name || '').split(' ')[0];
    const guestHtml = renderGuestEmail(firstName);
    const teamHtml = renderTeamEmail(answers);

    // Email to guest
    const guestSend = resend.emails.send({
      from,
      to: [answers.email],
      subject: 'Your Wyrd Pharm retreat intake — confirmation',
      html: guestHtml,
      text: guestTextFallback(firstName),
      attachments: [{ filename, content: pdf.toString('base64') }],
    });

    // Email to retreat team
    const teamSend = resend.emails.send({
      from,
      to: [retreatEmail],
      replyTo: answers.email,
      subject: `New intake — ${answers.full_name}`,
      html: teamHtml,
      text: teamTextFallback(answers),
      attachments: [{ filename, content: pdf.toString('base64') }],
    });

    const [guestRes, teamRes] = await Promise.all([guestSend, teamSend]);

    // If both failed, surface the error
    if (guestRes.error && teamRes.error) {
      console.error('Both sends failed', guestRes.error, teamRes.error);
      return res.status(502).json({ error: 'We couldn\'t send the confirmation emails. Please try again in a few minutes.' });
    }

    return res.status(200).json({
      ok: true,
      guest: guestRes.error ? { error: guestRes.error.message } : { id: guestRes.data?.id },
      team:  teamRes.error  ? { error: teamRes.error.message  } : { id: teamRes.data?.id },
    });
  } catch (e) {
    console.error('submit handler error', e);
    return res.status(500).json({ error: e.message || 'Unexpected server error.' });
  }
}

/* ─────────────── Email HTML ─────────────── */

const emailShell = (inner) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0D100E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#EDE8DD;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0D100E;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#171B18;border:1px solid rgba(237,232,221,0.14);border-radius:14px;">
        <tr><td style="padding:36px 32px;">
          <div style="font-size:12px;letter-spacing:4px;color:#EDE8DD;text-align:center;margin-bottom:8px;">W Y R D &nbsp; P H A R M</div>
          <div style="height:1px;background:#C08A4A;width:40px;margin:0 auto 24px;"></div>
          ${inner}
        </td></tr>
      </table>
      <div style="font-size:11px;color:rgba(237,232,221,0.4);margin-top:20px;">Wyrd Pharm</div>
    </td></tr>
  </table>
</body>
</html>`;

function renderGuestEmail(firstName) {
  const inner = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;color:#EDE8DD;margin:0 0 16px;">Thank you${firstName ? `, ${firstName}` : ''}.</h1>
    <p style="font-size:15px;line-height:1.6;color:rgba(237,232,221,0.85);margin:0 0 14px;">
      We've received your intake questionnaire. A copy is attached to this email for your records.
    </p>
    <p style="font-size:15px;line-height:1.6;color:rgba(237,232,221,0.85);margin:0 0 14px;">
      The retreat team will review your responses and be in touch if we need any clarification. If anything about your health or medications changes before the retreat, please write to us at
      <a href="mailto:info@wyrdpharm.com" style="color:#D8A96E;">info@wyrdpharm.com</a>.
    </p>
    <p style="font-size:15px;line-height:1.6;color:rgba(237,232,221,0.85);margin:24px 0 0;">
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
    ? `<div style="margin:20px 0;padding:14px 16px;border:1px solid rgba(216,169,110,0.4);border-radius:10px;background:rgba(192,138,74,0.08);">
         <div style="font-size:11px;letter-spacing:2px;color:#D8A96E;text-transform:uppercase;margin-bottom:8px;">Highlights</div>
         ${flags.map(f => `<div style="font-size:14px;color:#EDE8DD;line-height:1.5;">• ${escapeHtml(f)}</div>`).join('')}
       </div>`
    : '';

  const inner = `
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;color:#EDE8DD;margin:0 0 6px;">New intake received</h1>
    <div style="font-size:13px;color:rgba(237,232,221,0.7);margin-bottom:22px;">From ${escapeHtml(a.full_name || 'a guest')}</div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#EDE8DD;">
      <tr><td style="padding:4px 0;color:rgba(237,232,221,0.5);width:100px;">Name</td><td>${escapeHtml(a.full_name || '')}</td></tr>
      <tr><td style="padding:4px 0;color:rgba(237,232,221,0.5);">Email</td><td><a style="color:#D8A96E;" href="mailto:${escapeHtml(a.email || '')}">${escapeHtml(a.email || '')}</a></td></tr>
      <tr><td style="padding:4px 0;color:rgba(237,232,221,0.5);">DOB</td><td>${escapeHtml(a.dob || '')}</td></tr>
    </table>

    ${flagsHtml}

    <p style="font-size:14px;line-height:1.6;color:rgba(237,232,221,0.75);margin:22px 0 0;">
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
