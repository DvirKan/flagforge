# Deployment (GitHub → Vercel, Supabase, email)

Order matters: code on GitHub → Vercel project → Supabase URLs → email. Every step is reversible.
Secrets are typed **only** into the dashboards named below — never into chat, code or commits.

## 1. GitHub

1. github.com → **New repository** → name `flagforge`, **Private**, *no* README / .gitignore / license.
2. In the project folder (PowerShell):
   ```powershell
   git remote add origin https://github.com/<your-user>/flagforge.git
   git push -u origin main
   ```
3. **Actions** tab: the *CI* workflow runs on every push (typecheck, lint, dataset, unit + database tests on a
   throwaway PostgreSQL, build, guest e2e). It needs no secrets.
4. For the weekly challenge workflow: **Settings → Secrets and variables → Actions → New repository secret**
   - `NEXT_PUBLIC_SUPABASE_URL` — `https://<project-ref>.supabase.co`
   - `SUPABASE_SECRET_KEY` — the `sb_secret_…` key (same as in `.env.local`)

   Then **Actions → Prepare daily challenges → Run workflow** once to check it. It then runs every Sunday,
   keeps the next 30 days published and validates the next 14.

## 2. Vercel

1. vercel.com → sign in with GitHub → **Add New → Project** → import `flagforge`. Framework: Next.js (auto).
2. **Environment Variables** (environment: **Production**):

   | Name | Value | Sensitive |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | no |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | no (public by design) |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` | **yes** |
   | `GAME_SESSION_SECRET` | a **new** value: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` | **yes** |
   | `NEXT_PUBLIC_SITE_URL` | `https://<project>.vercel.app` (fill in after the first deploy) | no |

   Preview deployments get no Supabase variables on purpose: they run in guest mode and cannot touch
   production data.
3. **Deploy**. Note the production URL (`https://<project>.vercel.app`), set `NEXT_PUBLIC_SITE_URL` to it and
   **Redeploy** — `NEXT_PUBLIC_*` values are baked in at build time.
4. Optional: **Settings → Functions → Region** — choose the region closest to your Supabase project
   (Supabase → Project Settings → General shows it).

## 3. Supabase (production URLs)

**Authentication → URL Configuration**
- **Site URL**: `https://<project>.vercel.app`
- **Redirect URLs**: add `https://<project>.vercel.app/**` (keep `http://localhost:3000/**` for development)

## 4. Email (custom SMTP)

Without custom SMTP Supabase only emails members of your Supabase organisation (2 per hour) — other players
could not confirm their account or reset a password.

**With a Gmail account** (no domain needed; a dedicated account is recommended — see below):
1. Google account → Security → turn on **2-Step Verification**.
2. myaccount.google.com/apppasswords → create an app password named `FLAGFORGE` (16 characters).
3. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Sender email: the Gmail address (Gmail rewrites any other "from")
   - Sender name: `FLAGFORGE`
   - Host `smtp.gmail.com`, port `465`
   - Username: the Gmail address · Password: the app password
4. **Authentication → Rate Limits**: emails per hour — 30 is plenty to start.
5. **Authentication → Emails → Templates**:
   - *Confirm signup* — subject `Confirm your email · אימות האימייל — FLAGFORGE`, body: contents of
     `supabase/templates/confirm-signup.html`
   - *Reset password* — subject `Reset your password · איפוס סיסמה — FLAGFORGE`, body: contents of
     `supabase/templates/reset-password.html`

   These links (token hash → `/auth/confirm`) work on any device, unlike the default ones.

Why a dedicated Gmail: the address is visible to every player, and an app password can read the whole mailbox.
If it ever leaked, only an empty project account would be exposed. Revoke it any time at the same page.

## 5. After deploying — checklist

- [ ] Home page loads; `/daily` shows today's challenge; flags render
- [ ] Register with a real address you own → email arrives → link confirms → `/profile?welcome=1`
- [ ] Forgot password → email → link → new password works
- [ ] Play a standard game while signed in → appears on `/profile`, `/map`, `/achievements`
- [ ] `/admin` works for your account and 404s in a private window
- [ ] Response headers include `Content-Security-Policy` and `Strict-Transport-Security`
      (browser dev tools → Network → the document request)

## Later: your own domain

**Site** (~15 min, no code change): Vercel → Project → Settings → Domains → add it and create the DNS records
it shows → set `NEXT_PUBLIC_SITE_URL` to `https://your-domain` and redeploy → Supabase Site URL + Redirect
URLs to the new domain (keep the old one in Redirect URLs for a while) → Vercel can redirect the
`vercel.app` address to the domain. Players sign in once more (sessions are per domain); data is unchanged.

**Email** (~20 min, no code change): e.g. Resend (free: 3,000 emails/month, 100/day) → add and verify the domain
(DNS records) → create an SMTP key → replace host / port / username / password / sender in Supabase SMTP
Settings (sender e.g. `no-reply@your-domain`). Templates stay as they are.
