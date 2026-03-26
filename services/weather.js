import chalk from 'chalk';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';
import { getConfig, getCities } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

// Şehir adı normalizasyonu (Türkçe karakterleri İngilizce'ye çevir)
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

// SADECE TAM EŞLEŞME veya BAŞLANGIÇ EŞLEŞMESINE İZİN VER
function findTurkishCity(input) {
  if (!input || input.trim().length < 2) return null;
  
  const TURKISH_CITIES = getCities();
  const normalized = normalizeCity(input);
  
  // 1. TAM EŞLEŞME (en güvenli)
  const exactMatch = TURKISH_CITIES.find(city => normalizeCity(city) === normalized);
  if (exactMatch) return { city: exactMatch, type: 'exact' };
  
  // 2. BAŞLANGIÇ EŞLEŞMESI (en az 3 karakter yazılmış olmalı)
  if (normalized.length >= 3) {
    const startsWith = TURKISH_CITIES.filter(city => normalizeCity(city).startsWith(normalized));
    
    // Eğer birden fazla eşleşme varsa, en kısa olanı al (daha spesifik)
    if (startsWith.length === 1) {
      return { city: startsWith[0], type: 'prefix' };
    }
    
    // Birden fazla eşleşme varsa, tam kelime eşleşmesini tercih et
    if (startsWith.length > 1) {
      const exactInList = startsWith.find(city => normalizeCity(city) === normalized);
      if (exactInList) return { city: exactInList, type: 'exact' };
      
      // Yoksa en kısa olanı al
      startsWith.sort((a, b) => a.length - b.length);
      return { city: startsWith[0], type: 'prefix' };
    }
  }
  
  // FUZZY MATCHING KALDIRILDI - "armut" gibi kelimeler artık reddedilecek
  return null;
}

// Şehir adını düzgün formata çevir (her kelimenin ilk harfi büyük)
function formatCityName(city) {
  return city
    .split(' ')
    .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
    .join(' ');
}

export async function getWeather() {
  const config = getConfig();
  const inputCity = config.city || 'Nevşehir';
  
  // Türk şehri kontrolü
  const cityMatch = findTurkishCity(inputCity);
  
  if (!cityMatch) {
    const error = new Error('INVALID_TURKISH_CITY');
    error.input = inputCity;
    throw error;
  }
  
  const turkishCity = cityMatch.city;
  const cacheKey = `weather_forecast_${turkishCity}`;
  
  const cached = getCache(cacheKey);
  if (cached) {
    cached.wasCorrection = cityMatch.type !== 'exact';
    cached.originalInput = inputCity;
    return cached;
  }

  // wttr.in'e "şehir,Turkey" formatında gönder
  const base = process.env.WTTR_BASE_URL;
  const searchQuery = `${turkishCity},Turkey`;
  
  const { data } = await http.get(
    `${base}/${encodeURIComponent(searchQuery)}?format=j1&lang=tr`, 
    { retry: 3 }
  );

  // Hata kontrolü
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
      desc: cur.lang_tr?.[0]?.value || cur.weatherDesc?.[0]?.value || 'Bilinmiyor'
    },
    forecast: weather.map(day => ({
      date: day.date,
      max: day.maxtempC,
      min: day.mintempC,
      desc: day.hourly?.[4]?.lang_tr?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || 'Bilinmiyor'
    }))
  };

  setCache(cacheKey, result, 60);
  return result;
}

export async function showWeather(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Yükleniyor...' })).start();

  try {
    const w = await getWeather();
    
    spinner.succeed(chalk.green('  Hava Durumu Tahmini (3 Günlük)'));
    
    // Konum gösterimi
    let locationDisplay = chalk.bold(w.city);
    if (w.wasCorrection && normalizeCity(w.originalInput) !== normalizeCity(w.city)) {
      locationDisplay += chalk.gray(` (Aradığınız: "${w.originalInput}")`);
    }

    console.log(`\n    Konum: ${locationDisplay}`);
    console.log(`    Şu An: ${chalk.yellow(w.current.temp + '°C')} - ${w.current.desc} (Hissedilen: ${w.current.feels}°C)`);
    console.log(chalk.gray('    ' + '-'.repeat(50)));

    w.forecast.forEach((day, index) => {
      const dateLabel = index === 0 ? 'Bugün' : (index === 1 ? 'Yarın' : day.date);
      const tempLabel = `${chalk.red(day.max + '°C')} / ${chalk.blue(day.min + '°C')}`;
      console.log(`    ${chalk.cyan(dateLabel.padEnd(10))}: ${tempLabel.padEnd(25)} ${day.desc}`);
    });

  } catch (e) {
    if (e.message === 'INVALID_TURKISH_CITY') {
      spinner.fail(chalk.red(`  Geçersiz Türkiye şehri: "${e.input}"`));
      console.log(chalk.gray('\n    Lütfen Türkiye\'nin 81 ilinden birini girin:'));
      console.log(chalk.gray('    İstanbul, Ankara, İzmir, Nevşehir, vb.\n'));
      console.log(chalk.yellow('    İpucu: En az 3 harf yazın (örn: "ist" → İstanbul)'));
    } else if (e.message === 'API_ERROR') {
      spinner.fail(chalk.red('  Hava durumu verisi alınamadı.'));
    } else {
      spinner.fail(chalk.red('  Beklenmeyen bir hata oluştu.'));
    }
  }
}