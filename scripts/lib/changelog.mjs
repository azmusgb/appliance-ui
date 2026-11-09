// CHANGELOG.md says, per kit release, whether a consumer may skip it. One heading per release:
//   ## 2.15.0 — skippable
//   ## 2.15.0 — needs consumer change: <what to do>
//   ## 2.15.0 — needs consumer change (web): <what to do>      (or "(display)": only that kit's consumers need it)
// The first line is `<!-- classified-from: X.Y.Z -->`: releases at or below X.Y.Z were never classified.
import { parseVersion, compareVersions } from './versions.mjs';

const MARKER = /^<!--\s*classified-from:\s*(\S+)\s*-->/;
const HEADING = /^## (\S+) — (.*?)\s*$/;
const NEEDS = /^needs consumer change(?: \((web|display)\))?(?::\s*(.*))?$/;

// -> { entries: Map<version, {skip: boolean, note: string, audience: 'web' | 'display' | 'all'}>, classifiedFrom: string }
export function parseChangelog(text) {
  const lines = String(text).split(/\r?\n/);
  const marker = MARKER.exec(lines[0] ?? '');
  if (!marker || !parseVersion(marker[1])) throw new Error('CHANGELOG.md must start with <!-- classified-from: X.Y.Z -->');
  const entries = new Map();
  for (const line of lines) {
    if (!line.startsWith('## ')) continue;
    const m = HEADING.exec(line);
    if (!m || !parseVersion(m[1])) throw new Error(`changelog heading is not "## X.Y.Z — verdict": ${line}`);
    const [, version, verdict] = m;
    if (entries.has(version)) throw new Error(`changelog lists ${version} twice`);
    const needs = NEEDS.exec(verdict);
    if (verdict === 'skippable') entries.set(version, { skip: true, note: '', audience: 'all' });
    else if (needs) entries.set(version, { skip: false, note: needs[2] ?? '', audience: needs[1] ?? 'all' });
    else throw new Error(`changelog entry ${version} must say "skippable" or "needs consumer change"`);
  }
  return { entries, classifiedFrom: marker[1] };
}

// Releases after `from` up to and including `to`, ascending. skip null = unclassified: `to` has no entry yet,
// or `from` is below classified-from, so the releases it stands for were never judged.
export function releasesBetween({ entries, classifiedFrom }, from, to) {
  if (!parseVersion(from) || !parseVersion(to)) throw new Error(`not a version: ${parseVersion(from) ? to : from}`);
  const out = [...entries]
    .filter(([v]) => compareVersions(v, from) > 0 && compareVersions(v, to) <= 0)
    .sort(([a], [b]) => compareVersions(a, b))
    .map(([version, e]) => ({ version, ...e }));
  const unclassified = version => ({ version, skip: null, note: '', audience: 'all' });
  if (compareVersions(from, to) < 0 && !entries.has(to)) out.push(unclassified(to));
  if (compareVersions(from, classifiedFrom) < 0 && compareVersions(from, to) < 0) out.unshift(unclassified(from));
  return out;
}
