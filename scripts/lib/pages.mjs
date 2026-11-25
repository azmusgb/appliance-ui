// pages.json → pages.json and pages.js in dist/ (Pi Hub amendment A22, section 3: the one list of the site's pages).
// checkPages() returns every problem with the list; build.mjs refuses to write anything while there is one.
import { EXEMPT } from './tools.mjs';

export const SYSTEMS = ['hub', 'assistant', 'mac'];
export const ROLES = ['page', 'tab', 'filter', 'mode', 'detail', 'ambient', 'standalone'];
// The Assistant's five sections (A22 3.3). Their names are drawn with the Assistant's frame (brief 4), not from here yet.
export const SECTIONS = ['ask', 'work', 'projects', 'improve'];
const WAYS = ['rail', 'strip', 'tabs', 'chips', 'button', 'foot', 'palette', 'map'];
const FIELDS = ['id', 'system', 'area', 'section', 'label', 'purpose', 'path', 'role', 'parent', 'view', 'reach', 'aliases', 'tools', 'cards', 'needs', 'drawn', 'built'];
const CARD_FIELDS = ['id', 'label', 'purpose', 'path', 'view'];
const REDIRECT_FIELDS = ['id', 'path', 'to', 'stage', 'card'];
// The stages of a change (A27 D2): a redirect to Changes may name the one to filter by.
export const STAGES = ['backlog', 'in-progress', 'shipped'];
const AREA_FIELDS = ['id', 'label', 'order', 'landing'];
const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const TEXT = /^[\x20-\x7e]+$/;  // printable ASCII, as tools.json: safe wherever a consumer writes it
const HUB_PATH = /^\/([a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*)?(#[a-z0-9]+(-[a-z0-9]+)*)?$/;
const ASSISTANT_PATH = /^\/assistant(\/([a-z0-9]+(-[a-z0-9]+)*|<[a-z]+>))*$/;
const ALIAS = /^\/[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;
// What each role must have in reach (3.2's table). A page's rule is below: its strip, or the rail when it is its area's only page.
const MUST = { tab: 'tabs', filter: 'chips', mode: 'button', ambient: 'foot' };
// An area's strip holds six pages at most; System keeps eight (A22 2.2, A27 D3 adds the Assistant's admin page).
const stripCap = area => (area === 'system' ? 8 : 6);
// A row whose address needs a value filled in (a run's id) can't be a ⌘K entry or a Site map row.
const template = p => typeof p.path === 'string' && p.path.includes('<');

export function checkPages(list, registry) {
  const errors = [];
  if (!list || typeof list !== 'object') return ['pages.json: not an object'];
  for (const k of Object.keys(list)) if (!['$comment', 'version', 'areas', 'pages', 'redirects'].includes(k)) errors.push(`unknown field ${k}`);
  if (list.version !== 1) errors.push('version: must be 1');
  if (!Array.isArray(list.areas) || !list.areas.length) return [...errors, 'areas: a non-empty list is required'];
  if (!Array.isArray(list.pages) || !list.pages.length) return [...errors, 'pages: a non-empty list is required'];

  const pages = list.pages.filter(p => p && typeof p === 'object');
  const byId = new Map();
  list.pages.forEach((p, i) => {
    const at = `pages[${i}]${p && typeof p.id === 'string' ? ` (${p.id})` : ''}`;
    if (!p || typeof p !== 'object') { errors.push(`${at}: not an object`); return; }
    for (const k of Object.keys(p)) if (!FIELDS.includes(k)) errors.push(`${at}: unknown field ${k}`);
    if (typeof p.id !== 'string' || !ID.test(p.id)) errors.push(`${at}: id must match ${ID}`);
    else if (byId.has(p.id)) errors.push(`${at}: duplicate id ${p.id}`);
    else byId.set(p.id, p);
  });

  const areaIds = new Set();
  list.areas.forEach((a, i) => {
    const at = `areas[${i}]${a && typeof a.id === 'string' ? ` (${a.id})` : ''}`;
    if (!a || typeof a !== 'object') { errors.push(`${at}: not an object`); return; }
    for (const k of Object.keys(a)) if (!AREA_FIELDS.includes(k)) errors.push(`${at}: unknown field ${k}`);
    if (typeof a.id !== 'string' || !ID.test(a.id) || a.id === 'assistant') errors.push(`${at}: id must match ${ID}, and assistant is not a rail area`);
    else if (areaIds.has(a.id)) errors.push(`${at}: duplicate id ${a.id}`);
    else areaIds.add(a.id);
    if (typeof a.label !== 'string' || !TEXT.test(a.label)) errors.push(`${at}: label must be printable ASCII text`);
    if (a.order !== i + 1) errors.push(`${at}: order must be ${i + 1}: the areas are listed in the rail's order`);
    const landing = byId.get(a.landing);
    if (!landing || landing.role !== 'page' || landing.area !== a.id || landing.system !== 'hub') errors.push(`${at}: landing must be a hub page of this area`);
    else if (!Array.isArray(landing.reach) || !landing.reach.includes('rail')) errors.push(`${at}: its landing (${a.landing}) must have rail in reach`);
    const strip = pages.filter(p => p.area === a.id && p.role === 'page' && Array.isArray(p.reach) && p.reach.includes('strip'));
    if (strip.length > stripCap(a.id)) errors.push(`${at}: its strip has ${strip.length} pages, more than ${stripCap(a.id)}`);
  });
  const landings = new Set(list.areas.map(a => a && a.landing));

  const tools = new Map((registry?.tools || []).map(t => [t.id, t]));
  const offered = t => !t.retired && !t.boundary && !EXEMPT.includes(t.id);
  const onAPage = new Set();
  const aliasOf = new Map();
  const paths = new Map();

  list.pages.forEach((p, i) => {
    if (!p || typeof p !== 'object') return;
    const at = `pages[${i}]${typeof p.id === 'string' ? ` (${p.id})` : ''}`;
    const reach = Array.isArray(p.reach) ? p.reach : [];
    if (!SYSTEMS.includes(p.system)) errors.push(`${at}: system must be one of ${SYSTEMS.join(', ')}`);
    if (!ROLES.includes(p.role)) errors.push(`${at}: role must be one of ${ROLES.join(', ')}`);
    if (typeof p.label !== 'string' || !TEXT.test(p.label)) errors.push(`${at}: label must be printable ASCII text`);
    if (p.purpose !== undefined && (typeof p.purpose !== 'string' || !TEXT.test(p.purpose) || p.purpose.endsWith('.'))) errors.push(`${at}: purpose must be one line of printable ASCII text, without a full stop`);
    if (p.purpose === undefined && p.system === 'hub' && ['page', 'ambient', 'standalone'].includes(p.role)) errors.push(`${at}: a page needs its one-line purpose`);
    if (p.built !== undefined && p.built !== false) errors.push(`${at}: built can only be false`);
    if (p.drawn !== undefined && (p.drawn !== 'hub' || p.system !== 'assistant')) errors.push(`${at}: drawn can only be "hub", on an Assistant page`);
    if (p.drawn !== undefined && p.needs !== 'pc') errors.push(`${at}: a drawn page keeps needs: pc (its actions and live data still need the workstation)`);

    // Where it lives.
    if (p.system === 'hub') {
      if (typeof p.path !== 'string' || !HUB_PATH.test(p.path)) errors.push(`${at}: path must be a Pi Hub address`);
      if (p.role === 'standalone' ? p.area !== undefined : !areaIds.has(p.area)) errors.push(`${at}: area must be one of ${[...areaIds].join(', ')} (a standalone page has none)`);
      for (const k of ['section', 'view', 'needs']) if (p[k] !== undefined) errors.push(`${at}: a hub page has no ${k}`);
    } else if (p.system === 'assistant') {
      if (typeof p.path !== 'string' || !ASSISTANT_PATH.test(p.path)) errors.push(`${at}: path must be under /assistant`);
      // The admin pages (A27 D3) are drawn in Pi Hub's System area; every other Assistant page is in the Assistant's own sections.
      if (!['assistant', 'system'].includes(p.area)) errors.push(`${at}: an Assistant page's area is assistant, or system for the admin pages`);
      if (p.needs !== 'pc') errors.push(`${at}: an Assistant page needs the PC (needs: pc)`);
      if (!template(p)) {
        if (p.area === 'system' ? p.section !== undefined : !SECTIONS.includes(p.section)) errors.push(p.area === 'system' ? `${at}: an Assistant page in System has no section` : `${at}: section must be one of ${SECTIONS.join(', ')}`);
        if (typeof p.view !== 'string' || !/^[a-z][A-Za-z0-9]*$/.test(p.view)) errors.push(`${at}: view must be the Assistant's own view id`);
      }
    } else if (p.system === 'mac') {
      if (p.needs !== 'mac') errors.push(`${at}: a page served from the Mac needs the Mac (needs: mac)`);
      for (const k of ['path', 'area', 'section', 'view']) if (p[k] !== undefined) errors.push(`${at}: a page served from the Mac has no ${k} here`);
    }

    // Every visible way in.
    if (!Array.isArray(p.reach) || !p.reach.length) errors.push(`${at}: reach must list every visible way in`);
    for (const way of reach) {
      if (typeof way === 'string' && way.startsWith('card:')) {
        if (!byId.has(way.slice(5))) errors.push(`${at}: ${way} names no page`);
      } else if (!WAYS.includes(way)) errors.push(`${at}: unknown way in ${JSON.stringify(way)}`);
    }
    if (new Set(reach).size !== reach.length) errors.push(`${at}: reach repeats a way in`);
    if (!template(p)) for (const way of ['palette', 'map']) if (!reach.includes(way)) errors.push(`${at}: every page has ${way} in reach, so none is reachable only by knowing its address`);
    if (reach.includes('rail') && !landings.has(p.id)) errors.push(`${at}: only an area's landing page is in the rail`);
    if (p.role === 'page') {
      const alone = p.system === 'hub' && !pages.some(q => q !== p && q.role === 'page' && q.area === p.area);
      if (!reach.includes('strip') && !(alone && reach.includes('rail'))) errors.push(`${at}: a page must have strip in reach`);
    } else if (MUST[p.role]) {
      if (!reach.includes(MUST[p.role])) errors.push(`${at}: ${p.role === 'ambient' ? 'an' : 'a'} ${p.role} must have ${MUST[p.role]} in reach`);
    } else if (p.role === 'detail') {
      if (!reach.some(way => typeof way === 'string' && way.startsWith('card:'))) errors.push(`${at}: a detail must name the page whose card opens it (card:<id>)`);
    } else if (p.role === 'standalone') {
      if (!reach.includes('foot') && !reach.includes('map')) errors.push(`${at}: a standalone page must have foot or map in reach`);
    }

    // The page it is a view of.
    const parent = byId.get(p.parent);
    if (['tab', 'filter', 'mode'].includes(p.role) && p.parent === undefined) errors.push(`${at}: a ${p.role} needs a parent`);
    if (['page', 'ambient', 'standalone'].includes(p.role) && p.parent !== undefined) errors.push(`${at}: a ${p.role} has no parent`);
    if (p.parent !== undefined) {
      if (!parent || parent === p) errors.push(`${at}: parent ${JSON.stringify(p.parent)} names no other page`);
      else {
        if (parent.system !== p.system) errors.push(`${at}: its parent is on another system`);
        if (['tab', 'filter', 'mode'].includes(p.role) && parent.role !== 'page') errors.push(`${at}: the parent of a ${p.role} is a page`);
        if (p.role === 'detail' && !['page', 'tab'].includes(parent.role)) errors.push(`${at}: the parent of a detail is a page or a tab`);
      }
    }

    // Addresses: one row per address, except a page and its first tab.
    if (typeof p.path === 'string') {
      const first = paths.get(p.path);
      if (!first) paths.set(p.path, p);
      else {
        const firstTab = pages.find(q => q.role === 'tab' && q.parent === first.id);
        if (!(first.role === 'page' && firstTab === p)) errors.push(`${at}: path ${p.path} is already ${first.id}'s; only a page and its first tab share one`);
      }
    }
    if (p.aliases !== undefined) {
      if (p.system !== 'hub' || !Array.isArray(p.aliases) || !p.aliases.length) errors.push(`${at}: aliases is a non-empty list of old Pi Hub addresses`);
      else for (const a of p.aliases) {
        if (typeof a !== 'string' || !ALIAS.test(a)) errors.push(`${at}: alias ${JSON.stringify(a)} must be a plain path`);
        else if (aliasOf.has(a)) errors.push(`${at}: alias ${a} is already ${aliasOf.get(a)}'s`);
        else aliasOf.set(a, p.id);
      }
    }

    // Its "Open in" row.
    if (p.tools !== undefined) {
      if (!Array.isArray(p.tools) || !p.tools.length) errors.push(`${at}: tools is a non-empty list of tool ids`);
      else for (const id of p.tools) {
        const t = tools.get(id);
        if (!t) errors.push(`${at}: tools names ${JSON.stringify(id)}, which is not in tools.json`);
        else if (!offered(t)) errors.push(`${at}: ${id} is retired, a machine address or the site itself, and is on no page's "Open in" row`);
        else onAPage.add(id);
      }
    }
  });

  for (const [alias, id] of aliasOf) if (paths.has(alias)) errors.push(`alias ${alias} (${id}) is also ${paths.get(alias).id}'s address`);
  for (const p of pages) {
    const kids = pages.filter(q => q.role === 'tab' && q.parent === p.id);
    if (kids.length > 6) errors.push(`${p.id}: ${kids.length} tabs, more than six`);
  }
  // Cards (A27 D1): a tool that opens in place on its page is no page of its own, so it has no row and no way in of its own.
  const cardPaths = new Map();
  for (const p of pages) {
    if (p.cards === undefined) continue;
    const at = `${p.id}: cards`;
    if (!Array.isArray(p.cards) || !p.cards.length) { errors.push(`${at} is a non-empty list`); continue; }
    if (p.system !== 'assistant') errors.push(`${at} are only for an Assistant page`);
    const seen = new Set();
    for (const c of p.cards) {
      if (!c || typeof c !== 'object') { errors.push(`${at}: not an object`); continue; }
      for (const k of Object.keys(c)) if (!CARD_FIELDS.includes(k)) errors.push(`${at} (${c.id}): unknown field ${k}`);
      if (typeof c.id !== 'string' || !ID.test(c.id)) errors.push(`${at}: id must match ${ID}`);
      else if (seen.has(c.id)) errors.push(`${at}: duplicate id ${c.id}`);
      else seen.add(c.id);
      for (const k of ['label', 'purpose']) if (typeof c[k] !== 'string' || !TEXT.test(c[k]) || c[k].endsWith('.')) errors.push(`${at} (${c.id}): ${k} must be one line of printable ASCII text, without a full stop`);
      if (typeof c.path !== 'string' || !ASSISTANT_PATH.test(c.path)) errors.push(`${at} (${c.id}): path must be under /assistant`);
      else if (paths.has(c.path) || aliasOf.has(c.path) || cardPaths.has(c.path)) errors.push(`${at} (${c.id}): path ${c.path} is already an address`);
      else cardPaths.set(c.path, c);
      if (typeof c.view !== 'string' || !/^[a-z][A-Za-z0-9]*$/.test(c.view)) errors.push(`${at} (${c.id}): view must be the Assistant's own view id`);
    }
  }

  // Redirects (A27 D1 to D3): a retired page id keeps resolving, to a page, a stage of Changes or a card, so no link or Needs link breaks.
  const redirected = new Set();
  const redirectPaths = new Set();
  if (list.redirects !== undefined && !Array.isArray(list.redirects)) errors.push('redirects: must be a list');
  else (list.redirects || []).forEach((r, i) => {
    const at = `redirects[${i}]${r && typeof r.id === 'string' ? ` (${r.id})` : ''}`;
    if (!r || typeof r !== 'object') { errors.push(`${at}: not an object`); return; }
    for (const k of Object.keys(r)) if (!REDIRECT_FIELDS.includes(k)) errors.push(`${at}: unknown field ${k}`);
    if (typeof r.id !== 'string' || !ID.test(r.id)) errors.push(`${at}: id must match ${ID}`);
    else if (byId.has(r.id)) errors.push(`${at}: ${r.id} is still a page, so it is no redirect`);
    else if (redirected.has(r.id)) errors.push(`${at}: duplicate redirect ${r.id}`);
    else redirected.add(r.id);
    const to = byId.get(r.to);
    if (!to) { errors.push(`${at}: to names no page`); return; }
    if (r.stage !== undefined && !(r.to === 'changes' && STAGES.includes(r.stage))) errors.push(`${at}: stage is one of ${STAGES.join(', ')}, and only for a redirect to changes`);
    if (r.card !== undefined && !(Array.isArray(to.cards) && to.cards.some(c => c.id === r.card))) errors.push(`${at}: card ${JSON.stringify(r.card)} is no card of ${r.to}`);
    if (r.path !== undefined) {
      if (typeof r.path !== 'string' || !ASSISTANT_PATH.test(r.path)) errors.push(`${at}: path must be under /assistant`);
      else if (paths.has(r.path) || aliasOf.has(r.path) || redirectPaths.has(r.path)) errors.push(`${at}: path ${r.path} is a live address, so it needs no redirect`);
      else redirectPaths.add(r.path);
    }
  });

  for (const t of tools.values()) if (offered(t) && !onAPage.has(t.id)) errors.push(`tools.json: ${t.id} is on no page's "Open in" row (retire it, or name it in a page's tools)`);
  return errors;
}

// The list as each app gets it: without the comment, in a fixed key order.
const row = (o, fields) => Object.fromEntries(fields.filter(k => o[k] !== undefined).map(k => [k, o[k]]));
export const built = list => ({ version: list.version, areas: list.areas.map(a => row(a, AREA_FIELDS)), pages: list.pages.map(p => row(p, FIELDS)), redirects: (list.redirects || []).map(r => row(r, REDIRECT_FIELDS)) });

export function pagesJson(list) {
  return JSON.stringify(built(list), null, 1) + '\n';
}

export function pagesJs(list, banner) {
  const b = built(list);
  return `// ${banner}
// The site's pages (Pi Hub amendment A22, section 3): AREAS in the rail's order, PAGES in the list's order, page(id).
// A page's label, purpose and path are written in pages.json and nowhere else. Its tools are ids in tools.js.
// A row with built: false is a page a later step builds: draw nothing for it yet. redirect(id) answers a retired id.
export const AREAS = Object.freeze([
${b.areas.map(a => `  Object.freeze(${JSON.stringify(a)}),`).join('\n')}
]);
const deep = (p) => Object.freeze(Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? Object.freeze(v.map((x) => (x && typeof x === 'object' ? Object.freeze(x) : x))) : v])));
export const PAGES = Object.freeze([
${b.pages.map(p => `  deep(${JSON.stringify(p)}),`).join('\n')}
]);
// A retired page id and where it goes now (a page, a stage of Changes with stage, or a card of its page with card).
export const REDIRECTS = Object.freeze([
${b.redirects.map(r => `  Object.freeze(${JSON.stringify(r)}),`).join('\n')}
]);
const BY_ID = new Map(PAGES.map((p) => [p.id, p]));
const REDIRECT_BY_ID = new Map(REDIRECTS.map((r) => [r.id, r]));

export function page(id) {
  return BY_ID.get(id) || null;
}

export function redirect(id) {
  return REDIRECT_BY_ID.get(id) || null;
}
`;
}
