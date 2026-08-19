# Wyrd Pharm — Retreat Intake

A mobile-first pre-arrival intake questionnaire. Guests fill it in on their phone.
On submit, a professionally styled PDF is emailed to the guest and to the retreat team.

Design matches the Wyrd Pharm brand: dark background, cream text, amber-gold accents;
Cormorant Garamond + Inter typography.

---

## Deploy to GitHub + Vercel (10 minutes)

### 1 · Push this code to GitHub

Create an empty repo at <https://github.com/new> — call it `wyrd-intake` (private is fine).

Then, from the unzipped folder in your terminal:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:YOUR-USERNAME/wyrd-intake.git
git push -u origin main
```

*(If you use HTTPS instead of SSH: `git remote add origin https://github.com/YOUR-USERNAME/wyrd-intake.git`)*

### 2 · Sign up for Resend and get an API key

- Go to <https://resend.com> → **Sign up** (email/GitHub/Google — 30 seconds).
- **API Keys** → **Create API Key** → name it `wyrd-intake`, permission **Sending access**, domain **All Domains**.
- Copy the key (starts with `re_`). You'll paste it into Vercel next.

**About the sender address:**
- **Fastest** — use `onboarding@resend.dev`. Works immediately, no setup, emails just arrive from that address. Fine for your 14 guests this month.
- **Nicer, when you have time** — verify your own domain in Resend → **Domains** → **Add Domain**. Takes ~5 minutes (add a few DNS records at your registrar, click verify). Then set `MAIL_FROM` to `Wyrd Pharm <intake@wyrdpharm.com>`.

### 3 · Import into Vercel

- Go to <https://vercel.com/new>.
- **Import Git Repository** → pick your `wyrd-intake` repo.
- Vercel auto-detects Next.js — no build settings to change.
- Before you click **Deploy**, expand **Environment Variables** and add these three:

  | Name | Value |
  |---|---|
  | `RESEND_API_KEY` | `re_...` (from step 2) |
  | `MAIL_FROM` | `Wyrd Pharm <onboarding@resend.dev>` |
  | `MAIL_TO_RETREAT` | `info@wyrdpharm.com` |

- Click **Deploy**. Wait ~1 minute. You'll get a URL like `https://wyrd-intake.vercel.app`.

### 4 · Test end to end

- Open the URL on your phone.
- Fill in the form using your own email.
- Confirm the PDF arrives at both your email and `info@wyrdpharm.com`.
- If it doesn't arrive: check spam, then Resend → **Logs** for the send status.

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
cp .env.example .env.local        # then edit .env.local with your Resend key
npm run dev                       # http://localhost:3000
```

Set `INTAKE_DRY_RUN=1` in `.env.local` to skip actually sending emails while testing.

---

## Making changes

Because you deployed via GitHub → Vercel, every push to `main` auto-deploys.
Edit locally, then:

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
- **Background image** — `styles/globals.css`, the `body { background: ... }` rule. Swap the Unsplash URL for your own.
- **Emails wording** — `pages/api/submit.js`, the `renderGuestEmail` and `renderTeamEmail` functions.

### Use your own domain

Vercel → your project → **Settings** → **Domains** → add e.g. `intake.wyrdpharm.com`.
Add the DNS record Vercel shows you, and it becomes the public URL.

---

## File layout

```
pages/index.js          The form itself (React, single-page, 6 steps + review + success)
pages/api/submit.js     Serverless endpoint: receives answers, generates PDF, sends emails
pages/_app.js           Global head tags, imports stylesheet
lib/questions.js        Single source of truth for questions
lib/pdf.js              PDF generation with pdfkit
styles/globals.css      All styling, matching the Wyrd Pharm palette
vercel.json             30s max duration for the submit function
next.config.js          Marks pdfkit as external so its font files bundle cleanly
.env.example            Env var reference — copy to .env.local for local dev
.gitignore              Standard Next.js ignores
```

---

## Troubleshooting

- **Emails don't send** — check Resend → **Logs**. Most common cause: `RESEND_API_KEY` missing or wrong in Vercel env vars, or `MAIL_FROM` uses a domain you haven't verified in Resend. Using `onboarding@resend.dev` sidesteps the domain issue.
- **PDF looks wrong / footer missing** — the `bufferPages: true` option in `lib/pdf.js` is what allows page-number footers; don't remove it.
- **Guest says the form lost their answers** — answers save to the guest's browser `localStorage`. If they clear browser data or switch phones/browsers, the draft is gone. This is by design — no medical data touches any server until they submit.
- **Vercel build fails** — most likely a syntax error in a recent edit. Check the build log for the offending file and line.
