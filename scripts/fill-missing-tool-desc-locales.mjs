import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const toolsFile = path.join(root, 'lib/tools/allTools.ts');
const localesDir = path.join(root, 'lib/i18n/locales');

function googleTl(code) {
  const c = code.toLowerCase();
  if (c === 'zh') return 'zh-CN';
  if (c === 'he') return 'iw';
  return c;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseToolDescriptions(tsSource) {
  const entries = [];
  const re = /id:\s*'([^']+)'[\s\S]*?description:\s*'([^']*)'/g;
  let m;
  while ((m = re.exec(tsSource)) !== null) {
    entries.push({
      id: m[1],
      desc: m[2],
    });
  }
  return entries;
}

async function main() {
  const source = fs.readFileSync(toolsFile, 'utf8');
  const toolEntries = parseToolDescriptions(source);
  if (!toolEntries.length) {
    throw new Error('No tool descriptions parsed from allTools.ts');
  }

  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((n) => n.endsWith('.json'))
    .map((n) => ({
      code: n.replace(/\.json$/i, ''),
      file: path.join(localesDir, n),
    }));

  for (const { code, file } of localeFiles) {
    const tl = googleTl(code);
    const json = JSON.parse(fs.readFileSync(file, 'utf8'));

    let missing = 0;
    for (const { id } of toolEntries) {
      const key = `tools.item.${id}.desc`;
      if (json[key] == null || json[key] === '') missing++;
    }
    console.log(`\n[${code}] missing desc keys before: ${missing}`);
    if (missing === 0) continue;

    let done = 0;
    for (const { id, desc } of toolEntries) {
      const key = `tools.item.${id}.desc`;
      if (json[key] != null && json[key] !== '') continue;

      try {
        json[key] = await translateWithRetry(desc, tl);
      } catch {
        json[key] = desc;
      }
      done++;
      if (done % 20 === 0) {
        console.log(`  … ${code} ${done}/${missing}`);
      }
      await sleep(55);
    }

    fs.writeFileSync(file, JSON.stringify(json, null, 2), 'utf8');
    console.log(`[${code}] wrote ${file}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
