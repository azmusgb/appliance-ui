// tools.json → tools.js (ESM, for Pi Hub and Local AI) and tools.h (C, for the Workshop display, step 8).
// check() returns every problem with the registry; build.mjs refuses to write anything while there is one.
export const AREAS = ['home', 'assistant', 'workshop', 'documents', 'media', 'network', 'system'];
const ID = /^[a-z][a-z0-9]*$/;
const TEXT = /^[\x20-\x7e]+$/;  // printable ASCII: safe in a JS and a C string literal as JSON writes it
const FIELDS = ['id', 'name', 'host', 'area', 'purpose', 'boundary'];

export function check(reg) {
  const errors = [];
  if (!reg || typeof reg.real !== 'string' || !/^[a-z0-9.-]+$/.test(reg.real)) errors.push('real: a lower-case domain is required');
  if (!Array.isArray(reg?.tools) || !reg.tools.length) return [...errors, 'tools: a non-empty list is required'];
  const seen = new Set();
  reg.tools.forEach((t, i) => {
    const at = `tools[${i}]${t && typeof t.id === 'string' ? ` (${t.id})` : ''}`;
    if (!t || typeof t !== 'object') { errors.push(`${at}: not an object`); return; }
    for (const k of Object.keys(t)) if (!FIELDS.includes(k)) errors.push(`${at}: unknown field ${k}`);
    if (typeof t.id !== 'string' || !ID.test(t.id)) errors.push(`${at}: id must match ${ID}`);
    else if (seen.has(t.id)) errors.push(`${at}: duplicate id ${t.id}`);
    else seen.add(t.id);
    for (const k of ['name', 'purpose']) if (typeof t[k] !== 'string' || !TEXT.test(t[k])) errors.push(`${at}: ${k} must be printable ASCII text`);
    if (!AREAS.includes(t.area)) errors.push(`${at}: area must be one of ${AREAS.join(', ')}`);
    if (t.boundary === undefined) {
      if (t.host !== `${t.id}.${reg.real}`) errors.push(`${at}: host must be ${t.id}.${reg.real}`);
    } else if (t.boundary !== 'D4') {
      errors.push(`${at}: boundary can only be "D4"`);
    } else if (typeof t.host !== 'string' || !/^[a-z0-9-]+\.home\.arpa$/.test(t.host)) {
      errors.push(`${at}: a D4 host stays on home.arpa`);
    }
  });
  return errors;
}

// Entries in a fixed key order, so the generated files are the same whatever order tools.json uses.
const entry = t => Object.fromEntries(FIELDS.filter(k => t[k] !== undefined).map(k => [k, t[k]]));

export function toolsJs(reg, banner) {
  return `// ${banner}
// The house's tools: TOOLS lists them; toolUrl(id, path) gives a link, or null for an id that isn't one.
// toolsFor(area) is an area's "Open in …↗" row, without the display's D4 hosts (machine-facing, not for people).
export const REAL = ${JSON.stringify(reg.real)};
export const TOOLS = Object.freeze([
${reg.tools.map(t => `  Object.freeze(${JSON.stringify(entry(t))}),`).join('\n')}
]);
const BY_ID = new Map(TOOLS.map((t) => [t.id, t]));

export function tool(id) {
  return BY_ID.get(id) || null;
}

export function toolUrl(id, path = '') {
  const t = BY_ID.get(id);
  return t ? \`https://\${t.host}/\${String(path ?? '').replace(/^\\/+/, '')}\` : null;
}

export function toolsFor(area) {
  return TOOLS.filter((t) => t.area === area && !t.boundary);
}
`;
}

export function toolsH(reg, banner) {
  const name = t => t.id.toUpperCase();
  return [`// ${banner}`, '#pragma once', '// The house\'s tools: host and name per tool. D4 marks the display\'s home.arpa boundary.',
    `#define UI_REAL ${JSON.stringify(reg.real)}`,
    ...reg.tools.flatMap(t => [
      `#define UI_TOOL_${name(t)}_HOST ${JSON.stringify(t.host)}`,
      `#define UI_TOOL_${name(t)}_NAME ${JSON.stringify(t.name)}`,
      ...(t.boundary ? [`#define UI_TOOL_${name(t)}_BOUNDARY ${JSON.stringify(t.boundary)}`] : []),
    ]),
    `#define UI_TOOL_COUNT ${reg.tools.length}`, ''].join('\n');
}
