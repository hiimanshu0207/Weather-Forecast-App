# SkyCast Pro — Full-Stack Weather Forecast App

A premium, production-grade full-stack weather forecast application built with **Node.js + Express** backend and **Vanilla JS/HTML/CSS** frontend.

## 🌟 Features

- 🔍 **City Search** — Debounced autocomplete with OpenWeatherMap Geocoding API
- 📍 **Geolocation** — Auto-detect your location on load
- 🌡️ **Current Weather** — Temperature, feels like, high/low, humidity, wind, pressure, visibility
- ⏰ **Hourly Forecast** — Scrollable 24-hour strip with rain probability
- 📅 **7-Day Forecast** — Daily high/low cards with weather icons
- 📈 **Temperature Chart** — Animated Chart.js line chart (temp + feels like)
- 🌦️ **Weather Animations** — Raindrops, snowflakes, lightning based on live conditions
- 🎨 **Reactive Themes** — Background changes with weather (sunny/rainy/stormy/night)
- °C / °F **Unit Toggle** — Persisted in localStorage
- 📱 **PWA** — Installable app with offline Service Worker
- 📐 **Fully Responsive** — Mobile-first design

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 + CSS3 (Glassmorphism) + Vanilla JS |
| Backend | Node.js + Express.js |
| Cache | node-cache (10-min server-side caching) |
| Security | Helmet, CORS, express-rate-limit |
| Charts | Chart.js |
| API | OpenWeatherMap (free tier) |
| Fonts | Google Fonts (Inter + Orbitron) |

## 🚀 Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/hiimanshu0207/Weather-Forecast-App.git
cd Weather-Forecast-App
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add your API key
Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```
Edit `.env` and set:
```
OPENWEATHER_API_KEY=your_key_here
```
Get a **free** API key at [openweathermap.org/api](https://openweathermap.org/api)

### 4. Start the server
```bash
npm start
```

Open **http://localhost:3000** in your browser.

## 📁 Project Structure

```
WeatherForecast/
├── server/
│   ├── server.js              ← Express server
│   └── routes/weather.js      ← API routes with caching
├── public/
│   ├── index.html             ← Main page (PWA)
│   ├── css/style.css          ← Glassmorphism dark theme
│   ├── js/
│   │   ├── api.js             ← Backend fetch calls
│   │   ├── charts.js          ← Chart.js wrapper
│   │   ├── ui.js              ← DOM rendering & animations
│   │   └── app.js             ← App controller
│   ├── icons/favicon.svg
│   ├── manifest.json          ← PWA manifest
│   └── sw.js                  ← Service Worker
├── .env.example               ← Environment template
└── package.json
```

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/weather?city=London` | Current weather |
| `GET /api/weather?lat=51.5&lon=-0.1` | Weather by coordinates |
| `GET /api/forecast?city=Mumbai` | 7-day + hourly forecast |
| `GET /api/search?q=Lon` | City autocomplete |
| `GET /api/health` | Server health check |

## 📄 License

MIT
