/**
 * Weather API Routes — SkyCast Pro
 * Proxies OpenWeatherMap API with caching and error handling
 */

const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');

const router = express.Router();

// ─── Cache Setup (TTL: 10 minutes) ───────────────────────────────────────────
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 600,
  checkperiod: 120,
  useClones: false
});

const BASE_URL = 'https://api.openweathermap.org';
const API_KEY = process.env.OPENWEATHER_API_KEY;

// ─── Helper: Make cached OWM request ─────────────────────────────────────────
async function cachedFetch(cacheKey, url, params) {
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[CACHE HIT] ${cacheKey}`);
    return { data: cached, fromCache: true };
  }

  console.log(`[CACHE MISS] Fetching: ${cacheKey}`);
  const response = await axios.get(url, { params, timeout: 8000 });
  cache.set(cacheKey, response.data);
  return { data: response.data, fromCache: false };
}

// ─── Helper: Build common params ─────────────────────────────────────────────
function buildParams(query, units = 'metric') {
  const params = { appid: API_KEY, units, lang: 'en' };
  if (query.lat && query.lon) {
    params.lat = query.lat;
    params.lon = query.lon;
  } else if (query.city) {
    params.q = query.city;
  }
  return params;
}

// ─── Route: GET /api/weather ──────────────────────────────────────────────────
// Query: ?city=London&units=metric  OR  ?lat=51.5&lon=-0.1&units=metric
router.get('/weather', async (req, res, next) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    if (!city && (!lat || !lon)) {
      return res.status(400).json({ error: 'Provide city or lat/lon coordinates' });
    }

    const params = buildParams({ city, lat, lon }, units);
    const cacheKey = `weather_${city || `${lat},${lon}`}_${units}`;

    const { data, fromCache } = await cachedFetch(
      cacheKey,
      `${BASE_URL}/data/2.5/weather`,
      params
    );

    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json({
      success: true,
      data: {
        city: data.name,
        country: data.sys.country,
        coordinates: data.coord,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        tempMin: Math.round(data.main.temp_min),
        tempMax: Math.round(data.main.temp_max),
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
        windSpeed: data.wind.speed,
        windDeg: data.wind.deg,
        windGust: data.wind.gust || null,
        clouds: data.clouds.all,
        description: data.weather[0].description,
        condition: data.weather[0].main,
        icon: data.weather[0].icon,
        sunrise: data.sys.sunrise,
        sunset: data.sys.sunset,
        timezone: data.timezone,
        dt: data.dt,
        units
      }
    });
  } catch (err) {
    handleApiError(err, res, next);
  }
});

// ─── Route: GET /api/forecast ─────────────────────────────────────────────────
// Query: ?city=London&units=metric  OR  ?lat=51.5&lon=-0.1
router.get('/forecast', async (req, res, next) => {
  try {
    const { city, lat, lon, units = 'metric' } = req.query;
    if (!city && (!lat || !lon)) {
      return res.status(400).json({ error: 'Provide city or lat/lon coordinates' });
    }

    const params = buildParams({ city, lat, lon }, units);
    const cacheKey = `forecast_${city || `${lat},${lon}`}_${units}`;

    const { data, fromCache } = await cachedFetch(
      cacheKey,
      `${BASE_URL}/data/2.5/forecast`,
      params
    );

    // Process: group into daily + extract hourly
    const hourly = data.list.slice(0, 8).map(item => ({
      dt: item.dt,
      temp: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      condition: item.weather[0].main,
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      humidity: item.main.humidity,
      windSpeed: item.wind.speed,
      pop: Math.round((item.pop || 0) * 100) // precipitation probability %
    }));

    // Build daily summary (one entry per day — at ~noon)
    const dailyMap = new Map();
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const hour = date.getUTCHours();

      if (!dailyMap.has(day)) {
        dailyMap.set(day, { temps: [], items: [] });
      }
      dailyMap.get(day).temps.push(item.main.temp);
      dailyMap.get(day).items.push({ hour, item });
    });

    const daily = [];
    dailyMap.forEach((val, dateStr) => {
      // Pick the midday reading (closest to 12:00)
      const best = val.items.reduce((a, b) =>
        Math.abs(a.hour - 12) < Math.abs(b.hour - 12) ? a : b
      );
      const { item } = best;
      daily.push({
        date: dateStr,
        dt: item.dt,
        tempMin: Math.round(Math.min(...val.temps)),
        tempMax: Math.round(Math.max(...val.temps)),
        temp: Math.round(item.main.temp),
        condition: item.weather[0].main,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        pop: Math.round((item.pop || 0) * 100)
      });
    });

    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json({
      success: true,
      data: {
        city: data.city.name,
        country: data.city.country,
        timezone: data.city.timezone,
        hourly,
        daily: daily.slice(0, 7),
        units
      }
    });
  } catch (err) {
    handleApiError(err, res, next);
  }
});

// ─── Route: GET /api/search ───────────────────────────────────────────────────
// Query: ?q=Lond
router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    const cacheKey = `search_${q.toLowerCase()}`;
    const { data } = await cachedFetch(
      cacheKey,
      `${BASE_URL}/geo/1.0/direct`,
      { q, limit: 8, appid: API_KEY }
    );

    const results = data.map(city => ({
      name: city.name,
      state: city.state,
      country: city.country,
      lat: city.lat,
      lon: city.lon,
      display: [city.name, city.state, city.country].filter(Boolean).join(', ')
    }));

    res.json({ success: true, results });
  } catch (err) {
    handleApiError(err, res, next);
  }
});

// ─── Route: GET /api/cache-stats ─────────────────────────────────────────────
router.get('/cache-stats', (req, res) => {
  res.json({
    keys: cache.keys().length,
    stats: cache.getStats()
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
function handleApiError(err, res, next) {
  if (err.response) {
    const status = err.response.status;
    const owmMsg = err.response.data?.message || 'Unknown API error';
    if (status === 401) return res.status(401).json({ error: 'Invalid API key. Get one free at openweathermap.org' });
    if (status === 404) return res.status(404).json({ error: `City not found: ${owmMsg}` });
    if (status === 429) return res.status(429).json({ error: 'API rate limit exceeded. Try again later.' });
    return res.status(status).json({ error: owmMsg });
  }
  if (err.code === 'ECONNABORTED') {
    return res.status(504).json({ error: 'Weather API request timed out' });
  }
  next(err);
}

module.exports = router;
