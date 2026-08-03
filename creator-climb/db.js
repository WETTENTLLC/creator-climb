const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false)
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS creators (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      handle TEXT,
      platform TEXT DEFAULT 'Twitch',
      category TEXT,
      followers BIGINT DEFAULT 0,
      avg_viewers BIGINT DEFAULT 0,
      hours_watched BIGINT DEFAULT 0,
      growth_rate NUMERIC DEFAULT 0,
      monetization_score NUMERIC DEFAULT 0,
      community_score NUMERIC DEFAULT 0,
      streak INTEGER DEFAULT 0,
      live BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS score_history (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creators(id) ON DELETE CASCADE,
      score NUMERIC,
      rank INTEGER,
      recorded_at TIMESTAMP DEFAULT now()
    );
  `);
}

module.exports = { pool, initSchema };
