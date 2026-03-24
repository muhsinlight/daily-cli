import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { clearScreen, askQuestion } from '../utils/ui.js';
import { http } from '../utils/http.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_FILE = path.resolve(__dirname, '../data/dictionary_cache.json');

// Önbelleği yükleyelim
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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY bulunamadı. Lütfen .env dosyasını kontrol edin.');

  const prompt = `You are a professional English-Turkish dictionary. Translate the following English word to Turkish. 
  Provide: 1. Main Turkish meaning. 2. IPA pronunciation. 3. A natural, contextual example sentence in English. 4. Turkish translation of that sentence. 
  Response MUST be a valid JSON object only:
  {
    "word": "${cleanWord}",
    "meaning": "turkish_meaning",
    "ipa": "ipa_pronunciation",
    "example": "natural_english_sentence",
    "example_tr": "turkish_translation_of_sentence"
  }`;

  const resp = await http.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  }, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });

  const result = JSON.parse(resp.data.choices[0].message.content);
  
  // Önbelleğe kaydet
  cache[cleanWord] = result;
  saveDictCache(cache);

  return { ...result, fromCache: false };
}

export async function showTranslation(spinner) {
  clearScreen();

  const word = await askQuestion(chalk.cyan('\n  Öğrenmek istediğin İngilizce kelime: '));
  if (!word || !word.trim()) return;

  spinner = (spinner || ora({ text: '  Llama 3 analizi yapıyor...' })).start();

  try {
    const res = await getTranslation(word);
    spinner.succeed(chalk.green('  Sonuçlar Hazır!'));

    const cacheTag = res.fromCache ? chalk.gray(' (Önbellekten)') : '';

    console.log(`\n    Kelime: ${chalk.bold.yellow(res.word)}${cacheTag}`);
    console.log(`    Okunuş: ${chalk.gray(res.ipa)}`);
    console.log(`    Türkçesi: ${chalk.cyan(res.meaning)}`);
    console.log(`\n    [Örnek Cümle]:`);
    console.log(`    "${chalk.white(res.example)}"`);
    console.log(`\n    [Cümle Çevirisi]:`);
    console.log(`    "${chalk.gray(res.example_tr)}"`);

  } catch (e) {
    spinner.fail(chalk.red('  Analiz başarısız: ' + (e.message || 'Bilinmeyen hata')));
  }
}
