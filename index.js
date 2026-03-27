#!/usr/bin/env node
import 'dotenv/config';
import dotenv from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

import { showBanner, waitForKey, getMenuKey, clearScreen } from './utils/ui.js';

import { showWeather } from './services/weather.js';
import { showCurrency } from './services/finance.js';
import { showStocksV2 as showStocks } from './services/stocks.js';
import { showPrayer } from './services/prayer.js';
import { showNews } from './services/news.js';
import { showAdvice } from './services/advice.js';
import { showTranslation } from './services/translation.js';
import { showSettings } from './services/settings.js';
import { showSports } from './services/sports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const program = new Command();

program
  .name('daily')
  .description('Kişisel Terminal Dashboard')
  .version('1.0.0');

// Komut Tanımlamaları
program
  .command('weather')
  .alias('w')
  .description('Hava durumunu gösterir')
  .action(async () => {
    await showWeather();
    process.exit(0);
  });

program
  .command('stocks')
  .alias('s')
  .description('Borsa verilerini gösterir')
  .action(async () => {
    await showStocks();
    process.exit(0);
  });

program
  .command('currency')
  .alias('c')
  .description('Döviz kurlarını gösterir')
  .action(async () => {
    await showCurrency();
    process.exit(0);
  });

program
  .command('news')
  .alias('n')
  .description('Günün haberlerini gösterir')
  .action(async () => {
    await showNews();
    process.exit(0);
  });

program
  .command('prayer')
  .alias('p')
  .description('Namaz vakitlerini gösterir')
  .action(async () => {
    await showPrayer();
    process.exit(0);
  });

program
  .command('advice')
  .alias('a')
  .description('Günün tavsiyesini gösterir')
  .action(async () => {
    await showAdvice();
    process.exit(0);
  });

program
  .command('translation')
  .alias('t')
  .description('Çeviri aracını açar')
  .action(async () => {
    await showTranslation();
    process.exit(0);
  });

program
  .command('sports')
  .alias('sp')
  .description('Spor müsabakalarını gösterir')
  .action(async () => {
    await showSports();
    process.exit(0);
  });

program
  .command('settings')
  .description('Ayarları açar')
  .action(async () => {
    await showSettings();
    process.exit(0);
  });

const MENU_ACTIONS = {
  '1': showWeather,
  '2': showStocks,
  '3': showCurrency,
  '4': showNews,
  '5': showPrayer,
  '6': showAdvice,
  '7': showTranslation,
  '8': showSettings,
  '9': showSports,
};

async function interactiveMenu() {
  while (true) {
    showBanner();
    const key = await getMenuKey();

    if (key === '0') {
      clearScreen();
      process.exit(0);
    }

    try {
      const action = MENU_ACTIONS[key];
      if (action) {
        await action();
        await waitForKey();
      } else {
        if (!key || key === '\r' || key === '\n' || key === 'return') {
           continue;
        }
        console.log(chalk.red('\n  Please use only menu numbers (0-9)!'));
        await new Promise(r => setTimeout(r, 1200)); 
      }
    } catch (err) {
      console.error(chalk.red('\n  An error occurred:'), err?.message || err);
      await waitForKey();
    }
  }
}

// Argüman kontrolü
if (process.argv.length > 2) {
  program.parse(process.argv);
} else {
  interactiveMenu().catch((err) => {
    console.error(chalk.red('\n  Unexpected error:'), err?.message || err);
    process.exit(1);
  });
}