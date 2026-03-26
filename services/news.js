import chalk from 'chalk';
import ora from 'ora';
import { clearScreen, askQuestion, openUrl, waitForKey } from '../utils/ui.js';
import { http } from '../utils/http.js';

export async function showNews(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Haberler alınıyor...' })).start();

  try {
    const apiBase = process.env.NEWS_API_BASE_URL;
    const apiKey = process.env.NEWS_API_KEY;

    const res = await http.get(`${apiBase}?q=Türkiye&language=tr&sortBy=publishedAt&apiKey=${apiKey}&pageSize=10`, {
      retry: 2
    });

    spinner.succeed(chalk.green('  Son Haberler'));
    console.log(chalk.bold.cyan('\n  [HABERLER] GÜNCEL HABERLER\n'));

    const articles = res.data.articles || [];
    if (articles.length === 0) {
      console.log(chalk.gray('  Haber bulunamadı.'));
      await waitForKey();
      return;
    }

    articles.forEach((a, i) => {
      const source = chalk.yellow(`[${a.source?.name || 'Bilinmiyor'}]`);
      console.log(`  ${chalk.cyan(i + 1 + '.')} ${source} ${chalk.bold.white(a.title)}`);
    });

    console.log(chalk.gray('\n  ' + '-'.repeat(50)));
    const choice = await askQuestion(chalk.cyan('\n  Detayları okumak için haber numarası gir (veya Menü için 0): '));
    
    if (choice && choice !== '0') {
      const idx = parseInt(choice) - 1;
      if (articles[idx]) {
        console.log(chalk.green(`  Haber açılıyor: ${articles[idx].url}`));
        openUrl(articles[idx].url);
      } else {
        console.log(chalk.red('  Geçersiz haber numarası.'));
      }
      // Haber açıldıktan sonra biraz bekle ki geri dönmesin hemen
      await new Promise(r => setTimeout(r, 1000));
    }

  } catch (e) {
    spinner.fail(chalk.red('  Haberler alınamadı.'));
    await waitForKey();
  }
}
