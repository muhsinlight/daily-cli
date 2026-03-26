import chalk from 'chalk';
import { clearScreen, askQuestion } from '../utils/ui.js';
import { getConfig, setConfig, getCities } from '../utils/config.js';

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

function validateTurkishCity(input) {
  if (!input || input.trim().length < 2) {
    return { valid: false, message: 'You must enter at least 2 characters.' };
  }
  
  const TURKISH_CITIES = getCities();
  const normalized = normalizeCity(input);
  
  const exactMatch = TURKISH_CITIES.find(city => normalizeCity(city) === normalized);
  if (exactMatch) {
    return { valid: true, city: exactMatch };
  }
  
  if (normalized.length >= 3) {
    const matches = TURKISH_CITIES.filter(city => normalizeCity(city).startsWith(normalized));
    
    if (matches.length === 1) {
      return { valid: true, city: matches[0], suggestion: true };
    }
    
    if (matches.length > 1) {
      return { 
        valid: false, 
        message: `Multiple matches found: ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? '...' : ''}`,
        matches 
      };
    }
  }
  
  return { valid: false, message: 'Not a valid Turkish city.' };
}

const SETTING_ACTIONS = {
  '1': async () => {
    console.log(chalk.gray('\n    You can enter one of the 81 Turkish cities.'));
    console.log(chalk.gray('    Example: Istanbul, Ankara, Izmir, Nevsehir\n'));
    
    const newCity = await askQuestion(chalk.yellow('  New city name: '));
    
    if (newCity) {
      const validation = validateTurkishCity(newCity);
      
      if (validation.valid) {
        setConfig({ city: validation.city });
        
        if (validation.suggestion) {
          console.log(chalk.green(`\n  ✓ City updated to "${validation.city}"!`));
        } else {
          console.log(chalk.green('\n  ✓ City updated!'));
        }
      } else {
        console.log(chalk.red(`\n  ✗ ${validation.message}`));
        
        if (validation.matches && validation.matches.length > 0) {
          console.log(chalk.yellow('\n    Did you mean one of these?'));
          validation.matches.slice(0, 5).forEach(city => {
            console.log(chalk.gray(`      - ${city}`));
          });
        }
      }
    }
  },
  '2': async () => {
    const newCountry = await askQuestion(chalk.yellow('\n  New country name: '));
    if (newCountry) {
      setConfig({ country: newCountry });
      console.log(chalk.green('\n  ✓ Country updated!'));
    }
  },
  '3': async () => {
    const newStocks = await askQuestion(chalk.yellow('\n  Enter stocks separated by commas (e.g., AAPL, BTC-USD): '));
    if (newStocks) {
      const stocksArr = newStocks.split(',').map(s => s.trim()).filter(Boolean);
      setConfig({ stocks: stocksArr });
      console.log(chalk.green('\n  ✓ Stock list updated!'));
    }
  }
};

export async function showSettings() {
  clearScreen();
  const config = getConfig();

  console.log(chalk.bold.cyan('\n  [SETTINGS]\n'));
  console.log(`    ${chalk.yellow('1.')} Change City (Current: ${chalk.white(config.city)})`);
  console.log(`    ${chalk.yellow('2.')} Change Country (Current: ${chalk.white(config.country)})`);
  console.log(`    ${chalk.yellow('3.')} Edit Tracked Stocks (Current: ${chalk.white(config.stocks.join(', '))})`);
  console.log(`    ${chalk.yellow('0.')} Back`);

  const choice = await askQuestion(chalk.cyan('\n  Your choice: '));
  
  const action = SETTING_ACTIONS[choice];
  if (action) {
    await action();
  }
}