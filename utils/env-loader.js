#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.log(chalk.red(`  (!) Dotenv Config Error: ${result.error.message}`));
  } else {
  }
} else {
  console.log(chalk.yellow(`  (!) Warning: .env bulunamadı: ${envPath}`));
}

// Check if critical env variables are loaded properly
const missingKeys = [];
const requiredKeys = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET', 'NEWS_API_KEY', 'FOOTBALL_DATA_API_KEY'];

for (const key of requiredKeys) {
  if (!process.env[key] || process.env[key].trim() === '' || process.env[key].includes('YOUR_')) {
    missingKeys.push(key);
  }
}

if (missingKeys.length > 0) {
  console.log(chalk.red(`\n  (!) ENV HATASI: Aşağıdaki API anahtarları .env dosyasından çekilemiyor veya geçersiz!`));
  missingKeys.forEach(k => console.log(chalk.red(`      - ${k}`)));
  console.log(chalk.gray(`\n  Çözüm: .env dosyanızı açıp bu anahtarların karşısına doğru değerleri girdiğinizden emin olun.`));
  console.log(chalk.gray(`  Eğer dosyanız yoksa .env.example dosyasını kopyalayarak oluşturabilirsiniz.\n`));
}

export default process.env;
