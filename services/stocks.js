import axios from 'axios';
import chalk from 'chalk';
import Table from 'cli-table3';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';

// Semboller (Yahoo Finance formatında)
const SYMBOLS = {
  BIST: ['THYAO.IS', 'ASELS.IS', 'TUPRS.IS'],
  GLOBAL: ['NVDA', 'AAPL', 'BTC-USD']
};

async function getStockDataFast(symbol) {
  try {
    const baseUrl = process.env.YAHOO_FINANCE_URL || 'https://query1.finance.yahoo.com/v8/finance/chart/';
    // URL sonunda / olmasını garanti altına alıp sembolü ekliyoruz
    const url = `${baseUrl.endsWith('/') ? baseUrl : baseUrl + '/'}${symbol}`;
    
    // Yahoo Finance'e doğrudan JSON isteği atıyoruz (Çok hızlıdır)
    const response = await axios.get(url, { timeout: 5000 });
    
    if (!response.data || !response.data.chart || !response.data.chart.result) {
        throw new Error('Geçersiz veri');
    }

    const res = response.data.chart.result[0];
    const meta = res.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose;
    
    // Para birimi sembolü ayarı
    let currencyIcon = meta.currency;
    if (meta.currency === 'TRY') currencyIcon = '₺';
    else if (meta.currency === 'USD') currencyIcon = '$';

    // Değişim hesaplama
    const changePercent = ((price - prevClose) / prevClose) * 100;
    const isUp = price >= prevClose;

    return {
      symbol: symbol.split('.')[0],
      price: `${price.toLocaleString('tr-TR')} ${currencyIcon}`,
      change: `${isUp ? '+' : ''}${changePercent.toFixed(2)}%`,
      isUp
    };
  } catch (error) {
    return { symbol: symbol.split('.')[0], price: 'N/A', change: '---', isUp: false };
  }
}

export async function showStocksV2() {
  clearScreen();
  const spinner = ora({
    text: chalk.yellow('  Borsa verileri çekiliyor...'),
    color: 'yellow'
  }).start();

  try {
    const results = {
      BIST: [],
      GLOBAL: []
    };

    // Paralel şekilde tüm verileri çekiyoruz (Çok daha hızlı)
    const [bistData, globalData] = await Promise.all([
      Promise.all(SYMBOLS.BIST.map(s => getStockDataFast(s))),
      Promise.all(SYMBOLS.GLOBAL.map(s => getStockDataFast(s)))
    ]);

    results.BIST = bistData;
    results.GLOBAL = globalData;

    spinner.stop();
    clearScreen();

    console.log(chalk.bold.bgBlue.white('\n  [ BORSA İSTANBUL (BIST) ]  \n'));
    const bistTable = new Table({
      head: [chalk.cyan('Hisse'), chalk.cyan('Fiyat'), chalk.cyan('Değişim (%)')],
      colWidths: [15, 20, 20]
    });

    results.BIST.forEach(r => {
      const color = r.isUp ? chalk.green : (r.change.includes('-') ? chalk.red : chalk.white);
      bistTable.push([chalk.bold(r.symbol), r.price, color(r.change)]);
    });
    console.log(bistTable.toString());

    console.log(chalk.bold.bgMagenta.white('\n  [ GLOBAL BORSALAR & KRİPTO ]  \n'));
    const globalTable = new Table({
      head: [chalk.cyan('Sembol'), chalk.cyan('Fiyat'), chalk.cyan('Değişim (%)')],
      colWidths: [15, 20, 20]
    });

    results.GLOBAL.forEach(r => {
      const color = r.isUp ? chalk.green : (r.change.includes('-') ? chalk.red : chalk.white);
      globalTable.push([chalk.bold(r.symbol), r.price, color(r.change)]);
    });
    console.log(globalTable.toString());

    
  } catch (err) {
    spinner.fail(chalk.red('  Bir hata oluştu: ' + err.message));
  }
}
