/**
 * Extract en TranslationDict entries from lib/i18n/translations.ts for tooling.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../lib/i18n/translations.ts');
const t = fs.readFileSync(file, 'utf8');
const marker = 'const en: TranslationDict = ';
const a = t.indexOf(marker);
if (a < 0) throw new Error('en block not found');
const openBrace = t.indexOf('{', a);
let depth = 0;
let i = openBrace;
let bodyStart = -1;
for (; i < t.length; i++) {
  if (t[i] === '{') {
    depth++;
    if (depth === 1) bodyStart = i + 1;
  } else if (t[i] === '}') {
    depth--;
    if (depth === 0) break;
  }
}
const body = t.slice(bodyStart, i);

const entries = [];
let pos = 0;
function skipWs() {
  while (pos < body.length && /\s/.test(body[pos])) pos++;
}
function readQuoted(q) {
  if (body[pos] !== q) throw new Error(`Expected ${q} at ${pos}`);
  pos++;
  let s = '';
  while (pos < body.length) {
    const c = body[pos];
    if (c === '\\') {
      pos++;
      if (pos < body.length) s += body[pos++];
      continue;
    }
    if (c === q) {
      pos++;
      return s;
    }
    s += c;
    pos++;
  }
  throw new Error('Unterminated string');
}

function readKey() {
  return readQuoted("'");
}

function readValue() {
  const q = body[pos];
  if (q !== "'" && q !== '"') throw new Error(`Expected value string at ${pos}`);
  return readQuoted(q);
}

while (pos < body.length) {
  skipWs();
  if (pos >= body.length) break;
  if (body[pos] === '/' && body[pos + 1] === '/') {
    while (pos < body.length && body[pos] !== '\n') pos++;
    continue;
  }
  const key = readKey();
  skipWs();
  if (body[pos] !== ':') throw new Error(`Expected : after key ${key}`);
  pos++;
  skipWs();
  const val = readValue();
  skipWs();
  if (body[pos] === ',') pos++;
  entries.push([key, val]);
}

console.log(JSON.stringify({ count: entries.length, first: entries[0], last: entries.at(-1) }));

const outJson = path.join(__dirname, '.cache/en-flat.json');
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(Object.fromEntries(entries), null, 0));
console.log('Wrote', outJson, entries.length, 'entries (for scripts/generate-es-from-google.mjs)');
