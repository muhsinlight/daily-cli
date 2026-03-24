#!/usr/bin/env node
import 'dotenv/config';
import dotenv from 'dotenv';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

import { showBanner, waitForKey, getMenuKey, clearScreen } from './utils/ui.js';

import { showWeather } from './services/weather.js';
import { showStocks, showCurrency } from './services/finance.js';
import { showPrayer } from './services/prayer.js';
import { showNews } from './services/news.js';
import { showAdvice } from './services/advice.js';
import { showTranslation } from './services/translation.js';
import { showSettings } from './services/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MENU_ACTIONS = {
  '1': showWeather,
  '2': showStocks,
  '3': showCurrency,
  '4': showNews,
  '5': showPrayer,
  '6': showAdvice,
  '7': showTranslation,
  '8': showSettings,
};

async function main() {
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
        console.log(chalk.red('\n  Lütfen sadece menü rakamlarını (0-8) kullanınız!'));
        await new Promise(r => setTimeout(r, 1200)); 
      }
    } catch (err) {
      console.error(chalk.red('\n  Bir hata oluştu:'), err?.message || err);
      await waitForKey();
    }
  }
}

main().catch((err) => {
  console.error(chalk.red('\n  Beklenmeyen hata:'), err?.message || err);
  process.exit(1);
});