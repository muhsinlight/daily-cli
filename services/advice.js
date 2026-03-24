import chalk from 'chalk';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';
import { http } from '../utils/http.js';

export async function showAdvice(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Tavsiye alınıyor...' })).start();

  try {
    const advice = await http.get(process.env.ADVICE_API_URL, { retry: 4 });
    spinner.succeed(chalk.green('  Günün Tavsiyesi'));
    console.log(`\n    "${advice.data.slip.advice}"`);
  } catch (e) {
    spinner.fail(chalk.red('  Tavsiye alınamadı.'));
  }
}
