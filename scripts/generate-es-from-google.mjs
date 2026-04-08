/**
 * Builds lib/i18n/locales/es.json from lib/i18n/en-flat.json using Google Translate (unofficial gtx endpoint).
 * Run: node scripts/generate-es-from-google.mjs
 * Manual overrides fix common wrong senses (e.g. Save → Guardar).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enPath = path.join(root, 'scripts/.cache/en-flat.json');
const outPath = path.join(root, 'lib/i18n/locales/es.json');

/** Key-specific fixes (UI context; MT often picks wrong sense). */
const KEY_OVERRIDES = {
  'common.save': 'Guardar',
  'profile.saved.title': 'Guardado',
  'tools.invoice.alert.savedTitle': 'Guardado',
};

/** Value-based fixes when key not in overrides (exact English match). */
const VALUE_OVERRIDES = {
  Save: 'Guardar',
  Saved: 'Guardado',
};

async function translateText(text) {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${q}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const parts = data?.[0];
  if (!Array.isArray(parts)) throw new Error('Bad response shape');
  return parts.map((p) => p[0]).join('');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const keys = Object.keys(en);
  const es = {};
  let i = 0;
  for (const key of keys) {
    i++;
    if (KEY_OVERRIDES[key] !== undefined) {
      es[key] = KEY_OVERRIDES[key];
      continue;
    }
    const english = en[key];
    let spanish;
    try {
      spanish = await translateText(english);
      if (VALUE_OVERRIDES[english] !== undefined) spanish = VALUE_OVERRIDES[english];
    } catch (e) {
      console.error(`Fail [${i}/${keys.length}] ${key}:`, e.message);
      spanish = english;
    }
    es[key] = spanish;
    if (i % 50 === 0) console.log(`… ${i}/${keys.length}`);
    await sleep(80);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(es, null, 2), 'utf8');
  console.log('Wrote', outPath, Object.keys(es).length, 'keys');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
