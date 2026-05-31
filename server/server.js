/**
 * SkyCast Pro — Express Backend Server
 * Full-stack weather forecast application
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const weatherRoutes = require('./routes/weather');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL;

// ─── CORS ────────────────────────────────────────────────────────────────────
app.use(cors({ origin: true, methods: ['GET', 'OPTIONS'], optionsSuccessStatus: 200 }));

// ─── JSON Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Rate Limiting (local only — Vercel has built-in DDoS protection) ────────
if (!IS_VERCEL) {
  const rateLimit = require('express-rate-limit');
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
  }));
}

// ─── Static Files (local dev only — Vercel CDN serves these in production) ───
if (!IS_VERCEL) {
  app.use(express.static(path.join(__dirname, '../public'), { maxAge: '1h', etag: true }));
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', weatherRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    apiKey: process.env.OPENWEATHER_API_KEY ? '✓ set' : '✗ missing',
    version: '1.0.0'
  });
});

// ─── SPA Fallback (local dev only — Vercel handles via vercel.json routes) ───
if (!IS_VERCEL) {
  app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// ─── Global Error Handler — always returns JSON ───────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()}`, err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start Server (local only) ────────────────────────────────────────────────
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🌤  SkyCast Pro running at http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${process.env.OPENWEATHER_API_KEY ? '✓ Configured' : '✗ Missing'}\n`);
  });
}

module.exports = app;
