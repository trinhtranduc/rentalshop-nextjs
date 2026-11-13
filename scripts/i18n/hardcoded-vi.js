#!/usr/bin/env node
/**
 * #1554 (#1553 phase 1) — count lines of shop-page and app code that write Vietnamese text straight into a string,
 * instead of reading it from the language files (locales/*, Localizable.strings, strings.xml).
 *
 *   node scripts/i18n/hardcoded-vi.js          print the count per file and the total
 *   node scripts/i18n/hardcoded-vi.js --write  save today's counts as the ceiling (tests/fixtures/hardcoded-vi-baseline.json)
 *
 * tests/hardcoded-vietnamese.test.ts fails when a file goes above its ceiling. Lower it after a clean-up.
 */
const fs = require('fs');
const path = require('path');

const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹĐ]/i;
const BASELINE = 'tests/fixtures/hardcoded-vi-baseline.json';

/** Code a shop owner or staff member reads, per platform */
const SCOPES = [
  { dir: 'apps/client/app', ext: ['.tsx', '.ts'] },
  { dir: 'packages/ui/src', ext: ['.tsx', '.ts'] },
  { dir: 'apps/mobile/POS ADBD', ext: ['.swift'] },
  { dir: 'apps/mobile-android/app/src/main/java', ext: ['.kt'] },
];

/** Vietnamese on purpose: SEO pages for Vietnamese searches, the legal texts, the author page; tests */
const ALLOWED = [
  /^apps\/client\/app\/cho-thue-[^/]+\//,
  /^apps\/client\/app\/(terms|privacy|authors)\//,
  /(^|\/)__tests__\//,
  /\.(test|spec)\.(t|j)sx?$/,
];

function isAllowed(file) {
  return ALLOWED.some((re) => re.test(file));
}

/** A line counts when a string literal or JSX text on it has a Vietnamese letter. Comments do not count. */
function countLines(text) {
  let n = 0;
  let inBlock = false;
  for (const raw of text.split('\n')) {
    let line = raw;
    if (inBlock) {
      const end = line.indexOf('*/');
      if (end < 0) continue;
      line = line.slice(end + 2);
      inBlock = false;
    }
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')) continue;
    if (trimmed.startsWith('/*')) {
      if (!trimmed.includes('*/')) inBlock = true;
      continue;
    }
    const code = stripLineComment(line);
    const literals = code.match(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|>[^<>{}]*</g) || [];
    if (literals.some((l) => VI.test(l))) n += 1;
  }
  return n;
}

/** Drop a trailing `// …` that is outside a string */
function stripLineComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c === '/' && line[i + 1] === '/' && line[i - 1] !== ':') {
      return line.slice(0, i);
    }
  }
  return line;
}

function walk(dir, ext, out) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'build' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (ext.some((e) => entry.name.endsWith(e))) out.push(full);
  }
  return out;
}

function scanRepo(root) {
  const counts = {};
  for (const { dir, ext } of SCOPES) {
    for (const full of walk(path.join(root, dir), ext, [])) {
      const file = path.relative(root, full).split(path.sep).join('/');
      if (isAllowed(file)) continue;
      const n = countLines(fs.readFileSync(full, 'utf8'));
      if (n > 0) counts[file] = n;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function readBaseline(root) {
  const p = path.join(root, BASELINE);
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
}

module.exports = { countLines, isAllowed, scanRepo, readBaseline, BASELINE };

if (require.main === module) {
  const root = path.resolve(__dirname, '../..');
  const counts = scanRepo(root);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (process.argv.includes('--write')) {
    fs.writeFileSync(path.join(root, BASELINE), `${JSON.stringify(counts, null, 2)}\n`);
    console.log(`wrote ${BASELINE}: ${Object.keys(counts).length} files, ${total} lines`);
  } else {
    const byScope = {};
    for (const [file, n] of Object.entries(counts)) {
      const scope = SCOPES.find((s) => file.startsWith(s.dir)).dir;
      byScope[scope] = (byScope[scope] || 0) + n;
    }
    console.log(JSON.stringify({ total, byScope }, null, 2));
  }
}
