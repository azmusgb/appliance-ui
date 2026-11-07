#!/usr/bin/env node
// Copies dist/, fonts/ and the checkers into an app, with a VERSION file of SHA-256 checksums.
//   node scripts/sync.mjs <repo> --dir <folder>        copy (refuses to replace a newer copy: exit 2)
//   ... --display                                       also copy the display kit, dist/display/ (C++ parts and fonts; 2.11)
//   node scripts/sync.mjs --status <repo>:<folder> …   list each copy's version against this one
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));
const newer = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
const copied = dir => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'VERSION'), 'utf8')).version; } catch { return null; } };
const args = process.argv.slice(2);

if (args[0] === '--status') {
  for (const spec of args.slice(1)) {
    const i = spec.lastIndexOf(':'), dir = path.join(spec.slice(0, i), spec.slice(i + 1));
    console.log(`${spec.slice(i + 1)}\t${copied(dir) || 'none'}\t${version}`);
  }
  process.exit(0);
}

const repo = args[0], d = args.indexOf('--dir');
if (!repo || d < 0) { console.error('usage: sync.mjs <repo> --dir <folder> | --status <repo>:<folder> …'); process.exit(64); }
const dest = path.join(repo, args[d + 1]);
const have = copied(dest);
if (have && newer(have, version)) { console.error(`${dest} has v${have}, newer than this v${version}; not replacing it.`); process.exit(2); }
if (!fs.existsSync(path.join(root, 'dist/tokens.css'))) { console.error('Run npm run build first.'); process.exit(1); }

fs.mkdirSync(dest, { recursive: true });
// Files the last copy shipped that this version no longer does (a replaced font, say) are removed, so nothing stale lingers.
let before = {};
try { before = JSON.parse(fs.readFileSync(path.join(dest, 'VERSION'), 'utf8')).files || {}; } catch { /* first copy */ }
// dist/ is walked, so dist/display/ and its fonts/ keep their folders (names in VERSION are relative, with "/"). The
// display kit goes only where asked (--display): the web apps have no use for it and its fonts are 225 KB.
const walk = (base, rel = '') => fs.readdirSync(path.join(base, rel), { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(base, path.posix.join(rel, e.name)) : [path.posix.join(rel, e.name)]);
const withDisplay = args.includes('--display');
const sources = [...walk(path.join(root, 'dist')).filter(f => withDisplay || !f.startsWith('display/')).map(f => ['dist', f]),
  ...fs.readdirSync(path.join(root, 'fonts')).map(f => ['fonts', f]), ['check', 'verify.mjs'], ['check', 'verify.py']];
const files = {};
for (const [from, name] of sources) {
  const body = fs.readFileSync(path.join(root, from, name));
  const to = name;  // relative, with "/" for the display kit's folders
  fs.mkdirSync(path.dirname(path.join(dest, to)), { recursive: true });
  fs.writeFileSync(path.join(dest, to), body);
  files[to] = crypto.createHash('sha256').update(body).digest('hex');
}
// A name from the old VERSION is removed only if it is inside the folder: no absolute path, no "..".
const inside = name => !path.isAbsolute(name) && !name.split('/').includes('..') && !name.includes('\\') && name.split('/').every(Boolean);
const gone = Object.keys(before).filter(name => !(name in files) && inside(name) && (path.basename(name) === name || name.startsWith('display/')));
for (const name of gone) fs.rmSync(path.join(dest, name), { force: true });
fs.writeFileSync(path.join(dest, 'VERSION'), JSON.stringify({ version, files }, null, 2) + '\n');
console.log(`synced appliance-ui v${version} to ${dest} (${Object.keys(files).length} files${gone.length ? `; removed ${gone.join(', ')}` : ''})`);
