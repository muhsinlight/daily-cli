import chalk from 'chalk';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';
import { getConfig } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

export async function getWeather() {
  const config = getConfig();
  const city = config.city || 'Nevşehir';
  const cacheKey = `weather_${city}`;
  
  const cached = getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const base = process.env.WTTR_BASE_URL;
  const { data } = await http.get(`${base}/${encodeURIComponent(city)}?format=j1&lang=tr`, { 
    retry: 3 
  });

  const cur = data.current_condition?.[0];
  const area = data.nearest_area?.[0];

  if (!cur || !area) {
    throw new Error('Hava durumu verisi alınamadı');
  }

  const desc = cur.lang_tr?.[0]?.value || cur.weatherDesc?.[0]?.value || 'Bilinmiyor';

  const result = {
    city: area.areaName?.[0]?.value || city,
    temp: cur.temp_C,
    feels: cur.FeelsLikeC,
    desc
  };

  setCache(cacheKey, result, 5);
  return { ...result, fromCache: false };
}

export async function showWeather(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Yükleniyor...' })).start();

  try {
    const config = getConfig();
    const w = await getWeather();
    
    spinner.succeed(chalk.green('  Hava Durumu'));
    
    const locationDisplay = w.city.toLowerCase() === config.city.toLowerCase() 
      ? chalk.bold(w.city) 
      : `${chalk.bold(config.city)} (${w.city})`;

    const cacheTag = w.fromCache ? chalk.gray(' (Önbellek)') : '';

    console.log(`\n    [HAVA] ${locationDisplay}: ${chalk.yellow(w.temp + '°C')}${cacheTag} ve ${w.desc}`);
    console.log(`    Hissedilen: ${w.feels}°C`);
  } catch (e) {
    spinner.fail(chalk.red('  Hava durumu alınamadı.'));
  }
}
