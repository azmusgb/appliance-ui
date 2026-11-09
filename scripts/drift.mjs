#!/usr/bin/env node
// Says where each consumer's kit copy stands against this kit, reading each consumer's main on GitHub.
//   node scripts/drift.mjs                  one line per consumer
//   node scripts/drift.mjs --only <name>    just that consumer (a consumer's own preflight uses this)
// Exit 2 for anything the kit side cannot read (CHANGELOG.md, consumers.json, tokens.json); a malformed kit version is 1.
// Exit 1 for a modified copy, a missing or malformed VERSION, or a copy behind across a release that needs a change.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseChangelog } from './lib/changelog.mjs';
import { parseVersion } from './lib/versions.mjs';
import { classifyCopy } from './lib/drift.mjs';
import { readConsumer } from './lib/consumers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));

// Reads <path> from the repo's main with gh. null on a 404; throws on anything else (network, auth, timeout).
export function ghFetchFile(repo, file) {
  const r = spawnSync('gh', ['api', '-H', 'Accept: application/vnd.github.raw', `repos/${repo}/contents/${file}`],
    { timeout: 20000, maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  if (r.status === 0) return Buffer.from(r.stdout);
  const message = `${r.stderr || ''}${r.stdout || ''}`;
  if (/HTTP 404|Not Found/.test(message)) return null;
  throw new Error(`gh api failed for ${repo}/${file}: ${message.trim() || `exit ${r.status}`}`);
}

// opts (all optional, for tests): fetchFile, out, err, consumers, changelog, kitVersion.
export async function main(argv, opts = {}) {
  try { return await run(argv, opts); } catch (e) { (opts.err ?? (line => console.error(line)))(e.message); return 2; }
}

async function run(argv, opts) {
  const fetchFile = opts.fetchFile ?? ghFetchFile;
  const out = opts.out ?? (line => console.log(line));
  const err = opts.err ?? (line => console.error(line));
  const consumers = opts.consumers ?? readJson('consumers.json');
  const kitVersion = opts.kitVersion ?? readJson('tokens.json').version;
  if (!parseVersion(kitVersion)) { err(`The kit's version "${kitVersion}" is not a version; fix tokens.json.`); return 1; }
  const changelog = opts.changelog ?? parseChangelog(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'));

  let chosen = consumers;
  const o = argv.indexOf('--only');
  if (o >= 0) {
    const name = argv[o + 1];
    chosen = consumers.filter(c => c.name === name);
    if (!chosen.length) { err(`usage: drift.mjs [--only <name>]; known consumers: ${consumers.map(c => c.name).join(', ')}`); return 64; }
  }

  let exit = 0;
  for (const c of chosen) {
    const copy = await readConsumer(c, fetchFile);
    const r = classifyCopy({ ...copy, kitVersion, kit: c.kit }, changelog);
    out(`${c.name}\t${r.state}\t${r.line}`);
    exit = Math.max(exit, r.exit);
  }
  return exit;
}

// Node realpaths the entry module's URL, so compare realpaths: a symlinked path (macOS /var -> /private/var) must still run.
const isEntry = () => {
  try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
};

if (process.argv[1] && isEntry()) {
  // Exit 2 for anything thrown here: a consumer's hook reads codes above 1 as "unavailable", never as a failed check.
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
