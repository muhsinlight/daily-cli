import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../');
const STORAGE_DIR = path.join(ROOT_DIR, 'data');
const CACHE_FILE = path.join(STORAGE_DIR, 'cache.json');
const HISTORY_FILE = path.join(STORAGE_DIR, 'history.jsonl');

const SESSION_TOUCHED = new Set();

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

if (!fs.existsSync(CACHE_FILE)) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify({}));
}

if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, '');
}

function archiveEntry(key, value) {
  const entry = {
    key,
    value,
    archivedAt: new Date().toISOString()
  };
  try {
    fs.appendFileSync(HISTORY_FILE, JSON.stringify(entry) + '\n');
  } catch (e) {}
}

function cleanUp(data) {
  const now = Date.now();
  let changed = false;

  Object.keys(data).forEach(key => {
    if (data[key].expiry && now > data[key].expiry) {
      archiveEntry(key, data[key].value);
      delete data[key];
      changed = true;
    }
  });

  return { data, changed };
}

export function getCache(key, options = {}) {
  try {
    const { freshInSession = false, onlyToday = false } = options;

    if (freshInSession && !SESSION_TOUCHED.has(key)) {
      return null;
    }

    const dataRaw = fs.readFileSync(CACHE_FILE, 'utf8');
    let data = dataRaw ? JSON.parse(dataRaw) : {};
    
    const { data: cleanedData, changed } = cleanUp(data);
    if (changed) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cleanedData, null, 2));
    }

    const item = cleanedData[key];
    if (!item) return null;

    if (onlyToday && item.createdAt) {
      const getLocalDate = (d) => {
        const date = new Date(d);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      };
      const today = getLocalDate(new Date());
      const created = getLocalDate(item.createdAt);
      if (today !== created) return null;
    }

    return item.value;
  } catch (e) {
    return null;
  }
}

export function setCache(key, value, ttlMinutes) {
  try {
    const dataRaw = fs.readFileSync(CACHE_FILE, 'utf8');
    let data = dataRaw ? JSON.parse(dataRaw) : {};
    
    const { data: cleanedData } = cleanUp(data);
    
    cleanedData[key] = {
      value,
      expiry: Date.now() + ttlMinutes * 60 * 1000,
      createdAt: new Date().toISOString()
    };
    
    SESSION_TOUCHED.add(key);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cleanedData, null, 2));
  } catch (e) {}
}