/**
 * app.js — Main application controller for SkyCast Pro
 */

(function () {
  'use strict';

  const state = { units: localStorage.getItem('skycast_units') || 'metric', lastQuery: null, searchTimeout: null, abortController: null };

  const searchInput   = document.getElementById('search-input');
  const searchClear   = document.getElementById('search-clear');
  const btnCelsius    = document.getElementById('btn-celsius');
  const btnFahrenheit = document.getElementById('btn-fahrenheit');
  const btnGeo        = document.getElementById('btn-geolocate');
  const errorRetry    = document.getElementById('error-retry');

  function init() {
    UI.startClock();
    applyUnit(state.units, false);
    const savedCity = localStorage.getItem('skycast_last_city');
    if (savedCity) loadWeather({ city: savedCity });
    else geolocate();
    bindEvents();
    registerServiceWorker();
  }

  async function loadWeather(query) {
    if (state.abortController) state.abortController.abort();
    state.abortController = new AbortController();
    state.lastQuery = query;
    UI.showLoading();
    try {
      const [weather, forecast] = await Promise.all([
        WeatherAPI.getWeather({ ...query, units: state.units }),
        WeatherAPI.getForecast({ ...query, units: state.units }),
      ]);
      UI.renderCurrent(weather, state.units);
      UI.renderHourly(forecast.hourly, state.units);
      UI.renderDaily(forecast.daily, state.units);
      Charts.renderTempChart(forecast.hourly, state.units);
      UI.showContent();
      if (query.city) localStorage.setItem('skycast_last_city', query.city);
    } catch (err) {
      if (err.name === 'AbortError') return;
      UI.showError(err.message || 'Could not load weather data. Please try again.');
    }
  }

  function onSearchInput(e) {
    const val = e.target.value.trim();
    searchClear.hidden = val.length === 0;
    clearTimeout(state.searchTimeout);
    if (val.length < 2) { UI.hideDropdown(); return; }
    state.searchTimeout = setTimeout(async () => {
      const results = await WeatherAPI.searchCities(val);
      UI.renderDropdown(results, (city) => { loadWeather({ city: city.name, lat: city.lat, lon: city.lon }); });
    }, 320);
  }

  function geolocate() {
    if (!navigator.geolocation) { loadWeather({ city: 'London' }); return; }
    btnGeo.classList.add('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { btnGeo.classList.remove('loading'); loadWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }); },
      ()    => { btnGeo.classList.remove('loading'); loadWeather({ city: 'London' }); },
      { timeout: 8000 }
    );
  }

  function applyUnit(unit, reload = true) {
    state.units = unit;
    localStorage.setItem('skycast_units', unit);
    btnCelsius.classList.toggle('active', unit === 'metric');
    btnFahrenheit.classList.toggle('active', unit === 'imperial');
    btnCelsius.setAttribute('aria-pressed', unit === 'metric');
    btnFahrenheit.setAttribute('aria-pressed', unit === 'imperial');
    document.getElementById('temp-unit-label').textContent = unit === 'metric' ? '°C' : '°F';
    if (reload && state.lastQuery) loadWeather(state.lastQuery);
  }

  function bindEvents() {
    searchInput.addEventListener('input', onSearchInput);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { UI.hideDropdown(); if (searchInput.value.trim()) loadWeather({ city: searchInput.value.trim() }); }
      if (e.key === 'Escape') { UI.hideDropdown(); searchInput.blur(); }
    });
    searchClear.addEventListener('click', () => { searchInput.value = ''; searchClear.hidden = true; UI.hideDropdown(); searchInput.focus(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.search-wrapper')) UI.hideDropdown(); });
    btnCelsius.addEventListener('click', () => applyUnit('metric'));
    btnFahrenheit.addEventListener('click', () => applyUnit('imperial'));
    btnGeo.addEventListener('click', geolocate);
    errorRetry.addEventListener('click', () => { if (state.lastQuery) loadWeather(state.lastQuery); else geolocate(); });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(r => console.log('[SW] Registered:', r.scope))
        .catch(e => console.warn('[SW] Registration failed:', e));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
