// Pi Hub amendment A22, 3.5 and section 8: one name per thing. No two pages share a label anywhere on the site, a label
// is sentence case (8's proper names are the only exceptions), and none is a retired word (8.6).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const list = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8'));

// Section 8's proper names, which keep their capitals. "Pi" (the computer, in Settings' "The Pi") and "n8n" (a product
// whose name starts lower-case) are the two this list adds; a tool keeps its product name (A6 decision 10).
const PROPER = ['Quick Print', 'Agent World', 'Claude Code', 'Atlas', 'PowerShell', 'Pi Hub', 'Pi', 'n8n'];
// 8.6, as page labels.
const RETIRED = ['Documents', 'Media', 'Home & network', 'Devices', 'Network', 'Storage', 'Setup', 'Inbox', 'Backlog', 'Doing', 'Architecture',
  'Status', 'Tools', 'Local AI', 'More'];
// The one label that is said twice: Settings' second group is "Home" (A22 3.3 lists the groups by the names
// settings.js gives them today), under Settings, where the start page is "Home" on its own. Adding to this list is a
// naming decision, not a fix.
const SAID_TWICE = { 'settings-home': 'home' };

function sentenceCase(label) {
  let rest = label;
  for (const name of PROPER) rest = rest.split(name).join('x'.repeat(name.length));
  return /^[A-Zx]/.test(rest) && !/[A-Z]/.test(rest.slice(1));
}

test('no two pages share a label anywhere on the site', () => {
  const first = new Map();
  for (const p of list.pages) {
    const other = first.get(p.label);
    if (other === undefined) { first.set(p.label, p.id); continue; }
    assert.equal(SAID_TWICE[p.id], other, `"${p.label}" is the label of ${other} and of ${p.id}`);
  }
  for (const [id, other] of Object.entries(SAID_TWICE)) {
    const a = list.pages.find(p => p.id === id), b = list.pages.find(p => p.id === other);
    assert.ok(a && b && a.label === b.label && a.parent, `${id}: the exception is still needed, and still a view under another page`);
  }
});

test('no two areas share a label, and only Home is both an area and a page', () => {
  const areas = list.areas.map(a => a.label);
  assert.equal(new Set(areas).size, areas.length);
  const both = list.pages.filter(p => areas.includes(p.label) && !p.parent).map(p => p.label);
  assert.deepEqual(both, ['Home'], 'the page that was called Network is Internet, so no other page shares an area\'s name (A22 2.2)');
});

test('every label is sentence case; section 8\'s proper names keep their capitals', () => {
  for (const x of [...list.areas, ...list.pages]) assert.ok(sentenceCase(x.label), `${x.id}: "${x.label}"`);
  assert.equal(sentenceCase('Site map'), true);
  assert.equal(sentenceCase('Quick Print'), true);
  assert.equal(sentenceCase('n8n workflows'), true);
  assert.equal(sentenceCase('Site Map'), false);
  assert.equal(sentenceCase('site map'), false);
  assert.equal(sentenceCase('Print Lab'), false);
  assert.equal(sentenceCase('PRINT'), false);
});

test('no label is a retired word (8.6)', () => {
  for (const p of list.pages) {
    assert.ok(!RETIRED.includes(p.label), `${p.id}: "${p.label}" is retired`);
    assert.ok(!p.label.includes('Local AI'), `${p.id}: "Local AI" is the software's name, not a page's`);
  }
});

test('the names section 8.1 settled are the labels', () => {
  const label = Object.fromEntries(list.pages.map(p => [p.id, p.label]));
  for (const [id, name] of Object.entries({
    wall: 'Wall display', printer: 'Printer', papers: 'Papers', movies: 'Movies', drives: 'Drives', lights: 'Lights', internet: 'Internet',
    health: 'Health', settings: 'Settings', 'assistant-automations': 'Assistant automations', 'assistant-system': 'Assistant', status: 'Assistant status',
    'assistant-settings': 'Assistant settings', ask: 'Ask', decisions: 'Decisions', changes: 'Changes',
    atlas: 'Atlas', 'claude-code': 'Claude Code', 'lab-tools': 'Lab tools', 'developer-tools': 'Developer tools',
  })) assert.equal(label[id], name, id);
});

test('a purpose is one short line that never calls the Assistant "Local AI"', () => {
  for (const p of list.pages.filter(x => x.purpose)) {
    assert.ok(!p.purpose.includes('Local AI'), `${p.id}: ${p.purpose}`);
    assert.ok(p.purpose.length <= 100, `${p.id}: ${p.purpose.length} characters`);
  }
});
