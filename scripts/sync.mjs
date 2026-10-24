#!/usr/bin/env node
// Copies dist/, fonts/ and the checkers into an app, with a VERSION file of SHA-256 checksums.
//   node scripts/sync.mjs <repo> --dir <folder>        copy (refuses to replace a newer copy: exit 2)
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
const sources = [...fs.readdirSync(path.join(root, 'dist')).map(f => ['dist', f]), ...fs.readdirSync(path.join(root, 'fonts')).map(f => ['fonts', f]),
  ['check', 'verify.mjs'], ['check', 'verify.py']];
const files = {};
for (const [from, name] of sources) {
  const body = fs.readFileSync(path.join(root, from, name));
  fs.writeFileSync(path.join(dest, name), body);
  files[name] = crypto.createHash('sha256').update(body).digest('hex');
}
fs.writeFileSync(path.join(dest, 'VERSION'), JSON.stringify({ version, files }, null, 2) + '\n');
console.log(`synced appliance-ui v${version} to ${dest} (${Object.keys(files).length} files)`);
