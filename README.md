# Field Engineer Kit

Engineering and procurement calculator platform for global plant maintenance technicians and material buyers.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase
- **Deployment:** Vercel

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Local dev on Windows (speed)

| Command | When to use |
|---------|-------------|
| `npm run dev` | **Default** — Turbopack hot reload (~10s ready). Use this for Cursor / AI edits. Save → refresh; no full rebuild. |
| `npm run dev:stable` | Production build + `next start` — slow first start, fastest repeat clicks |
| `npm run preview` | One-shot **production** build + start (2–4+ min on Windows). Only when you need production preview — not for routine Cursor edits. |
| `npm run dev:repair` | Port 3000 stuck or `.next` corrupted (500 / errno -4094) — kills port, clears cache |
| `npm run dev:repair:start` | Same as repair, then starts `npm run dev` |
| `npm run dev:webpack` | Legacy webpack dev (slower; only if Turbopack misbehaves) |

Optional: set `FEK_WARM=1` with Turbopack to pre-compile a few top routes in the background.

If pages hang or return 500 after many edits, run `npm run dev:repair` once, then `npm run dev` again.

## Packages

| Package | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Supabase client SDK |
| `@supabase/ssr` | Cookie-based auth for Next.js App Router (middleware, server, browser) |

## Supabase Setup

### 1. Environment variables

Create `.env.local` from `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `ADMIN_ALLOWED_EMAIL` | No | Admin email allowlist (default: `jehylabs@gmail.com`) |

### 2. Google OAuth

In Supabase Dashboard:

1. **Authentication → Providers → Google** — enable and add Google OAuth credentials.
2. **Authentication → URL Configuration** — add redirect URLs:
   - `http://localhost:3000/auth/callback` (local)
   - `https://your-domain.vercel.app/auth/callback` (production)

### 3. Database migration

Run the SQL in `supabase/migrations/001_calculators.sql` via the Supabase SQL Editor or CLI.

## Admin Access

| Route | Description |
|-------|-------------|
| `/admin` | Google sign-in page |
| `/admin/dashboard` | Protected admin dashboard (authorized email only) |
| `/admin/forbidden` | 403 page for unauthorized Google accounts |

Access rules (enforced in `src/middleware.ts`):

- Not signed in → redirect to `/admin`
- Signed in with `jehylabs@gmail.com` → allow `/admin/dashboard`
- Signed in with any other email → redirect to `/admin/forbidden`

## Project Structure

```
field-engineer-kit/
├── src/
│   ├── app/
│   │   ├── admin/              # Admin login, dashboard, forbidden
│   │   ├── auth/callback/      # OAuth callback handler
│   │   └── ...
│   ├── components/admin/       # GoogleSignInButton, SignOutButton
│   ├── lib/
│   │   ├── auth/admin.ts       # Admin email allowlist
│   │   └── supabase/           # browser, server, middleware clients
│   └── middleware.ts           # Route protection
├── supabase/migrations/        # SQL scripts
└── .env.example
```

## Deploy on Vercel

Push to GitHub and import the repo in Vercel. Add Supabase environment variables and set the OAuth redirect URL to your production domain.
