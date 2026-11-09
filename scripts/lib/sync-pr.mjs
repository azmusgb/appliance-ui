// The plan behind `sync.mjs <repo> --dir <folder> --pr`: a kit-sync branch in a worktree, the copy, the consumer's own
// check, a commit, a push of that branch and a PR against main. It opens the PR and stops; nothing here merges.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseVersion } from './versions.mjs';
import { parseChangelog, releasesBetween } from './changelog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const COAUTHOR = 'Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>';
export const GENERATED = '🤖 Generated with [Claude Code](https://claude.com/claude-code)';
export const WORKTREE = '<worktree>';
export const NO_CHECK = 'Check: not run on the Mac';

const NAME = /^(?![-.])[A-Za-z0-9._-]+$/;
const FOLDER = /^(?![-/])[A-Za-z0-9._/-]+$/;
const usage = message => Object.assign(new Error(message), { usage: true });

export function validate({ name, folder }, ...versions) {
  if (typeof name !== 'string' || !NAME.test(name) || /^\.+$/.test(name)) throw usage(`repo name "${name}" must match [A-Za-z0-9._-]+`);
  if (typeof folder !== 'string' || !FOLDER.test(folder) || folder.split('/').includes('..')) throw usage(`folder "${folder}" must be a relative path of [A-Za-z0-9._/-]`);
  for (const v of versions) if (!parseVersion(v)) throw usage(`not a version: ${v}`);
}

// A needs-change release for the other kit is nothing for this consumer to do. No kit (or no audience) counts as relevant,
// as in drift.mjs.
const VERDICT = (e, kit) => e.skip === true ? 'skippable'
  : e.skip === false
    ? (kit && e.audience && e.audience !== 'all' && e.audience !== kit
      ? `${e.audience} kit only, nothing for this consumer to change${e.note ? ` (${e.note})` : ''}`
      : `needs consumer change${e.note ? `: ${e.note}` : ''}`)
    : 'unclassified: read the diff';

// entries: releasesBetween(...) rows. check: the consumer's check command or null. kit: the consumer's kit (web|display) or null.
export function buildPrBody({ name, from, to, entries, check = null, kit = null }) {
  const lines = [`## Sync appliance-ui kit for ${name}: ${from ?? 'no copy'} to ${to}`, '',
    from ? 'Releases in this move:' : 'First copy of the kit.', ''];
  for (const e of entries) lines.push(`- ${e.version}: ${VERDICT(e, kit)}`);
  if (entries.length) lines.push('');
  if (!check) lines.push(NO_CHECK, '');
  lines.push(GENERATED, '');
  return lines.join('\n');
}

// c: {name, folder, check}; from may be null (no copy yet). -> { branch, steps: string[], commands }
// commands run in order; WORKTREE in an argv is replaced by the path `wt new` prints. argv null = a note, nothing to run.
export function planSync(c, from, to, { display = false } = {}) {
  validate(c, ...(from ? [from, to] : [to]));
  const branch = `kit-sync-${to}`, wt = WORKTREE;
  const subject = `chore: sync appliance-ui kit to v${to}`;
  const git = (...a) => ({ text: ['git', '-C', wt, ...a.map(x => /\s/.test(x) ? JSON.stringify(x) : x)].join(' '), argv: ['git', '-C', wt, ...a] });
  const commands = [
    { text: `wt new ${c.name} ${branch}`, argv: ['wt', 'new', c.name, branch], capture: true },
    { text: `node scripts/sync.mjs ${wt} --dir ${c.folder}${display ? ' --display' : ''}`,
      argv: [process.execPath, path.join(root, 'scripts/sync.mjs'), wt, '--dir', c.folder, ...(display ? ['--display'] : [])] },
    c.check
      ? { text: `in ${wt}: ${c.check}`, argv: c.check.trim().split(/\s+/), cwd: wt }
      : { text: NO_CHECK, argv: null },
    git('add', '--', c.folder),
    { text: `git -C ${wt} commit -m ${JSON.stringify(subject)} -m ${JSON.stringify(COAUTHOR)}`,
      argv: ['git', '-C', wt, 'commit', '-m', subject, '-m', COAUTHOR] },
    git('push', '-u', 'origin', branch),
    { text: `in ${wt}: gh pr create --base main --head ${branch} --title ${JSON.stringify(subject)} --body-file <body>`,
      argv: ['gh', 'pr', 'create', '--base', 'main', '--head', branch, '--title', subject, '--body-file', '<body>'], cwd: wt },
  ];
  return { branch, steps: commands.map(x => x.text), commands };
}

const run = (argv, cwd) => spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

// -> exit code. io: { out, err, copied(dir) -> version | null, newer(a, b) }
export function runSyncPr({ repo, dir, display, dryRun, version, io }) {
  const { out, err, copied, newer } = io;
  const name = path.basename(path.resolve(repo));
  let consumers;
  try { consumers = JSON.parse(fs.readFileSync(path.join(root, 'consumers.json'), 'utf8')); } catch { consumers = []; }
  const known = consumers.find(x => x.name === name);
  const c = { name, folder: dir, check: known?.check ?? null };
  const kit = known?.kit ?? (display ? 'display' : null);
  let from = copied(path.join(repo, dir));
  if (from && newer(from, version)) { err(`${path.join(repo, dir)} has v${from}, newer than this v${version}; not replacing it.`); return 2; }
  let plan;
  try { plan = planSync(c, from, version, { display }); } catch (e) { if (e.usage) { err(e.message); return 64; } throw e; }
  if (dryRun) { plan.steps.forEach((s, i) => out(`${i + 1}. ${s}`)); return 0; }
  if (from === version) { out(`${name} already has v${version}; nothing to sync.`); return 0; }
  if (!fs.existsSync(path.join(root, 'dist/tokens.css'))) { err('Run npm run build first.'); return 1; }

  let worktree = null, body = null;
  try {
    for (const cmd of plan.commands) {
      out(`> ${cmd.text.replace(WORKTREE, worktree ?? WORKTREE)}`);
      if (!cmd.argv) continue;
      const argv = cmd.argv.map(a => a === WORKTREE ? worktree : a);
      if (body === null && argv.includes('<body>')) {
        const entries = from ? releasesBetween(parseChangelog(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')), from, version) : [];
        body = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kit-sync-')), 'body.md');
        fs.writeFileSync(body, buildPrBody({ name, from, to: version, entries, check: c.check, kit }));
        argv[argv.indexOf('<body>')] = body;
      }
      const r = run(argv, cmd.cwd ? worktree : undefined);
      if (r.error || r.status !== 0) { err(`${cmd.text} failed${r.error ? `: ${r.error.message}` : ` (exit ${r.status})`}; no PR opened.`); return r.status === 2 ? 2 : 1; }
      if (cmd.capture) {
        worktree = r.stdout.split('\n').map(l => l.trim()).filter(Boolean).pop();
        if (!worktree || !fs.statSync(worktree, { throwIfNoEntry: false })?.isDirectory()) { err(`wt new did not print a worktree path; no PR opened.`); return 1; }
        const have = copied(path.join(worktree, dir));
        if (have && newer(have, version)) { err(`${path.join(worktree, dir)} has v${have}, newer than this v${version}; not replacing it.`); return 2; }
        from = have;  // the copy main really has: the PR body names the releases from it to this kit
        if (have === version) { out(`${name}'s main already has v${version}; nothing to sync (remove ${worktree}).`); return 0; }
      }
      if (cmd.argv.includes('gh')) out(String(r.stdout).trim());
    }
  } finally {
    if (body) fs.rmSync(path.dirname(body), { recursive: true, force: true });
  }
  return 0;
}
