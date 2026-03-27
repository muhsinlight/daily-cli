import chalk from 'chalk';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';
import { getConfig, getCities } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

function normalizeCity(city) {
  return city
    .toLowerCase()
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i');
}

function findTurkishCity(input) {
  if (!input || input.trim().length < 2) return null;
  
  const TURKISH_CITIES = getCities();
  const normalized = normalizeCity(input);
  
  const exactMatch = TURKISH_CITIES.find(city => normalizeCity(city) === normalized);
  if (exactMatch) return { city: exactMatch, type: 'exact' };
  
  if (normalized.length >= 3) {
    const startsWith = TURKISH_CITIES.filter(city => normalizeCity(city).startsWith(normalized));
    
    if (startsWith.length === 1) {
      return { city: startsWith[0], type: 'prefix' };
    }
    
    if (startsWith.length > 1) {
      const exactInList = startsWith.find(city => normalizeCity(city) === normalized);
      if (exactInList) return { city: exactInList, type: 'exact' };
      
      startsWith.sort((a, b) => a.length - b.length);
      return { city: startsWith[0], type: 'prefix' };
    }
  }
  
  return null;
}

function formatCityName(city) {
  return city
    .split(' ')
    .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
    .join(' ');
}

export async function getWeather() {
  const config = getConfig();
  const inputCity = config.city || 'Nevşehir';
  
  const cityMatch = findTurkishCity(inputCity);
  
  if (!cityMatch) {
    const error = new Error('INVALID_TURKISH_CITY');
    error.input = inputCity;
    throw error;
  }
  
  const turkishCity = cityMatch.city;
  const cacheKey = `weather_forecast_${turkishCity}`;
  
  const cached = getCache(cacheKey, { freshInSession: true });
  if (cached) {
    cached.wasCorrection = cityMatch.type !== 'exact';
    cached.originalInput = inputCity;
    return cached;
  }

  const base = process.env.WTTR_BASE_URL;
  const searchQuery = `${turkishCity},Turkey`;
  
  const { data } = await http.get(
    `${base}/${encodeURIComponent(searchQuery)}?format=j1&lang=tr`, 
    { retry: 3 }
  );

  if (typeof data === 'string' && (data.includes('Unknown location') || data.includes('bulunamadı'))) {
    throw new Error('API_ERROR');
  }

  const cur = data.current_condition?.[0];
  const area = data.nearest_area?.[0];
  const weather = data.weather;

  if (!cur || !area || !weather) {
    throw new Error('API_ERROR');
  }

  const result = {
    city: formatCityName(turkishCity),
    wasCorrection: cityMatch.type !== 'exact',
    originalInput: inputCity,
    current: {
      temp: cur.temp_C,
      feels: cur.FeelsLikeC,
      desc: cur.lang_tr?.[0]?.value || cur.weatherDesc?.[0]?.value || 'Unknown'
    },
    forecast: weather.map(day => ({
      date: day.date,
      max: day.maxtempC,
      min: day.mintempC,
      desc: day.hourly?.[4]?.lang_tr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || 'Unknown'
    }))
  };

  setCache(cacheKey, result, 60);
  return result;
}

export async function showWeather(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Loading...' })).start();

  try {
    const w = await getWeather();
    
    spinner.succeed(chalk.green('  Weather Forecast (3 Days)'));
    
    let locationDisplay = chalk.bold(w.city);
    if (w.wasCorrection && normalizeCity(w.originalInput) !== normalizeCity(w.city)) {
      locationDisplay += chalk.gray(` (Searched: "${w.originalInput}")`);
    }

    console.log(`\n    Location: ${locationDisplay}`);
    console.log(`    Current: ${chalk.yellow(w.current.temp + '°C')} - ${w.current.desc} (Feels like: ${w.current.feels}°C)`);
    console.log(chalk.gray('    ' + '-'.repeat(50)));

    w.forecast.forEach((day, index) => {
      const dateLabel = index === 0 ? 'Today' : (index === 1 ? 'Tomorrow' : day.date);
      const tempLabel = `${chalk.red(day.max + '°C')} / ${chalk.blue(day.min + '°C')}`;
      console.log(`    ${chalk.cyan(dateLabel.padEnd(10))}: ${tempLabel.padEnd(25)} ${day.desc}`);
    });

  } catch (e) {
    if (e.message === 'INVALID_TURKISH_CITY') {
      spinner.fail(chalk.red(`  Invalid Turkish city: "${e.input}"`));
      console.log(chalk.gray('\n    Please enter one of the 81 Turkish cities:'));
      console.log(chalk.gray('    Istanbul, Ankara, Izmir, Nevsehir, etc.\n'));
      console.log(chalk.yellow('    Tip: Type at least 3 letters (e.g., "ist" → Istanbul)'));
    } else if (e.message === 'API_ERROR') {
      spinner.fail(chalk.red('  Could not fetch weather data.'));
    } else {
      spinner.fail(chalk.red('  An unexpected error occurred.'));
    }
  }
}