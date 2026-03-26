import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { clearScreen, formatChange } from '../utils/ui.js';
import { getConfig } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

export async function getStock(symbol) {
  // Yahoo Finance kaldırıldı
  return {
    symbol,
    price: 'Kaldırıldı',
    changePercent: '0.00',
    currency: '---'
  };
}

export async function getCurrencyAndMetals(forceRefresh = false) {
  const cacheKey = 'currency_metals';
  const cached = forceRefresh ? null : getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const baseUrl = process.env.LOCAL_FINANCE_URL;
  
  let usdTry, eurTry, sterlinTry, goldGramTRY, silverGramTRY;

  try {
    const resp = await http.get(baseUrl);
    const rawData = resp.data;
    const list = Array.isArray(rawData) ? rawData : (rawData && rawData.data ? rawData.data : []);

    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('API\'den veri alınamadı veya liste boş.');
    }

    const findPrice = (name) => {
      const item = list.find(i => i.isim && i.isim.toLowerCase().includes(name.toLowerCase()));
      return item ? parseFloat(item.fiyat.toString().replace(',', '.')) : null;
    };

    usdTry = findPrice('Dolar');
    eurTry = findPrice('Euro');
    sterlinTry = findPrice('Sterlin');
    goldGramTRY = findPrice('Gram Altın') || findPrice('Altın');
    silverGramTRY = findPrice('Gümüş');

  } catch (e) {
    throw new Error(`Yerel API Hatası: ${e.message}`);
  }

  const format = (val, decimals = 4) =>
  val !== null && val !== undefined && !Number.isNaN(val)
    ? val.toFixed(decimals)
    : 'N/A';

  const result = {
    usdTry: format(usdTry),
    eurTry: format(eurTry),
    sterlinTry: format(sterlinTry),
    gold: {
      gram: format(goldGramTRY, 2),
      ceyrek: goldGramTRY ? (goldGramTRY * 1.75).toFixed(2) : 'N/A',
      yarim: goldGramTRY ? (goldGramTRY * 3.5).toFixed(2) : 'N/A',
      tam: goldGramTRY ? (goldGramTRY * 7.0).toFixed(2) : 'N/A',
      cumhuriyet: goldGramTRY ? (goldGramTRY * 7.216).toFixed(2) : 'N/A',
    },
    silver: {
      gramTRY: format(silverGramTRY, 2)
    }
  };

  setCache(cacheKey, result, 0.25);
  return { ...result, fromCache: false };
}

export async function showStocks() {
  clearScreen();
  const config = getConfig();
  const symbols = config.stocks || ['THYAO.IS', 'AAPL', 'BTC-USD'];
  const table = new Table({
    head: ['Sembol', 'Fiyat', 'Değişim'].map(h => chalk.cyan(h))
  });

  let anyFromCache = false;
  for (const sym of symbols) {
    try {
      const s = await getStock(sym);
      if (s.fromCache) anyFromCache = true;
      table.push([s.symbol, `${s.price} ${s.currency}`, formatChange(s.changePercent)]);
    } catch (e) {
      table.push([sym, 'N/A', chalk.red('Veri yok')]);
    }
  }
  const cacheTag = anyFromCache ? chalk.gray(' (Önbellek)') : '';
  console.log(`\n  [BORSA]${cacheTag}\n` + table.toString());
}

export async function showCurrency(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Veriler alınıyor...' })).start();

  try {
    const m = await getCurrencyAndMetals();
    const cacheTag = m.fromCache ? chalk.gray(' (Önbellek)') : '';
    spinner.succeed(chalk.green(`  Döviz & Metaller${cacheTag}`));

    const table = new Table({
      head: ['Döviz/Metal', 'Fiyat (₺)'].map(h => chalk.cyan(h))
    });

    table.push(
      ['Dolar', m.usdTry],
      ['Euro', m.eurTry],
      ['Sterlin', m.sterlinTry],
      ['Altın Gram', m.gold.gram],
      ['Çeyrek Altın', m.gold.ceyrek],
      ['Yarım Altın', m.gold.yarim],
      ['Tam Altın', m.gold.tam],
      ['Cumhuriyet Altını', m.gold.cumhuriyet],
      ['Gümüş (gr)', m.silver.gramTRY]
    );

    console.log('\n' + table.toString());
  } catch (e) {
    spinner.fail(chalk.red('  Döviz/metal verileri alınamadı.'));
  }
}
