import chalk from 'chalk';
import { clearScreen, askQuestion } from '../utils/ui.js';
import { getConfig, setConfig, getCities } from '../utils/config.js';

// Şehir normalizasyonu
function normalizeCity(city) {
  return city
    .toLowerCase()
    .trim()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i');
}

// Şehir validasyonu
function validateTurkishCity(input) {
  if (!input || input.trim().length < 2) {
    return { valid: false, message: 'En az 2 karakter girmelisiniz.' };
  }
  
  const TURKISH_CITIES = getCities();
  const normalized = normalizeCity(input);
  
  // Tam eşleşme
  const exactMatch = TURKISH_CITIES.find(city => normalizeCity(city) === normalized);
  if (exactMatch) {
    return { valid: true, city: exactMatch };
  }
  
  // Başlangıç eşleşmesi (min 3 karakter)
  if (normalized.length >= 3) {
    const matches = TURKISH_CITIES.filter(city => normalizeCity(city).startsWith(normalized));
    
    if (matches.length === 1) {
      return { valid: true, city: matches[0], suggestion: true };
    }
    
    if (matches.length > 1) {
      return { 
        valid: false, 
        message: `Birden fazla eşleşme bulundu: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}`,
        matches 
      };
    }
  }
  
  return { valid: false, message: 'Geçerli bir Türkiye ili değil.' };
}

const SETTING_ACTIONS = {
  '1': async () => {
    console.log(chalk.gray('\n    Türkiye\'deki 81 ilden birini girebilirsiniz.'));
    console.log(chalk.gray('    Örnek: İstanbul, Ankara, İzmir, Nevşehir\n'));
    
    const newCity = await askQuestion(chalk.yellow('  Yeni şehir adı: '));
    
    if (newCity) {
      const validation = validateTurkishCity(newCity);
      
      if (validation.valid) {
        setConfig({ city: validation.city });
        
        if (validation.suggestion) {
          console.log(chalk.green(`\n  ✓ Şehir "${validation.city}" olarak güncellendi!`));
        } else {
          console.log(chalk.green('\n  ✓ Şehir güncellendi!'));
        }
      } else {
        console.log(chalk.red(`\n  ✗ ${validation.message}`));
        
        // Öneriler varsa göster
        if (validation.matches && validation.matches.length > 0) {
          console.log(chalk.yellow('\n    Bunlardan birini mi demek istediniz?'));
          validation.matches.slice(0, 5).forEach(city => {
            console.log(chalk.gray(`      - ${city}`));
          });
        }
      }
    }
  },
  '2': async () => {
    const newCountry = await askQuestion(chalk.yellow('\n  Yeni ülke adı: '));
    if (newCountry) {
      setConfig({ country: newCountry });
      console.log(chalk.green('\n  ✓ Ülke güncellendi!'));
    }
  },
  '3': async () => {
    const newStocks = await askQuestion(chalk.yellow('\n  Hisseleri virgülle ayırarak gir (örn: AAPL, BTC-USD, THYAO.IS): '));
    if (newStocks) {
      const stocksArr = newStocks.split(',').map(s => s.trim()).filter(Boolean);
      setConfig({ stocks: stocksArr });
      console.log(chalk.green('\n  ✓ Hisse listesi güncellendi!'));
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