#!/usr/bin/env node
/**
 * #1553 phase 2 — put translations into locales/<lang>/<file>.json at the same nested place as in Vietnamese.
 *   node scripts/i18n/merge.js <lang> translations.json [--force]
 * translations.json: { "<file>": { "<dotted.key>": "<translated text>" } }
 * Refuses a translation whose ICU variables ({count}, {count, plural, …}) differ from the Vietnamese one.
 * Existing keys are kept (--force replaces them, e.g. with a reviewer's fixes); keys follow the Vietnamese order.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const vars = (s) => [...new Set([...String(s).matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)].map((m) => m[1]))].sort().join();

function getPath(o, keys) {
  return keys.reduce((cur, k) => (cur && typeof cur === 'object' ? cur[k] : undefined), o);
}
/** Rebuild `target` following the key order of `vi`, filling from `target` then `add` */
const FORCE = process.argv.includes('--force');
function rebuild(vi, target, add, prefix = '') {
  if (vi && typeof vi === 'object' && !Array.isArray(vi)) {
    const out = {};
    for (const k of Object.keys(vi)) {
      const key = prefix ? `${prefix}.${k}` : k;
      const v = rebuild(vi[k], target && typeof target === 'object' ? target[k] : undefined, add, key);
      if (v !== undefined) out[k] = v;
    }
    // keys only the target has (kept, after the Vietnamese ones)
    if (target && typeof target === 'object') for (const k of Object.keys(target)) if (!(k in out)) out[k] = target[k];
    return Object.keys(out).length ? out : undefined;
  }
  if (FORCE && prefix in add) return add[prefix];
  if (target !== undefined) return target;
  if (prefix in add) return add[prefix];
  return undefined;
}

const [lang, file] = process.argv.slice(2).filter((a) => a !== '--force');
const translations = JSON.parse(fs.readFileSync(file, 'utf8'));
let added = 0;
const errors = [];
for (const [name, entries] of Object.entries(translations)) {
  const vi = JSON.parse(fs.readFileSync(path.join(root, 'locales/vi', `${name}.json`), 'utf8'));
  const p = path.join(root, 'locales', lang, `${name}.json`);
  const target = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  const ok = {};
  for (const [key, text] of Object.entries(entries)) {
    const source = getPath(vi, key.split('.'));
    if (typeof source !== 'string') { errors.push(`${name}:${key} not a Vietnamese string`); continue; }
    if (typeof text !== 'string' || !text.trim()) { errors.push(`${name}:${key} empty`); continue; }
    if (vars(source) !== vars(text)) { errors.push(`${name}:${key} variables ${vars(text)} ≠ ${vars(source)}`); continue; }
    ok[key] = text;
  }
  const merged = rebuild(vi, target, ok);
  fs.writeFileSync(p, `${JSON.stringify(merged, null, 2)}\n`);
  added += Object.keys(ok).length;
}
console.log(`added ${added}`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
