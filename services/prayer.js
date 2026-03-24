import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { clearScreen } from '../utils/ui.js';
import { getConfig } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

export async function getPrayerTimes() {
  const config = getConfig();
  const city = config.city || 'Nevşehir';
  const country = config.country || 'Turkey';
  const cacheKey = `prayer_${city}`;

  const cached = getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const url = `${process.env.ALADHAN_API_URL}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=13`;
  const { data } = await http.get(url, { retry: 3 });

  const result = {
    city,
    timings: data.data.timings
  };

  setCache(cacheKey, result, 1440);
  return { ...result, fromCache: false };
}

export async function showPrayer(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Vakitler alınıyor...' })).start();

  try {
    const p = await getPrayerTimes();
    const cacheTag = p.fromCache ? chalk.gray(' (Önbellek)') : '';
    spinner.succeed(chalk.green(`  Ezan Vakitleri (${p.city})${cacheTag}`));

    const t = p.timings;
    const table = new Table({
      head: ['İmsak', 'Güneş', 'Öğle', 'İkindi', 'Akşam', 'Yatsı'].map(h => chalk.cyan(h))
    });

    table.push([t.Fajr, t.Sunrise, t.Dhuhr, t.Asr, t.Maghrib, t.Isha]);

    console.log('\n' + table.toString());
  } catch (e) {
    spinner.fail(chalk.red('  Namaz vakitleri alınamadı.'));
  }
}
