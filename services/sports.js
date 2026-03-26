import chalk from 'chalk';
import ora from 'ora';
import { clearScreen, waitForKey } from '../utils/ui.js';
import { http } from '../utils/http.js';

export async function showSports(spinner) {
  clearScreen();
  spinner = (spinner || ora({ text: '  Fetching football matches...' })).start();

  try {
    const apiBase = process.env.FOOTBALL_DATA_API_URL;
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    const ALLOWED_COMPS = ['PL', 'PD', 'CL', 'BL1', 'SA', 'FL1'];

    if (!apiKey) {
      spinner.info(chalk.yellow('  FOOTBALL_DATA_API_KEY is missing in your .env file!'));
      console.log(chalk.gray('\n  Please get a free API key from https://www.football-data.org/'));
      await waitForKey();
      return;
    }

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 10);

    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = nextWeek.toISOString().split('T')[0];

    const res = await http.get(`${apiBase}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
      headers: { 'X-Auth-Token': apiKey },
      retry: 2
    });

    spinner.succeed(chalk.green('  Football Matches Found'));
    console.log(chalk.bold.cyan(`\n  [SPORTS] TOP LEAGUE MATCHES (NEXT 7 DAYS)\n`));

    const allMatches = res.data.matches || [];
    const matches = allMatches.filter(m => ALLOWED_COMPS.includes(m.competition.code));
    if (matches.length === 0) {
      console.log(chalk.gray('  No matches found for today.'));
      await waitForKey();
      return;
    }

    const grouped = matches.reduce((acc, m) => {
      const comp = m.competition.name;
      if (!acc[comp]) acc[comp] = [];
      acc[comp].push(m);
      return acc;
    }, {});

    Object.entries(grouped).forEach(([comp, ms]) => {
      console.log(chalk.yellow(`\n  ● ${comp}`));
      ms.forEach(m => {
        const d = new Date(m.utcDate);
        const day = d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
        const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const home = m.homeTeam.shortName || m.homeTeam.name;
        const away = m.awayTeam.shortName || m.awayTeam.name;
        const score = m.score.fullTime.home !== null ? `${m.score.fullTime.home} - ${m.score.fullTime.away}` : 'v';
        const isToday = d.toDateString() === new Date().toDateString();
        const status = m.status === 'IN_PLAY' || m.status === 'LIVE' ? chalk.red(' (LIVE)') : m.status === 'FINISHED' ? chalk.gray(' (FT)') : chalk.gray(` (${isToday ? time : day + ' ' + time})`);
        
        console.log(`    ${chalk.white(home.padEnd(15))} ${chalk.bold.cyan(score.padStart(5))} ${chalk.white(away.padStart(15))} ${status}`);
      });
    });

    console.log(chalk.gray('\n  ' + '-'.repeat(50)));
    await waitForKey();

  } catch (e) {
    if (e.response?.status === 403) {
        spinner.fail(chalk.red('  Access denied. Free tier may have restricted leagues.'));
    } else {
        spinner.fail(chalk.red('  Could not fetch football data.'));
    }
    console.log(chalk.gray(`  ${e.message}`));
    await waitForKey();
  }
}
