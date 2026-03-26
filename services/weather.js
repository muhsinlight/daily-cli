import chalk from 'chalk';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';
import { getConfig } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

export async function getWeather() {
  const config = getConfig();
  const city = config.city || 'Nevşehir';
  const cacheKey = `weather_forecast_${city}`;
  
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const base = process.env.WTTR_BASE_URL;
  const { data } = await http.get(`${base}/${encodeURIComponent(city)}?format=j1&lang=tr`, { 
    retry: 3 
  });

  const cur = data.current_condition?.[0];
  const area = data.nearest_area?.[0];
  const weather = data.weather;

  if (!cur || !area || !weather) {
    throw new Error('Hava durumu verisi alınamadı');
  }

  const result = {
    city: area.areaName?.[0]?.value || city,
    current: {
      temp: cur.temp_C,
      feels: cur.FeelsLikeC,
      desc: cur.lang_tr?.[0]?.value || cur.weatherDesc?.[0]?.value || 'Bilinmiyor'
    },
    forecast: weather.map(day => ({
      date: day.date,
      max: day.maxtempC,
      min: day.mintempC,
      desc: day.hourly?.[4]?.lang_tr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || 'Bilinmiyor'
    }))
  };

  setCache(cacheKey, result, 60); // 1 saatlik cache
  return result;
}

export async function showWeather(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Yükleniyor...' })).start();

  try {
    const config = getConfig();
    const w = await getWeather();
    
    spinner.succeed(chalk.green('  Hava Durumu Tahmini (3 Günlük)'));
    
    const locationDisplay = w.city.toLowerCase() === config.city.toLowerCase() 
      ? chalk.bold(w.city) 
      : `${chalk.bold(config.city)} (${w.city})`;

    console.log(`\n    Konum: ${locationDisplay}`);
    console.log(`    Şu An: ${chalk.yellow(w.current.temp + '°C')} - ${w.current.desc} (Hissedilen: ${w.current.feels}°C)`);
    console.log(chalk.gray('    ' + '-'.repeat(50)));

    w.forecast.forEach((day, index) => {
      const dateLabel = index === 0 ? 'Bugün' : (index === 1 ? 'Yarın' : day.date);
      const tempLabel = `${chalk.red(day.max + '°C')} / ${chalk.blue(day.min + '°C')}`;
      console.log(`    ${chalk.cyan(dateLabel.padEnd(10))}: ${tempLabel.padEnd(25)} ${day.desc}`);
    });

  } catch (e) {
    spinner.fail(chalk.red('  Hava durumu alınamadı.'));
  }
}


