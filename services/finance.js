import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import YahooFinance from 'yahoo-finance2';
import { clearScreen, formatChange } from '../utils/ui.js';
import { getConfig } from '../utils/config.js';
import { getCache, setCache } from '../utils/cache.js';
import { http } from '../utils/http.js';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export async function getStock(symbol) {
  const cacheKey = `stock_${symbol}`;
  const cached = getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const result = await yahooFinance.quote(symbol);

  const data = {
    symbol: result.symbol,
    price: result.regularMarketPrice?.toFixed(2) ?? 'N/A',
    changePercent: result.regularMarketChangePercent?.toFixed(2) ?? '0.00',
    currency: result.currency || 'USD'
  };

  setCache(cacheKey, data, 5);
  return { ...data, fromCache: false };
}

export async function getCurrencyAndMetals() {
  const cacheKey = 'currency_metals';
  const cached = getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  let usdTry = 33.0, eurTry = 35.0, sterlinTry = 42.0;

  try {
    const base = process.env.FRANKFURTER_BASE_URL;
    const resp = await http.get(`${base}?from=USD&to=TRY,EUR,GBP`, {
      retry: 3,
      retryDelay: 2000
    });

    usdTry = resp.data.rates.TRY;
    eurTry = usdTry / resp.data.rates.EUR;
    sterlinTry = usdTry / resp.data.rates.GBP;
  } catch (e) {}

  let goldOzUSD = 2700;
  let silverOzUSD = 31.0;

  try {
    const [gold, silver] = await Promise.all([
      yahooFinance.quote('GC=F'),
      yahooFinance.quote('SI=F')
    ]);

    if (gold?.regularMarketPrice) goldOzUSD = gold.regularMarketPrice;
    if (silver?.regularMarketPrice) silverOzUSD = silver.regularMarketPrice;
  } catch (e) {}

  const TROY = 31.1035;
  const gramTRY = (goldOzUSD / TROY) * usdTry;

  const result = {
    usdTry: usdTry.toFixed(4),
    eurTry: eurTry.toFixed(4),
    sterlinTry: sterlinTry.toFixed(4),
    gold: {
      gram: gramTRY.toFixed(2),
      ceyrek: (gramTRY * 1.75).toFixed(2),
      yarim: (gramTRY * 3.5).toFixed(2),
      tam: (gramTRY * 7.0).toFixed(2),
      cumhuriyet: (gramTRY * 7.216).toFixed(2),
    },
    silver: {
      gramTRY: ((silverOzUSD / TROY) * usdTry).toFixed(2)
    }
  };

  setCache(cacheKey, result, 5);
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
