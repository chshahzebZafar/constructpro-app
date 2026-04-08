/**
 * Re-translate keys that are still equal to English in locale JSON files.
 *
 * Usage:
 *   node scripts/repair-locale-fallbacks.mjs
 *   ONLY=de,fr node scripts/repair-locale-fallbacks.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const enPath = path.join(root, 'scripts/.cache/en-flat.json');
const localesDir = path.join(root, 'lib/i18n/locales');

function googleTl(code) {
  const c = code.toLowerCase();
  if (c === 'zh') return 'zh-CN';
  if (c === 'he') return 'iw';
  return c;
}

const TARGETS = [
  'es',
  'ur',
  'hi',
  'bn',
  'ta',
  'te',
  'mr',
  'gu',
  'pa',
  'fr',
  'de',
  'it',
  'pt',
  'ru',
  'pl',
  'uk',
  'tr',
  'fa',
  'id',
  'ms',
  'vi',
  'th',
  'tl',
  'zh',
  'ja',
  'ko',
  'nl',
  'sv',
  'no',
  'da',
  'fi',
  'cs',
  'el',
  'he',
  'ro',
  'hu',
  'sw',
];

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateText(text, tl) {
  const q = encodeURIComponent(text);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(tl)}&dt=t&q=${q}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const parts = data?.[0];
  if (!Array.isArray(parts)) throw new Error('Bad response shape');
  return parts.map((p) => p[0]).join('');
}

async function translateWithRetry(text, tl, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const out = await translateText(text, tl);
      if (out && out.trim()) return out;
      throw new Error('Empty translation');
    } catch (e) {
      lastErr = e;
      await sleep(220 * (i + 1));
    }
  }
  throw lastErr ?? new Error('Unknown translation error');
}

async function main() {
  if (!fs.existsSync(enPath)) {
    console.error('Missing', enPath, '- run: node scripts/extract-en-translations.mjs');
    process.exit(1);
  }
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const only = process.env.ONLY
    ? new Set(
        process.env.ONLY.split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean)
      )
    : null;
  const targets = only ? TARGETS.filter((c) => only.has(c)) : TARGETS;
  if (targets.length === 0) {
    console.error('No matching locales');
    process.exit(1);
  }

  for (const code of targets) {
    const file = path.join(localesDir, `${code}.json`);
    if (!fs.existsSync(file)) {
      console.warn(`[${code}] skip: missing file`);
      continue;
    }
    const tl = googleTl(code);
    const locale = JSON.parse(fs.readFileSync(file, 'utf8'));
    const keys = Object.keys(en);
    const fallbackKeys = keys.filter((k) => locale[k] === en[k]);
    console.log(`\n[${code}] fallback keys before: ${fallbackKeys.length}`);
    if (fallbackKeys.length === 0) continue;

    let done = 0;
    let failed = 0;
    for (const k of fallbackKeys) {
      const english = en[k];
      try {
        locale[k] = await translateWithRetry(english, tl);
      } catch (e) {
        failed++;
        console.error(`  [${code}] fail ${k}:`, e.message);
      }
      done++;
      if (done % 25 === 0) {
        console.log(`  … ${code} ${done}/${fallbackKeys.length}`);
      }
      await sleep(55);
    }
    fs.writeFileSync(file, JSON.stringify(locale, null, 2), 'utf8');

    const after = keys.filter((k) => locale[k] === en[k]).length;
    console.log(`[${code}] fallback keys after: ${after} (failed attempts: ${failed})`);
    console.log(`Wrote ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
