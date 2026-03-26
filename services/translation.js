import puppeteer from 'puppeteer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clearScreen, askQuestion } from '../utils/ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(__dirname, '../data/dictionary_cache.json');

function getDictCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) { return {}; }
}

function saveDictCache(data) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch (e) {}
}

export async function getTranslation(word) {
  const cache = getDictCache();
  const cleanWord = word.toLowerCase().trim();

  if (cache[cleanWord]) {
    return { ...cache[cleanWord], fromCache: true };
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
    const url = `https://tureng.com/en/turkish-english/${encodeURIComponent(cleanWord)}`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    await new Promise(r => setTimeout(r, 1500));
    const results = await page.evaluate(() => {
      const allTables = Array.from(document.querySelectorAll('table.searchResultsTable'));
      if (allTables.length === 0) return [];
      let primaryTables = [];
      allTables.forEach(table => {
        let prev = table.previousElementSibling;
        while (prev && !['H2', 'H3', 'H1'].includes(prev.tagName)) {
          prev = prev.previousElementSibling;
        }
        const headerText = prev ? prev.textContent.toLowerCase() : '';
        if (headerText.includes('yaygın kullanım') || headerText.includes('common usage')) {
          primaryTables.push(table);
        }
      });
      const tablesToProcess = primaryTables.length > 0 ? primaryTables : [allTables[0]];
      return tablesToProcess.flatMap(table => {
        return Array.from(table.querySelectorAll('tr')).map(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            const cat = cells[1]?.textContent.trim();
            const source = cells[2]?.textContent.trim();
            const target = cells[3]?.textContent.trim();
            if (target && source && cat) {
              return {
                category: cat,
                source: source,
                target: target
              };
            }
          }
          return null;
        });
      }).filter(Boolean);
    });
    await browser.close();
    if (results.length > 0) {
      const data = {
        word: cleanWord,
        translations: results.slice(0, 5),
        fromCache: false
      };
      cache[cleanWord] = data;
      saveDictCache(cache);
      return data;
    } else {
      throw new Error('Kelime karşılığı bulunamadı.');
    }
  } catch (error) {
    if (browser) await browser.close();
    throw error;
  }
}

export async function showTranslation(spinner) {
  clearScreen();
  const word = await askQuestion(chalk.cyan('\n  Öğrenmek istediğin İngilizce/Türkçe kelime: '));
  if (!word || !word.trim()) return;
  spinner = (spinner || ora({ text: '  Puppeteer ile Tureng analiz ediliyor...' })).start();
  try {
    const res = await getTranslation(word);
    spinner.succeed(chalk.green('  Tureng Verileri Çekildi!'));
    const cacheTag = res.fromCache ? chalk.gray(' (Önbellekten)') : '';
    console.log(`\n    Kelime: ${chalk.bold.yellow(res.word)}${cacheTag}`);
    console.log(chalk.gray('    ───────────────────────────────────────────────'));
    res.translations.forEach((tr, index) => {
      console.log(`    ${chalk.blue(index + 1)}. [${chalk.magenta(tr.category)}] ${chalk.cyan(tr.target)}`);
    });
    console.log('');
  } catch (e) {
    spinner.fail(chalk.red('  Hata: ' + (e.message || 'Bilinmeyen hata')));
  }
}
