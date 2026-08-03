require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcryptjs');
const { pool, initSchema } = require('./db');
const { rankByScore, rankByGrowth, WEIGHTS } = require('./scoring');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);

if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL is not set. Attach a Postgres database before deploying.');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('WARNING: ADMIN_PASSWORD is not set. Set it in your environment before deploying.');
}
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET is not set. Set it in your environment before deploying.');
}

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/login');
}

app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

// ---------- Public leaderboard ----------
app.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM creators');
  const view = req.query.view === 'growth' ? 'growth' : 'score';
  const ranked = view === 'growth' ? rankByGrowth(rows) : rankByScore(rows);
  res.render('public', { creators: ranked, view, weights: WEIGHTS });
});

// ---------- Auth ----------
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (!adminPassword) {
    return res.render('login', { error: 'Server has no ADMIN_PASSWORD configured. Set it in your environment.' });
  }
  if (password === adminPassword) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Incorrect password.' });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------- Admin dashboard ----------
app.get('/admin', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM creators ORDER BY updated_at DESC');
  const ranked = rankByScore(rows);
  res.render('admin', { creators: ranked, weights: WEIGHTS, editTarget: null });
});

app.get('/admin/edit/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM creators ORDER BY updated_at DESC');
  const ranked = rankByScore(rows);
  const target = rows.find(c => String(c.id) === req.params.id);
  res.render('admin', { creators: ranked, weights: WEIGHTS, editTarget: target || null });
});

app.post('/admin/creators', requireAuth, async (req, res) => {
  const f = req.body;
  await pool.query(
    `INSERT INTO creators
      (name, handle, platform, category, followers, avg_viewers, hours_watched, growth_rate, monetization_score, community_score, streak, live, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())`,
    [
      f.name, f.handle, f.platform, f.category,
      Number(f.followers) || 0, Number(f.avg_viewers) || 0, Number(f.hours_watched) || 0,
      Number(f.growth_rate) || 0, Number(f.monetization_score) || 0, Number(f.community_score) || 0,
      Number(f.streak) || 0, f.live === 'on'
    ]
  );
  res.redirect('/admin');
});

app.post('/admin/creators/:id', requireAuth, async (req, res) => {
  const f = req.body;
  await pool.query(
    `UPDATE creators SET
      name=$1, handle=$2, platform=$3, category=$4, followers=$5, avg_viewers=$6,
      hours_watched=$7, growth_rate=$8, monetization_score=$9, community_score=$10,
      streak=$11, live=$12, updated_at=now()
     WHERE id=$13`,
    [
      f.name, f.handle, f.platform, f.category,
      Number(f.followers) || 0, Number(f.avg_viewers) || 0, Number(f.hours_watched) || 0,
      Number(f.growth_rate) || 0, Number(f.monetization_score) || 0, Number(f.community_score) || 0,
      Number(f.streak) || 0, f.live === 'on', req.params.id
    ]
  );
  res.redirect('/admin');
});

app.post('/admin/creators/:id/delete', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM creators WHERE id=$1', [req.params.id]);
  res.redirect('/admin');
});

// Snapshots current ranks into score_history - call this whenever you want to log a data point for trend charts later
app.post('/admin/snapshot', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM creators');
  const ranked = rankByScore(rows);
  for (let i = 0; i < ranked.length; i++) {
    await pool.query(
      'INSERT INTO score_history (creator_id, score, rank) VALUES ($1,$2,$3)',
      [ranked[i].id, ranked[i].score, i + 1]
    );
  }
  res.redirect('/admin');
});

let server;

async function startServer() {
  try {
    await initSchema();
    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Creator Climb running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

startServer();
