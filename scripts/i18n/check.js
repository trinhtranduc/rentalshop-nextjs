#!/usr/bin/env node
/**
 * #1553 phase 2 — how far a language is on the web (works for a language that is still off).
 *   node scripts/i18n/check.js <lang> [<file> …]
 * Prints per file: missing keys, keys whose {variables} differ from Vietnamese, values with Vietnamese letters left.
 * Exit 1 when a checked file has a variable mismatch or Vietnamese letters (missing keys only report).
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const KEEP = [/áo dài/giu, /(\d|\(|\s|^)đ(?!\p{L})/gu, /Tiếng Việt/gu];
const vars = (s) => [...new Set([...String(s).matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)].map((m) => m[1]))].sort().join();
function flat(o, prefix = '', out = {}) {
  if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) flat(v, prefix ? `${prefix}.${k}` : k, out);
  else out[prefix] = o;
  return out;
}
const [lang, ...only] = process.argv.slice(2);
const files = (only.length ? only : fs.readdirSync(path.join(root, 'locales/vi')).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)))
  .filter((f) => f !== 'errors-mobile');
let bad = 0;
let totalMissing = 0;
let totalKeys = 0;
for (const file of files) {
  const vi = flat(JSON.parse(fs.readFileSync(path.join(root, 'locales/vi', `${file}.json`), 'utf8')));
  const p = path.join(root, 'locales', lang, `${file}.json`);
  const t = fs.existsSync(p) ? flat(JSON.parse(fs.readFileSync(p, 'utf8'))) : {};
  const keys = Object.keys(vi).filter((k) => typeof vi[k] === 'string');
  const missing = keys.filter((k) => !(k in t));
  const varDiff = keys.filter((k) => k in t && vars(vi[k]) !== vars(t[k]));
  const viLeft = Object.keys(t).filter((k) => typeof t[k] === 'string' && VI.test(KEEP.reduce((s, re) => s.replace(re, '$1'), t[k])));
  totalMissing += missing.length;
  totalKeys += keys.length;
  bad += varDiff.length + viLeft.length;
  console.log(`${file.padEnd(14)} ${String(keys.length - missing.length).padStart(5)}/${keys.length}` +
    (varDiff.length ? `  variables≠: ${varDiff.slice(0, 5).join(', ')}` : '') +
    (viLeft.length ? `  vietnamese: ${viLeft.slice(0, 5).join(', ')}` : ''));
}
console.log(`${lang}: ${totalKeys - totalMissing}/${totalKeys} keys (${Math.floor((100 * (totalKeys - totalMissing)) / totalKeys)}%)`);
if (bad) process.exitCode = 1;
