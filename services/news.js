import chalk from 'chalk';
import ora from 'ora';
import { clearScreen } from '../utils/ui.js';
import { http } from '../utils/http.js';

export async function showNews(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Haberler alınıyor...' })).start();

  try {
    const apiBase = process.env.NEWS_API_BASE_URL;
    const apiKey = process.env.NEWS_API_KEY;

    const res = await http.get(`${apiBase}?q=Türkiye&language=tr&sortBy=publishedAt&apiKey=${apiKey}&pageSize=5`, {
      retry: 2
    });

    spinner.succeed(chalk.green('  Son Haberler'));
    console.log(chalk.bold.cyan('\n  [HABERLER] GÜNCEL HABERLER\n'));

    const articles = res.data.articles || [];
    if (articles.length === 0) {
      console.log(chalk.gray('  Haber bulunamadı.'));
      return;
    }

    articles.forEach((a, i) => {
      console.log(`  ${chalk.cyan(i + 1 + '.')} ${chalk.bold.white(a.title)}`);
    });
  } catch (e) {
    spinner.fail(chalk.red('  Haberler alınamadı.'));
  }
}
