const { Pool } = require("pg");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      // Production pool settings
      max: 5,                   // max connections in pool
      idleTimeoutMillis: 30000, // close idle connections after 30s
      connectionTimeoutMillis: 10000, // fail if can't connect in 10s
    }
  : {
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "postgres",
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

// ✅ Pre-warm: open a connection immediately so Neon wakes up
const warmUp = async () => {
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    console.log(`✅ DB connection warmed up in ${Date.now() - start}ms`);
  } catch (err) {
    console.error("⚠️ DB warm-up failed:", err.message);
  }
};

// ✅ Keep-alive: ping every 4 min to prevent Neon cold start
const KEEP_ALIVE_MS = 4 * 60 * 1000; // 4 minutes
setInterval(async () => {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    console.error("⚠️ Keep-alive ping failed:", err.message);
  }
}, KEEP_ALIVE_MS);

module.exports = {
  poolConfig,
  query: (text, params) => pool.query(text, params),
  pool,
  warmUp,
};
