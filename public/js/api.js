/**
 * api.js — All backend fetch calls for SkyCast Pro
 */

const API_BASE = '/api';

const WeatherAPI = {
  async getWeather({ city, lat, lon, units = 'metric' }) {
    const params = new URLSearchParams({ units });
    if (city) params.set('city', city);
    if (lat)  params.set('lat', lat);
    if (lon)  params.set('lon', lon);
    const res = await fetch(`${API_BASE}/weather?${params}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch weather');
    return json.data;
  },

  async getForecast({ city, lat, lon, units = 'metric' }) {
    const params = new URLSearchParams({ units });
    if (city) params.set('city', city);
    if (lat)  params.set('lat', lat);
    if (lon)  params.set('lon', lon);
    const res = await fetch(`${API_BASE}/forecast?${params}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to fetch forecast');
    return json.data;
  },

  async searchCities(q) {
    if (!q || q.trim().length < 2) return [];
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q.trim())}`);
    const json = await res.json();
    if (!res.ok) return [];
    return json.results || [];
  }
};

window.WeatherAPI = WeatherAPI;
