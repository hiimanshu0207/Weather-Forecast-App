/**
 * SkyCast Pro — Vercel Serverless API Handler (single-file, no relative imports)
 * All routes inlined so @vercel/node bundles correctly.
 * NOTE: No dotenv here — Vercel injects env vars directly.
 */

const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app     = express();
const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE    = 'https://api.openweathermap.org';

// ─── Simple in-memory cache (resets per cold start — fine for serverless) ─────
const cache = new Map();
const CACHE_TTL = 600 * 1000; // 10 minutes

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, methods: ['GET', 'OPTIONS'], optionsSuccessStatus: 200 }));
app.use(express.json());

// ─── Error helper ─────────────────────────────────────────────────────────────
function handleError(err, res) {
  if (err.response) {
    const s = err.response.status;
    const m = err.response.data?.message || 'API error';
    if (s === 401) return res.status(401).json({ error: 'Invalid API key. Get one free at openweathermap.org' });
    if (s === 404) return res.status(404).json({ error: `City not found: ${m}` });
    if (s === 429) return res.status(429).json({ error: 'API rate limit exceeded. Try again later.' });
    return res.status(s).json({ error: m });
  }
  if (err.code === 'ECONNABORTED') return res.status(504).json({ error: 'Weather API timed out' });
  return res.status(500).json({ error: err.message || 'Internal server error' });
}

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', apiKey: API_KEY ? '✓ set' : '✗ missing', ts: new Date().toISOString() });
});

// ─── GET /api/weather ─────────────────────────────────────────────────────────
app.get('/api/weather', async (req, res) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    if (!city && (!lat || !lon)) return res.status(400).json({ error: 'Provide city or lat/lon' });

    const cacheKey = `w_${city || `${lat},${lon}`}_${units}`;
    const cached   = getCache(cacheKey);
    if (cached) return res.set('X-Cache', 'HIT').json({ success: true, data: cached });

    const params = { appid: API_KEY, units, lang: 'en' };
    if (city) params.q = city; else { params.lat = lat; params.lon = lon; }

    const { data } = await axios.get(`${BASE}/data/2.5/weather`, { params, timeout: 8000 });
    const result = {
      city: data.name, country: data.sys.country, coordinates: data.coord,
      temperature: Math.round(data.main.temp), feelsLike: Math.round(data.main.feels_like),
      tempMin: Math.round(data.main.temp_min), tempMax: Math.round(data.main.temp_max),
      humidity: data.main.humidity, pressure: data.main.pressure,
      visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
      windSpeed: data.wind.speed, windDeg: data.wind.deg, windGust: data.wind.gust || null,
      clouds: data.clouds.all, description: data.weather[0].description,
      condition: data.weather[0].main, icon: data.weather[0].icon,
      sunrise: data.sys.sunrise, sunset: data.sys.sunset,
      timezone: data.timezone, dt: data.dt, units
    };
    setCache(cacheKey, result);
    res.set('X-Cache', 'MISS').json({ success: true, data: result });
  } catch (err) { handleError(err, res); }
});

// ─── GET /api/forecast ────────────────────────────────────────────────────────
app.get('/api/forecast', async (req, res) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    if (!city && (!lat || !lon)) return res.status(400).json({ error: 'Provide city or lat/lon' });

    const cacheKey = `f_${city || `${lat},${lon}`}_${units}`;
    const cached   = getCache(cacheKey);
    if (cached) return res.set('X-Cache', 'HIT').json({ success: true, data: cached });

    const params = { appid: API_KEY, units, lang: 'en' };
    if (city) params.q = city; else { params.lat = lat; params.lon = lon; }

    const { data } = await axios.get(`${BASE}/data/2.5/forecast`, { params, timeout: 8000 });

    // Hourly: next 8 slots (24h)
    const hourly = data.list.slice(0, 8).map(h => ({
      dt: h.dt, temp: Math.round(h.main.temp), feelsLike: Math.round(h.main.feels_like),
      condition: h.weather[0].main, description: h.weather[0].description,
      icon: h.weather[0].icon, humidity: h.main.humidity,
      windSpeed: h.wind.speed, pop: Math.round((h.pop || 0) * 100)
    }));

    // Daily: one entry per day (closest to midday)
    const dailyMap = new Map();
    data.list.forEach(h => {
      const day  = new Date(h.dt * 1000).toLocaleDateString('en-CA');
      const hour = new Date(h.dt * 1000).getUTCHours();
      if (!dailyMap.has(day)) dailyMap.set(day, []);
      dailyMap.get(day).push({ hour, h });
    });

    const daily = [];
    dailyMap.forEach((items, _date) => {
      const best = items.reduce((a, b) => Math.abs(a.hour - 12) < Math.abs(b.hour - 12) ? a : b);
      const { h } = best;
      const temps = items.map(i => i.h.main.temp);
      daily.push({
        date: _date, dt: h.dt,
        tempMin: Math.round(Math.min(...temps)), tempMax: Math.round(Math.max(...temps)),
        temp: Math.round(h.main.temp), condition: h.weather[0].main,
        description: h.weather[0].description, icon: h.weather[0].icon,
        humidity: h.main.humidity, windSpeed: h.wind.speed,
        pop: Math.round((h.pop || 0) * 100)
      });
    });

    const result = { city: data.city.name, country: data.city.country, timezone: data.city.timezone, hourly, daily: daily.slice(0, 7), units };
    setCache(cacheKey, result);
    res.set('X-Cache', 'MISS').json({ success: true, data: result });
  } catch (err) { handleError(err, res); }
});

// ─── GET /api/search ──────────────────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ error: 'Query must be at least 2 characters' });

    const cached = getCache(`s_${q.toLowerCase()}`);
    if (cached) return res.json({ success: true, results: cached });

    const { data } = await axios.get(`${BASE}/geo/1.0/direct`, { params: { q, limit: 8, appid: API_KEY }, timeout: 8000 });
    const results = data.map(c => ({
      name: c.name, state: c.state, country: c.country, lat: c.lat, lon: c.lon,
      display: [c.name, c.state, c.country].filter(Boolean).join(', ')
    }));
    setCache(`s_${q.toLowerCase()}`, results);
    res.json({ success: true, results });
  } catch (err) { handleError(err, res); }
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
