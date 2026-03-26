import chalk from 'chalk';
import ora from 'ora';
import { clearScreen, askQuestion, openUrl, waitForKey } from '../utils/ui.js';
import { http } from '../utils/http.js';

export async function showNews(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Fetching news...' })).start();

  try {
    const apiBase = process.env.NEWS_API_BASE_URL;
    const apiKey = process.env.NEWS_API_KEY;

    const res = await http.get(`${apiBase}?q=Türkiye&language=tr&sortBy=publishedAt&apiKey=${apiKey}&pageSize=10`, {
      retry: 2
    });

    spinner.succeed(chalk.green('  Latest News'));
    console.log(chalk.bold.cyan('\n  [NEWS] LATEST NEWS\n'));

    const articles = res.data.articles || [];
    if (articles.length === 0) {
      console.log(chalk.gray('  No news found.'));
      await waitForKey();
      return;
    }

    articles.forEach((a, i) => {
      const source = chalk.yellow(`[${a.source?.name || 'Unknown'}]`);
      console.log(`  ${chalk.cyan(i + 1 + '.')} ${source} ${chalk.bold.white(a.title)}`);
    });

    console.log(chalk.gray('\n  ' + '-'.repeat(50)));
    const choice = await askQuestion(chalk.cyan('\n  Enter news number to read details (or 0 for Menu): '));
    
    if (choice && choice !== '0') {
      const idx = parseInt(choice) - 1;
      if (articles[idx]) {
        console.log(chalk.green(`  Opening news: ${articles[idx].url}`));
        openUrl(articles[idx].url);
      } else {
        console.log(chalk.red('  Invalid news number.'));
      }
      await new Promise(r => setTimeout(r, 1000));
    }

  } catch (e) {
    spinner.fail(chalk.red('  Could not fetch news.'));
    await waitForKey();
  }
}
