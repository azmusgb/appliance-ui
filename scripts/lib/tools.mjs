// tools.json → tools.js (ESM, for Pi Hub and Local AI) and tools.h (C, for the Workshop display, step 8).
// check() returns every problem with the registry; build.mjs refuses to write anything while there is one.
// The five areas of pages.json (Pi Hub A22 2.2), and `assistant` for the Assistant and what is reached through it.
export const AREAS = ['home', 'assistant', 'workshop', 'household', 'network', 'system'];
const ID = /^[a-z][a-z0-9]*$/;
const TEXT = /^[\x20-\x7e]+$/;  // printable ASCII: safe in a JS and a C string literal as JSON writes it
const FIELDS = ['id', 'name', 'host', 'via', 'area', 'purpose', 'boundary', 'external', 'base', 'retired'];
// The site itself, the Assistant's door and the display's two machine addresses: on no page's "Open in" row (A22 3.4).
export const EXEMPT = ['hub', 'assistant', 'display', 'ota'];

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
    if (t.external !== undefined && t.external !== true) errors.push(`${at}: external can only be true`);
    if (t.base !== undefined && t.external !== true) errors.push(`${at}: base is only for an outside tool`);
    if (t.base !== undefined && (typeof t.base !== 'string' || !/^\/[\x21-\x7e]*$/.test(t.base) || t.base.endsWith('/'))) errors.push(`${at}: base must start with / and not end with one`);
    if (t.retired !== undefined && t.retired !== true) errors.push(`${at}: retired can only be true`);
    if (t.via !== undefined) {
      // Reached through the Assistant's own origin (n8n, ComfyUI on the PC): a path there, and no host of its own.
      if (t.host !== undefined) errors.push(`${at}: a tool has a host or a via, not both`);
      if (typeof t.via !== 'string' || !/^\/go\/[a-z0-9-]+$/.test(t.via)) errors.push(`${at}: via must be /go/<name>`);
      if (t.area !== 'assistant') errors.push(`${at}: a tool reached through the Assistant is in the assistant area`);
      for (const k of ['external', 'base', 'boundary']) if (t[k] !== undefined) errors.push(`${at}: a via tool has no ${k}`);
      if (!reg.tools.some(a => a && a.id === 'assistant' && a.host)) errors.push(`${at}: via needs the assistant tool and its host`);
    } else if (t.host === undefined) {
      errors.push(`${at}: a tool needs a host or a via`);
    } else if (t.external === true) {
      // A tool that isn't behind the house's gate: another company's web app, shown by name, never given a house name.
      if (t.boundary !== undefined) errors.push(`${at}: an outside tool has no boundary`);
      if (typeof t.host !== 'string' || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(t.host) || t.host.endsWith(`.${reg.real}`) || t.host.endsWith('home.arpa')) {
        errors.push(`${at}: an outside host is not on the real name or home.arpa`);
      }
    } else if (t.boundary === undefined) {
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
// A tool marked external is not behind the house's gate (Plex's own web app); its host and base are another company's.
// A tool with via is reached through the Assistant's origin at that path. A retired tool is still listed, and linked from nowhere but the Site map.
// toolsFor(area) is an area's tools, without the display's D4 hosts (machine-facing, not for people) and the retired ones.
// A page's own "Open in …↗" row is its tools in pages.js.
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
  if (!t) return null;
  if (t.via !== undefined) return \`https://\${BY_ID.get('assistant').host}\${t.via}\`;   // the Assistant sends it on; it takes no path
  const rest = String(path ?? '').replace(/^\\/+/, '');
  if (t.base === undefined) return \`https://\${t.host}/\${rest}\`;   // an outside tool keeps its own path: no trailing slash unless asked
  return \`https://\${t.host}\${t.base}\${rest ? \`/\${rest}\` : ''}\`;
}

export function toolsFor(area) {
  return TOOLS.filter((t) => t.area === area && !t.boundary && !t.retired);
}
`;
}

export function toolsH(reg, banner) {
  const name = t => t.id.toUpperCase();
  return [`// ${banner}`, '#pragma once', '// The house\'s tools: host and name per tool. D4 marks the display\'s home.arpa boundary.',
    `#define UI_REAL ${JSON.stringify(reg.real)}`,
    ...reg.tools.flatMap(t => [
      ...(t.via === undefined ? [`#define UI_TOOL_${name(t)}_HOST ${JSON.stringify(t.host)}`] : [`#define UI_TOOL_${name(t)}_VIA ${JSON.stringify(t.via)}`]),
      `#define UI_TOOL_${name(t)}_NAME ${JSON.stringify(t.name)}`,
      ...(t.boundary ? [`#define UI_TOOL_${name(t)}_BOUNDARY ${JSON.stringify(t.boundary)}`] : []),
    ]),
    `#define UI_TOOL_COUNT ${reg.tools.length}`, ''].join('\n');
}
