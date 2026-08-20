# Wyrd Pharm — Retreat Intake

A mobile-first pre-arrival intake questionnaire. Guests fill it in on their phone.
On submit, a professionally styled PDF is emailed to the guest and to the retreat team.

Design: warm parchment palette, amber-gold accents, Cormorant Garamond + Inter typography.

---

## Deploy to GitHub + Vercel (10 minutes)

### 1 · Push this code to GitHub

Create an empty repo at <https://github.com/new>. Then from the folder:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

### 2 · Set up a Google App Password for sending mail

Emails go out via Gmail SMTP — no domain verification needed, no external service to sign up for.

1. Enable 2-Step Verification on your Google account (required by Google before app passwords are available):
   <https://myaccount.google.com/signinoptions/two-step-verification>
2. Create an App Password:
   <https://myaccount.google.com/apppasswords>
   - App name: `wyrd-intake` (or anything you like)
   - Google shows a 16-character password like `abcd efgh ijkl mnop` — copy it. **You will only see it once.**

Gmail's free tier allows up to 500 emails per day, easily enough for 14 guests + you and the team.

### 3 · Import into Vercel

- Go to <https://vercel.com/new>.
- Import your `wyrd-intake` repo. Vercel auto-detects Next.js.
- Expand **Environment Variables** and add these:

  | Name | Value |
  |---|---|
  | `SMTP_USER` | your Gmail address, e.g. `philipjordangill@gmail.com` |
  | `SMTP_PASS` | the 16-char App Password from step 2 (spaces are OK, code strips them) |
  | `MAIL_FROM` | `Wyrd Pharm <philipjordangill@gmail.com>` |
  | `MAIL_TO_RETREAT` | `info@wyrdpharm.com` |

- Click **Deploy**. About a minute later you have a URL like `https://wyrd-intake.vercel.app`.

**Note on the sender address:** with Gmail SMTP the "from" email must be your Gmail address (or a Send-as alias you've configured in Gmail Settings → Accounts → Send mail as). Guests will see your email as the sender. When you eventually get DNS access to `wyrdpharm.com`, you can either set up a Send-as alias in Gmail so replies still land in your inbox, or migrate to a dedicated sending service like Resend or Postmark.

### 4 · Test it once, end to end

- Open the URL on your phone.
- Fill in the form using your own email as the guest email.
- Confirm the PDF arrives at both your email and `info@wyrdpharm.com`.
- If it doesn't arrive: check your spam folder. The Vercel deployment's **Runtime Logs** tab shows any send errors verbatim.

### 5 · Send the link to your 14 guests

Suggested message:

> Ahead of the retreat, please take 20–30 minutes to complete your pre-arrival intake here: **https://wyrd-intake.vercel.app**
>
> The form is designed to be filled in on your phone. Your answers save automatically as you go — you can close the page and return to finish later.
>
> When you submit, a copy will be sent to you and to the retreat team. If anything about your health or medications changes between now and the retreat, please write to info@wyrdpharm.com so we can update your record.

---

## Local development (optional)

```bash
npm install
cp .env.example .env.local        # then edit .env.local with your SMTP details
npm run dev                       # http://localhost:3000
```

Set `INTAKE_DRY_RUN=1` in `.env.local` to skip actually sending emails while testing.

---

## Making changes

Because you deployed via GitHub → Vercel, every push to `main` auto-deploys.
Edit locally (or in a Codespace), then:

```bash
git add .
git commit -m "Describe the change"
git push
```

Vercel builds and rolls out in ~1 minute.

### Common tweaks

- **Add/remove/reword a question** — `lib/questions.js`. The form UI, the review page, and the emailed PDF are all driven from that one file.
- **Colours** — `styles/globals.css`, the `:root` block. PDF colours live in `lib/pdf.js` (the `COLORS` const).
- **Fonts** — `styles/globals.css`, `--serif` and `--sans` (imported from Google Fonts).
- **Emails wording** — `pages/api/submit.js`, the `renderGuestEmail` and `renderTeamEmail` functions.

### Use your own domain

Vercel → your project → **Settings** → **Domains** → add e.g. `intake.wyrdpharm.com`. Add the DNS record Vercel shows you at whoever manages the `wyrdpharm.com` DNS, and it becomes the public URL.

---

## File layout

```
pages/index.js          The form (React, single-page, 6 steps + review + success)
pages/api/submit.js     Serverless endpoint: receives answers, generates PDF, sends emails via SMTP
pages/_app.js           Global head tags, imports stylesheet
lib/questions.js        Single source of truth for questions
lib/pdf.js              PDF generation with pdfkit
styles/globals.css      All styling (warm parchment palette)
vercel.json             30s max duration for the submit function
next.config.js          Marks pdfkit as external so its font files bundle cleanly
.env.example            Env var reference — copy to .env.local for local dev
.gitignore              Standard Next.js ignores
```

---

## Troubleshooting

- **"Email send failed" on submit** — the error message now includes the specific SMTP reason. Almost always one of:
  - `Invalid login` / `Username and Password not accepted` → `SMTP_USER` or `SMTP_PASS` is wrong. For Gmail, `SMTP_PASS` must be a 16-character **App Password** (not your normal Google password), and **2-Step Verification must be turned on** for the Google account (Google only shows app passwords once 2FA is enabled).
  - `ETIMEDOUT` / `ECONNREFUSED` → `SMTP_HOST` or `SMTP_PORT` is wrong. Default is `smtp.gmail.com:465`.
  - Anything else → open the Vercel deployment's **Runtime Logs** tab and search for `submit handler error`.
- **PDF looks wrong / footer missing** — the `bufferPages: true` option in `lib/pdf.js` allows page-number footers; don't remove it.
- **Guest says the form lost their answers** — answers save to the guest's browser `localStorage`. If they clear browser data or switch phones/browsers, the draft is gone. This is by design — no medical data touches any server until they submit.
- **Vercel build fails** — most likely a syntax error in a recent edit. Check the build log for the offending file and line.

### Switching sending services later

The code uses **nodemailer** with SMTP, so any SMTP service works — swap Gmail for AWS SES, Mailgun SMTP, Postmark SMTP, Resend SMTP, etc. by changing `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`. When you get DNS access to `wyrdpharm.com`, a dedicated transactional sender is a good upgrade — better deliverability and a proper `intake@wyrdpharm.com` from address.
