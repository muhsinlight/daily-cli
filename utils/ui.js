import chalk from 'chalk';
import readline from 'readline';
import { exec } from 'child_process';

export function openUrl(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start ""' : 'xdg-open';
  exec(`${start} ${url}`);
}

export function clearScreen() {
  process.stdout.write('\x1b]2;daily\x07');
  process.stdout.write('\x1Bc');
}

export function formatChange(value) {
  const num = parseFloat(value);
  if (num > 0) return chalk.green(`▲ +${num.toFixed(2)}%`);
  if (num < 0) return chalk.red(`▼ ${num.toFixed(2)}%`);
  return chalk.gray(`● ${num.toFixed(2)}%`);
}

export function setRawModeSafe(enabled) {
  if (process.stdin.isTTY && typeof process.stdin.setRawMode === 'function') {
    process.stdin.setRawMode(enabled);
  }
}

export async function waitForKey() {
  return new Promise((resolve) => {
    console.log(chalk.gray('\n  Press any key to return to menu...'));
    
    setRawModeSafe(true);
    process.stdin.resume();

    const onKey = () => {
      setRawModeSafe(false);
      process.stdin.pause();
      process.stdin.off('keypress', onKey);
      resolve();
    };

    readline.emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', onKey);
  });
}

export function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function showBanner() {
  clearScreen();
  const w = 56;
  const border = chalk.cyan('═'.repeat(w));
  const side = chalk.cyan('║');

  console.log(`  ${chalk.cyan('╔')}${border}${chalk.cyan('╗')}`);
  console.log(`  ${side}${chalk.bold.cyan('        --- DAILY LIFE TERMINAL DASHBOARD ---         ')}${side}`);
  console.log(`  ${side}${chalk.gray('      Stocks · Currencies · Weather · Prayer · Sports ')}${side}`);
  console.log(`  ${chalk.cyan('╚')}${border}${chalk.cyan('╝')}\n`);

  const menu = [
    { k: '1', n: 'Weather Forecast' },
    { k: '2', n: 'Stocks / Shares' },
    { k: '3', n: 'Currencies & Metals' },
    { k: '4', n: 'Latest News' },
    { k: '5', n: 'Prayer Times' },
    { k: '6', n: 'Advice of the Day' },
    { k: '7', n: 'English Translation & Examples' },
    { k: '8', n: 'Settings (City, Stocks etc.)' },
    { k: '9', n: 'Football Matches' },
    { k: '0', n: 'Exit' }
  ];

  menu.forEach(item => {
    const kStr = item.k === '0' ? chalk.bold.red(`[${item.k}]`) : chalk.bold.green(`[${item.k}]`);
    console.log(`      ${kStr} ${chalk.white(item.n)}`);
  });

  console.log(chalk.cyan(`\n  ${'─'.repeat(w)}\n`));
  console.log(chalk.yellow('  Your choice: '));
}

export async function getMenuKey() {
  return new Promise((resolve) => {
    setRawModeSafe(true);
    process.stdin.resume();

    const onKey = (str, key) => {
      setRawModeSafe(false);
      process.stdin.pause();
      process.stdin.off('keypress', onKey);
      resolve(str || (key && key.name) || '');
    };

    readline.emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', onKey);
  });
}
