/* Weather icon map */
const ICONS = {
  clear:    '☀️',
  sunny:    '☀️',
  rain:     '🌧️',
  drizzle:  '🌦️',
  shower:   '🌧️',
  storm:    '⛈️',
  thunder:  '⛈️',
  cloud:    '☁️',
  overcast: '☁️',
  mist:     '🌫️',
  fog:      '🌫️',
  snow:     '❄️',
  sleet:    '🌨️',
  wind:     '💨',
  hail:     '🌨️',
  partly:   '⛅'
};

function weatherIcon(condition) {
  if (!condition) return '🌡️';
  const c = condition.toLowerCase();
  for (const [keyword, emoji] of Object.entries(ICONS)) {
    if (c.includes(keyword)) return emoji;
  }
  return '🌡️';
}

function formatDay(dateStr) {
  return new Date(dateStr).toLocaleDateString('en', { weekday: 'short' });
}

function showError(message) {
  const box = document.getElementById('errorBox');
  box.style.display = 'block';
  box.innerHTML = `<div class="error-msg">${message}</div>`;
}

function clearError() {
  const box = document.getElementById('errorBox');
  box.style.display = 'none';
  box.innerHTML = '';
}

/* reverseGeocode (from OpenStreetMap Nominatim) — resolves lat/lon to an identifiable place name */
async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse` +
      `?lat=${latitude}&lon=${longitude}&format=json`;
    const res  = await fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'WeatherAI-App' }
    });
    const geo  = await res.json();
    const addr = geo.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || '';
    const state = addr.state || '';
    const country = addr.country || addr.country_code?.toUpperCase() || '';
    return [city, state, country].filter(Boolean).join(', ');
  } catch {
    return '';
  }
}

/* calls the local proxy and renders results */
async function fetchWeather(lat, lon) {
  clearError();

  const key = document.getElementById('apiKey').value.trim();
  if (!key) {
    showError('Please enter your WeatherAI API key (wai_...) above.');
    return;
  }

  const latitude  = lat || document.getElementById('latInput').value.trim();
  const longitude = lon || document.getElementById('lonInput').value.trim();
  if (!latitude || !longitude) {
    showError('Please enter valid latitude and longitude coordinates.');
    return;
  }

  const units = document.getElementById('unitsSelect').value;

  document.getElementById('content').innerHTML =
    '<div class="status">Fetching weather data…</div>';

  /* Make calls to localhost:4001/api/weather or to the Render backend */
  try {
    const weatherURL =
      `/api/weather` +
      `?lat=${encodeURIComponent(latitude)}` +
      `&lon=${encodeURIComponent(longitude)}` +
      `&days=7&ai=true&units=${units}`;

    // Fire weather + reverse geocode requests in parallel
    const [response, resolvedLocation] = await Promise.all([
      fetch(weatherURL, { headers: { 'x-api-key': key } }),
      reverseGeocode(latitude, longitude)
    ]);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${response.status}`);
    }

    renderWeather(data, units, resolvedLocation);

  } catch (error) {
    document.getElementById('content').innerHTML = '';
    showError(`Request failed: ${error.message}`);
  }
}

