const MAX_TAGS = 20;
const MAX_TAG_LEN = 24;

/** Parse user input into normalised tags (comma / space / #). */
export function parseTagsFromInput(raw: string): string[] {
  const parts = raw
    .split(/[,\s#]+/g)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => t.slice(0, MAX_TAG_LEN));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function normalizeTagList(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    if (typeof t !== 'string') continue;
    const n = t.trim().toLowerCase().replace(/^#+/, '').slice(0, MAX_TAG_LEN);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export function tagsToDisplayString(tags: string[]): string {
  return tags.map((t) => `#${t}`).join(' ');
}
