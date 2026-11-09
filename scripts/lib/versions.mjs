// One version compare for sync.mjs and the drift check. Versions are strictly major.minor.patch.
export const parseVersion = v => (typeof v === 'string' && /^\d+\.\d+\.\d+$/.test(v) ? v.split('.').map(Number) : null);

export function compareVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) throw new Error(`not a version: ${!x ? a : b}`);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

// False when either side is not a version, so a damaged VERSION file never blocks a copy.
export const newer = (a, b) => parseVersion(a) && parseVersion(b) ? compareVersions(a, b) === 1 : false;
