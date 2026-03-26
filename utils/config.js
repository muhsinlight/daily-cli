import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../');
const STORAGE_DIR = path.join(ROOT_DIR, 'data');
const CONFIG_FILE = path.join(STORAGE_DIR, 'config.json');

const DEFAULT_CONFIG = {
  city: 'Nevşehir',
  country: 'Turkey',
  stocks: ['THYAO.IS', 'AAPL', 'BTC-USD'],
};

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

export function getConfig() {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

export function setConfig(newConfig) {
  const current = getConfig();
  const merged = { ...current, ...newConfig };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2));
}

export function getCities() {
  const CITIES_FILE = path.join(ROOT_DIR, 'resources', 'cities.json');
  try {
    const data = fs.readFileSync(CITIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}
