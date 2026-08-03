# Creator Climb

A live creator leaderboard you update by hand. No demo data, no third-party APIs —
you enter each creator's numbers, and a weighted scoring model ranks them.

## Scoring model

- 40% average viewers
- 30% hours watched
- 15% growth rate (24h)
- 10% monetization signal (your own 0-100 estimate)
- 5% community activity (your own 0-100 estimate)

Each metric is normalized against the strongest creator currently on the board (there's
no external benchmark to compare against), so scores stay meaningful as your roster changes.
Weights live in `scoring.js` if you want to adjust them.

Two views ship on the public page: the **score leaderboard** (the blended ranking above)
and the **growth leaderboard** (sorted purely by 24h growth rate — who's rising fastest
right now, regardless of size).

## Deploying on Railway

1. Push this folder to a new GitHub repo.
2. In Railway, click **New Project → Deploy from GitHub repo** and pick it.
3. Click **New → Database → Add PostgreSQL** in the same project. Railway automatically
   sets `DATABASE_URL` on your app service — you don't need to copy anything.
4. Open your app service → **Variables** and add:
   - `ADMIN_PASSWORD` — the password you'll use to sign in and update the board
   - `SESSION_SECRET` — any long random string (e.g. generate one with
     `openssl rand -hex 32` locally)
   - `NODE_ENV` = `production`
5. Railway will detect Node automatically from `package.json` and run `npm start`.
6. Once deployed, open the generated Railway URL. The public leaderboard is at `/`,
   sign-in is at `/login`, and the admin dashboard is at `/admin`.

The database table is created automatically on first boot — no manual migration step.

## Running locally

```
npm install
cp .env.example .env   # then fill in a local DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm start
```

Requires a local Postgres instance if you're not pointing at Railway's.

## What's intentionally not built yet

- **Live platform data pulls** (Twitch/YouTube/TikTok/Instagram APIs) — this app is
  built around manual entry by design, per the original brief. Wiring in real API polling
  is a natural next step: add a scheduled job (Railway supports cron-style services) that
  calls each platform's API and writes into the same `creators` table.
- **Multi-user accounts** — right now it's a single shared admin password. Swapping in
  per-user logins means adding a `users` table and replacing the password check in
  `server.js` with real auth (e.g. `passport` or a hosted auth provider).
- **Trend charts** — `score_history` is already being written every time you hit
  "Save today's snapshot" in the admin dashboard, so the data's there once you're
  ready to add a charting view.
- **Content studio / contests pages** from the earlier prototype — happy to port those
  over as server-rendered pages too if you still want them in this version.
