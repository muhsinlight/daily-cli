import chalk from 'chalk';
import { clearScreen, askQuestion } from '../utils/ui.js';
import { getConfig, setConfig } from '../utils/config.js';

const SETTING_ACTIONS = {
  '1': async () => {
    const newCity = await askQuestion(chalk.yellow('\n  Yeni şehir adı: '));
    if (newCity) {
      setConfig({ city: newCity });
      console.log(chalk.green('\n  Şehir güncellendi!'));
    }
  },
  '2': async () => {
    const newCountry = await askQuestion(chalk.yellow('\n  Yeni ülke adı: '));
    if (newCountry) {
      setConfig({ country: newCountry });
      console.log(chalk.green('\n  Ülke güncellendi!'));
    }
  },
  '3': async () => {
    const newStocks = await askQuestion(chalk.yellow('\n  Hisseleri virgülle ayırarak gir (örn: AAPL, BTC-USD, THYAO.IS): '));
    if (newStocks) {
      const stocksArr = newStocks.split(',').map(s => s.trim()).filter(Boolean);
      setConfig({ stocks: stocksArr });
      console.log(chalk.green('\n  Hisse listesi güncellendi!'));
    }
  }
};

export async function showSettings() {
  clearScreen();
  const config = getConfig();

  console.log(chalk.bold.cyan('\n  [AYARLAR]\n'));
  console.log(`    ${chalk.yellow('1.')} Şehir Değiştir (Mevcut: ${chalk.white(config.city)})`);
  console.log(`    ${chalk.yellow('2.')} Ülke Değiştir (Mevcut: ${chalk.white(config.country)})`);
  console.log(`    ${chalk.yellow('3.')} Takip Edilen Hisseleri Düzenle (Mevcut: ${chalk.white(config.stocks.join(', '))})`);
  console.log(`    ${chalk.yellow('0.')} Geri`);

  const choice = await askQuestion(chalk.cyan('\n  Seçim yap: '));
  
  const action = SETTING_ACTIONS[choice];
  if (action) {
    await action();
  }
}
