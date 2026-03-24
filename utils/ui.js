import chalk from 'chalk';
import readline from 'readline';

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
    console.log(chalk.gray('\n  Menüye dönmek için herhangi bir tuşa bas...'));
    
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
  console.log(`  ${side}${chalk.bold.cyan('        --- GÜNLÜK YAŞAM TERMINAL DASHBOARD ---       ')}${side}`);
  console.log(`  ${side}${chalk.gray('      Borsa · Döviz · Hava · Ezan · Çeviri            ')}${side}`);
  console.log(`  ${chalk.cyan('╚')}${border}${chalk.cyan('╝')}\n`);

  const menu = [
    { k: '1', n: 'Hava Durumu' },
    { k: '2', n: 'Borsa / Hisse' },
    { k: '3', n: 'Döviz & Metaller' },
    { k: '4', n: 'Son Haberler' },
    { k: '5', n: 'Namaz Vakitleri' },
    { k: '6', n: 'Günün Tavsiyesi' },
    { k: '7', n: 'İngilizce Çeviri & Örnek' },
    { k: '8', n: 'Ayarlar (Şehir, Hisse vb.)' },
    { k: '0', n: 'Çıkış' }
  ];

  menu.forEach(item => {
    const kStr = item.k === '0' ? chalk.bold.red(`[${item.k}]`) : chalk.bold.green(`[${item.k}]`);
    console.log(`      ${kStr} ${chalk.white(item.n)}`);
  });

  console.log(chalk.cyan(`\n  ${'─'.repeat(w)}\n`));
  console.log(chalk.yellow('  Seçim yap: '));
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
