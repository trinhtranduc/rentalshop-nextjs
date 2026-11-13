#!/usr/bin/env node
/**
 * #1553 phase 2 — list the strings a language still lacks, with the Vietnamese and English to translate from.
 *   node scripts/i18n/missing.js <lang> <file> [<file> …] > missing.json
 * Output: { "<file>": { "<dotted.key>": { "vi": "…", "en": "…" } } }  (files are names under locales/vi without .json)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
function flat(o, prefix = '', out = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) {
    for (const [k, v] of Object.entries(o)) flat(v, prefix ? `${prefix}.${k}` : k, out);
  } else out[prefix] = o;
  return out;
}
const read = (lang, file) => {
  const p = path.join(root, 'locales', lang, `${file}.json`);
  return fs.existsSync(p) ? flat(JSON.parse(fs.readFileSync(p, 'utf8'))) : {};
};

const [lang, ...files] = process.argv.slice(2);
if (!lang || !files.length) {
  console.error('usage: node scripts/i18n/missing.js <lang> <file> [<file> …]');
  process.exit(1);
}
const out = {};
for (const file of files) {
  const vi = read('vi', file);
  const en = read('en', file);
  const have = read(lang, file);
  const missing = {};
  for (const [k, v] of Object.entries(vi)) if (typeof v === 'string' && !(k in have)) missing[k] = { vi: v, en: en[k] ?? null };
  if (Object.keys(missing).length) out[file] = missing;
}
process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
