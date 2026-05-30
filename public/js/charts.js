/**
 * charts.js — Chart.js temperature chart for SkyCast Pro
 */

let tempChartInstance = null;

const Charts = {
  renderTempChart(hourlyData, units) {
    const ctx = document.getElementById('temp-chart');
    if (!ctx) return;

    const labels = hourlyData.map(h => {
      const d = new Date(h.dt * 1000);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    });
    const temps = hourlyData.map(h => h.temp);
    const feels = hourlyData.map(h => h.feelsLike);
    const unit  = units === 'metric' ? '°C' : '°F';

    if (tempChartInstance) { tempChartInstance.destroy(); tempChartInstance = null; }

    tempChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Temperature (${unit})`,
            data: temps,
            borderColor: 'rgba(91,156,246,0.9)',
            backgroundColor: 'rgba(91,156,246,0.08)',
            pointBackgroundColor: 'rgba(91,156,246,1)',
            pointBorderColor: '#fff',
            pointRadius: 5, pointHoverRadius: 7,
            borderWidth: 2.5, fill: true, tension: 0.4
          },
          {
            label: `Feels Like (${unit})`,
            data: feels,
            borderColor: 'rgba(167,139,250,0.7)',
            backgroundColor: 'transparent',
            pointBackgroundColor: 'rgba(167,139,250,1)',
            pointBorderColor: '#fff',
            pointRadius: 3, pointHoverRadius: 6,
            borderWidth: 1.5, borderDash: [5,4], fill: false, tension: 0.4
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: 'rgba(232,240,254,0.7)', font: { family: 'Inter', size: 11 }, usePointStyle: true, pointStyleWidth: 8 } },
          tooltip: { backgroundColor: 'rgba(15,23,36,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, titleColor: '#e8f0fe', bodyColor: 'rgba(232,240,254,0.8)', cornerRadius: 10, padding: 12 }
        },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(232,240,254,0.5)', font: { size: 10 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(232,240,254,0.5)', font: { size: 10 }, callback: v => `${v}${unit}` } }
        }
      }
    });
  }
};

window.Charts = Charts;
