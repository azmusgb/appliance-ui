// Says where one consumer's kit copy stands against the kit. Pure: the caller does the reading and the fetching.
import { parseVersion, compareVersions } from './versions.mjs';
import { releasesBetween } from './changelog.mjs';

// input: { copyVersion: string | null, kitVersion: string, kit: 'web' | 'display' | undefined, modified: string[], unreachable: boolean }
// kit is the consumer's kit; a needs-change release for the other kit is skippable here. No kit: nothing is skipped that way.
// log: what parseChangelog returns.
// -> { state, exit, line }. Exit is 1 only for a modified copy, an unknown copy, or a copy behind across a release
// that needs a consumer change.
export function classifyCopy({ copyVersion, kitVersion, kit, modified, unreachable }, log) {
  const result = (state, exit, line) => ({ state, exit, line });
  if (unreachable) return result('unreachable', 0, `unknown: could not reach the consumer (kit ${kitVersion})`);
  if (!parseVersion(copyVersion)) {
    const found = copyVersion == null ? 'no VERSION file' : `VERSION "${copyVersion}" is not a version`;
    return result('unknown-copy', 1, `unknown copy: ${found} (kit ${kitVersion})`);
  }
  if (modified.length) {
    return result('modified', 1, `modified: copy ${copyVersion}, kit ${kitVersion}; edited here: ${modified.join(', ')}`);
  }
  const order = compareVersions(copyVersion, kitVersion);
  if (order === 0) return result('current', 0, `current at ${kitVersion}`);
  if (order > 0) return result('ahead', 0, `ahead: copy ${copyVersion}, kit ${kitVersion}`);
  const releases = releasesBetween(log, copyVersion, kitVersion);
  const needs = releases.filter(r => r.skip === false && (!kit || r.audience === 'all' || r.audience === kit));
  if (needs.length) {
    const first = needs[0];
    const names = needs.map(r => r.version).join(', ');
    const note = first.note ? `; first: ${first.note}` : '';
    return result('behind-needs-change', 1, `behind: copy ${copyVersion}, kit ${kitVersion}; ${names} ${needs.length === 1 ? 'needs' : 'need'} a consumer change${note}`);
  }
  if (releases.some(r => r.skip === null)) {
    return result('unclassified', 0, `behind: copy ${copyVersion}, kit ${kitVersion}; some releases between are not classified`);
  }
  return result('behind-skippable', 0, `behind: copy ${copyVersion}, kit ${kitVersion}; no release between needs a change here`);
}