/* Parses WeatherAI API response and builds the UI */
function renderWeather(data, units, resolvedLocation = '') {
  const sym = units === 'imperial' ? '°F' : '°C';
  const windUnit = units === 'imperial' ? 'mph' : 'km/h';

  // Log the full WeatherAI API response to the console
  console.log('[WeatherAI] Full response:', JSON.stringify(data, null, 2));

  const cur = data.current || data.current_weather || {};

  // Find the hourly entry whose time matches cur.time, or the closest one to now.
  const topHourly = data.hourly || [];
  const nestedHourly = (data.forecast || data.daily || [])
    .flatMap(day => day.hour || day.hourly || []);
  const allHourly = topHourly.length ? topHourly : nestedHourly;

  const curTimeStr = cur.time ?? '';
  let curHourly = allHourly.find(h => (h.time ?? '') === curTimeStr);
  if (!curHourly && allHourly.length) {
    // Fall back: pick the entry with the closest time to right now
    const now = Date.now();
    curHourly = allHourly.reduce((closest, h) => {
      const diff = Math.abs(new Date(h.time) - now);
      return diff < Math.abs(new Date(closest.time) - now) ? h : closest;
    });
  }
  const hourly = curHourly || {};

  // Temperature
  const temp = cur.temperature ?? cur.temp ?? cur.temp_c ?? '—';

  // Feels like
  const feels = hourly.feels_like ?? hourly.feelslike ?? '';

  // Condition
  const condCode = cur.condition_code ?? hourly.condition_code ?? '';
  const cond = cur.condition?.text  || hourly.condition?.text
  || cur.description || hourly.description
  || cur.weather     || hourly.weather
  || (condCode ? `${condCode}` : '');

  // Humidity
  const humid = hourly.humidity ?? '—';

  // Wind Speed
  const wind = cur.wind_speed  ?? hourly.wind_speed  ?? '—';

  // Wind Gust
  const windGust = hourly.wind_gust ?? '—';

  // Wind Direction
    const windDirection  = cur.wind_direction ?? '—';

  // UV Index
  const uv = hourly.uv_index ?? '—';

  // Visibility
  const vis = hourly.visibility ?? hourly.vis_km ?? hourly.vis ?? '—';

  // Location — use Nominatim result first, fall back to API data.location
  const loc = data.location || {};
  const apiLoc = (typeof loc === 'object')
    ? [loc.name, loc.region, loc.country].filter(Boolean).join(', ')
    : (loc || data.city || data.name || '');
  const lat = loc.lat  ?? data.lat  ?? data.latitude  ?? '';
  const lon = loc.lon  ?? data.lon  ?? data.longitude ?? '';
  const locLabel = resolvedLocation || apiLoc || (lat && lon
    ? `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}`
    : '');

  // Timezone — API returns e.g. "Africa/Lagos"
  const rawTZ = loc.tz_id ?? loc.timezone ?? data.timezone ?? data.tz_id ?? data.tz ?? '';
  const timezone = (rawTZ && typeof rawTZ === 'object')
    ? (rawTZ.id ?? rawTZ.name ?? rawTZ.tz ?? Object.values(rawTZ)[0])
    : rawTZ;

  // Local time — use Intl.DateTimeFormat with the location's IANA timezone
  let localTime = '';
  if (timezone) {
    try {
      localTime = new Intl.DateTimeFormat('en', {
        timeZone: timezone,
        hour:     '2-digit',
        minute:   '2-digit',
        hour12:   true
      }).format(new Date());
    } catch {
      const rawLocaltime = loc.localtime ?? loc.local_time ?? cur.localtime
      ?? cur.local_time ?? cur.last_updated ?? data.localtime ?? '';
      if (rawLocaltime) {
        localTime = rawLocaltime.includes('T') || rawLocaltime.includes(' ')
          ? rawLocaltime.split(/T| /)[1]?.slice(0, 5) || ''
          : rawLocaltime;
      }
    }
  }

  // 7-day forecast
  const forecastDays = (data.forecast || data.daily || []).slice(0, 7);
  let forecastHTML = '';
  if (forecastDays.length) {
    const dayCards = forecastDays.map(day => {
      const label = formatDay(day.date || day.dt_txt || day.datetime || '');
      const maxTemp = day.day?.maxtemp_c ?? day.temp_max  ?? day.max_temp ?? day.high ?? '—';
      const minTemp = day.day?.mintemp_c ?? day.temp_min  ?? day.min_temp ?? day.low  ?? '—';
      const rain  = day.day?.daily_chance_of_rain ?? day.precipitation_probability ?? day.pop ?? '';
      const dayCond = day.day?.condition?.text || day.condition || day.description || cond;
      return `
        <div class="forecast-day">
          <div class="f-day">${label}</div>
          <div class="f-icon">${weatherIcon(dayCond)}</div>
          <div class="f-max">${maxTemp}${sym}</div>
          <div class="f-min">${minTemp}${sym}</div>
          ${rain !== '' ? `<div class="f-rain">💧 ${rain}%</div>` : ''}
        </div>`;
    }).join('');

    forecastHTML = `
      <div class="card">
        <div class="forecast-section">
          <h3>7-day forecast</h3>
          <div class="forecast-row">${dayCards}</div>
        </div>
      </div>`;
  }

  // Pin SVG icon
  const pinSVG = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" style="flex-shrink:0">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>`;

  // Inject weather parameters into the HTML page
  document.getElementById('content').innerHTML = `
    <div class="card">
    <div class="card-title">Current Hourly Weather Condition</div>

      <div class="main-card">
        <div class="temp-block">
          <div class="temp-big"><span class="temp-icon">${weatherIcon(cond)}</span>${temp}<span class="temp-unit">${sym}</span></div>

          ${locLabel ? `<div class="location-name">${pinSVG} ${locLabel}</div>` : ''}
          ${feels ? `<div class="feels-like">Feels like ${feels}${sym}</div>` : ''}
          ${(timezone || localTime) ? `
          <div class="tz-row">
            ${timezone ? `
            <div class="tz-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2z"/>
                <path d="M2 12h20"/>
              </svg>
              <strong>${timezone}</strong>
            </div>` : ''}
            ${localTime ? `
            <div class="tz-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Local time <strong>${localTime}</strong>
            </div>` : ''}
          </div>` : ''}
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <span class="meta-label">Humidity</span>
            <span class="meta-val">${humid}%</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">Wind direction</span>
            <span class="meta-val">${windDirection}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">Wind Speed</span>
            <span class="meta-val">${wind} ${windUnit}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">Condition code</span>
            <span class="meta-val">${cond}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">Wind Gust</span>
            <span class="meta-val">${windGust} ${windUnit}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">UV Index</span>
            <span class="meta-val">${uv}</span>
          </div>

        </div>
      </div>
    </div>
    
    ${forecastHTML}`;
}

/* Geolocation API fetches and auto-fill the coordinates*/
function useMyLocation() {
  clearError();
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  document.getElementById('content').innerHTML =
    '<div class="status">Detecting your location…</div>';
  navigator.geolocation.getCurrentPosition(
    position => {
      const lat = position.coords.latitude.toFixed(4);
      const lon = position.coords.longitude.toFixed(4);
      document.getElementById('latInput').value = lat;
      document.getElementById('lonInput').value = lon;
      fetchWeather(lat, lon);
    },
    () => {
      document.getElementById('content').innerHTML = '';
      showError('Location access denied. Please enter coordinates manually.');
    }
  );
}