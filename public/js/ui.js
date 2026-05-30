/**
 * ui.js — All DOM manipulation and render functions for SkyCast Pro
 */

const WIND_DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];

function getWeatherEmoji(condition, icon) {
  const isNight = icon && icon.endsWith('n');
  if (condition === 'Clear') return isNight ? '🌙' : '☀️';
  if (condition === 'Clouds') {
    if (icon.startsWith('02')) return '🌤️';
    if (icon.startsWith('03')) return '⛅';
    if (icon.startsWith('04')) return '☁️';
    return '⛅';
  }
  if (condition === 'Rain' || condition === 'Drizzle') return '🌧️';
  if (condition === 'Thunderstorm') return '⛈️';
  if (condition === 'Snow') return '❄️';
  const map = { Mist:'🌫️', Fog:'🌫️', Haze:'🌫️', Smoke:'🌫️', Dust:'🌫️', Sand:'🌫️', Ash:'🌫️', Squall:'🌬️', Tornado:'🌪️' };
  return map[condition] || '🌡️';
}

function getWindDir(deg) {
  if (deg == null) return '--';
  return WIND_DIRS[Math.round(deg / 22.5) % 16];
}

function formatTime(unix, offsetSec = 0) {
  const d = new Date((unix + offsetSec) * 1000);
  return d.toUTCString().slice(17, 22);
}

function formatDay(unix) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { weekday: 'short' });
}

function isToday(unix) {
  return new Date(unix * 1000).toDateString() === new Date().toDateString();
}

const UI = {
  showLoading() {
    document.getElementById('loading-state').classList.remove('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('weather-content').classList.add('hidden');
  },
  showError(msg) {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
    document.getElementById('weather-content').classList.add('hidden');
    document.getElementById('error-message').textContent = msg;
  },
  showContent() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.add('hidden');
    document.getElementById('weather-content').classList.remove('hidden');
  },

  renderCurrent(data, units) {
    const unit = units === 'metric' ? '°C' : '°F';
    const windUnit = units === 'metric' ? 'm/s' : 'mph';
    document.getElementById('current-city').textContent = data.city;
    document.getElementById('current-country').textContent = data.country;
    document.getElementById('current-temp').textContent = data.temperature;
    document.getElementById('temp-unit-label').textContent = unit;
    document.getElementById('current-desc').textContent = data.description;
    document.getElementById('current-feels').textContent = `${data.feelsLike}${unit}`;
    document.getElementById('current-high').textContent = `H: ${data.tempMax}${unit}`;
    document.getElementById('current-low').textContent  = `L: ${data.tempMin}${unit}`;
    document.getElementById('current-sunrise').textContent = formatTime(data.sunrise, data.timezone);
    document.getElementById('current-sunset').textContent  = formatTime(data.sunset,  data.timezone);
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    document.getElementById('current-icon').textContent = getWeatherEmoji(data.condition, data.icon);
    document.getElementById('stat-humidity-val').textContent = `${data.humidity}%`;
    document.getElementById('humidity-bar').style.width = `${data.humidity}%`;
    document.getElementById('stat-wind-val').textContent = `${data.windSpeed} ${windUnit}`;
    document.getElementById('stat-wind-dir').textContent = getWindDir(data.windDeg);
    document.getElementById('stat-pressure-val').textContent = data.pressure;
    document.getElementById('stat-visibility-val').textContent = data.visibility ?? '--';
    document.getElementById('stat-clouds-val').textContent = `${data.clouds}%`;
    document.getElementById('clouds-bar').style.width = `${data.clouds}%`;
    document.getElementById('stat-gust-val').textContent = data.windGust ? `${data.windGust}` : '--';
    document.getElementById('last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    this.setWeatherTheme(data.condition, data.icon);
  },

  renderHourly(hourly, units) {
    const unit = units === 'metric' ? '°C' : '°F';
    const container = document.getElementById('hourly-scroll');
    container.innerHTML = '';
    hourly.forEach(h => {
      const time = new Date(h.dt * 1000).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      const emoji = getWeatherEmoji(h.condition, h.icon);
      const div = document.createElement('div');
      div.className = 'hourly-item'; div.setAttribute('role','listitem');
      div.innerHTML = `<span class="hourly-time">${time}</span><span class="hourly-icon">${emoji}</span><span class="hourly-temp">${h.temp}${unit}</span>${h.pop > 0 ? `<span class="hourly-pop">💧${h.pop}%</span>` : ''}`;
      container.appendChild(div);
    });
  },

  renderDaily(daily, units) {
    const unit = units === 'metric' ? '°C' : '°F';
    const container = document.getElementById('daily-grid');
    container.innerHTML = '';
    daily.forEach(d => {
      const emoji = getWeatherEmoji(d.condition, d.icon);
      const today = isToday(d.dt);
      const div = document.createElement('div');
      div.className = `daily-card${today ? ' today' : ''}`; div.setAttribute('role','listitem');
      div.innerHTML = `<span class="daily-day">${today ? 'Today' : formatDay(d.dt)}</span><span class="daily-icon">${emoji}</span><span class="daily-high">${d.tempMax}${unit}</span><span class="daily-low">${d.tempMin}${unit}</span>${d.pop > 0 ? `<span class="daily-pop">💧${d.pop}%</span>` : ''}`;
      container.appendChild(div);
    });
  },

  renderDropdown(results, onSelect) {
    const dd = document.getElementById('search-dropdown');
    const input = document.getElementById('search-input');
    dd.innerHTML = '';
    if (!results.length) { dd.hidden = true; return; }
    results.forEach((city, i) => {
      const li = document.createElement('li');
      li.setAttribute('role','option'); li.setAttribute('id',`search-option-${i}`);
      li.innerHTML = `<span>${city.display}</span>`;
      li.addEventListener('click', () => {
        input.value = city.name; dd.hidden = true;
        input.setAttribute('aria-expanded','false'); onSelect(city);
      });
      dd.appendChild(li);
    });
    dd.hidden = false; input.setAttribute('aria-expanded','true');
  },

  hideDropdown() {
    document.getElementById('search-dropdown').hidden = true;
    document.getElementById('search-input').setAttribute('aria-expanded','false');
  },

  setWeatherTheme(condition, icon) {
    const body = document.getElementById('app-body');
    const animLayer = document.getElementById('weather-animation');
    animLayer.innerHTML = '';
    const themeMap = { Clear:'sunny', Clouds:'cloudy', Rain:'rainy', Drizzle:'rainy', Thunderstorm:'stormy', Snow:'snowy', Mist:'cloudy', Fog:'cloudy', Haze:'cloudy' };
    const isNight = icon && icon.endsWith('n');
    let theme = themeMap[condition] || 'cloudy';
    if (isNight) theme = 'night';
    body.className = `weather-${theme}`;
    if (theme === 'rainy') {
      for (let i = 0; i < 40; i++) {
        const drop = document.createElement('div'); drop.className = 'raindrop';
        const h = 10 + Math.random() * 20;
        drop.style.cssText = `left:${Math.random()*100}%;height:${h}px;animation-duration:${.6+Math.random()*.6}s;animation-delay:${Math.random()*2}s;opacity:${.3+Math.random()*.4};`;
        animLayer.appendChild(drop);
      }
    } else if (theme === 'snowy') {
      const flakes = ['❄','❅','❆'];
      for (let i = 0; i < 25; i++) {
        const sf = document.createElement('div'); sf.className = 'snowflake';
        sf.textContent = flakes[Math.floor(Math.random()*flakes.length)];
        sf.style.cssText = `left:${Math.random()*100}%;font-size:${8+Math.random()*10}px;animation-duration:${4+Math.random()*5}s;animation-delay:${Math.random()*5}s;opacity:${.4+Math.random()*.4};`;
        animLayer.appendChild(sf);
      }
    } else if (theme === 'stormy') {
      const bolt = document.createElement('div'); bolt.className = 'lightning';
      animLayer.appendChild(bolt);
    }
  },

  startClock() {
    const el = document.getElementById('header-time');
    const tick = () => { el.textContent = new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' }); };
    tick(); setInterval(tick, 1000);
  }
};

window.UI = UI;
