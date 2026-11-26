import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// package.json is "type": "module", so require() would load the classic script as ESM; run it with a CommonJS-style module.
const mod = { exports: {} };
new Function('module', fs.readFileSync(path.join(root, 'dist/needs.js'), 'utf8'))(mod);
const { PHRASES, safeLink } = mod.exports;
const here = new URL('http://10.0.0.80/home');
const resolve = l => (l === 'bambuddy' ? 'https://bambuddy.home.arpa/' : l);

test('PHRASES has the forty-seven keys and texts, with the platform terms of spec section 9, Pi Hub A22 8.4, A33 P1 and A35 M1b', () => {
  assert.deepEqual(PHRASES, {
    judge: 'Judge the print', approve: 'Approve or drop', send: 'Send it to the printer', fix_plan: 'Fix the plan',
    look: 'Look at the printer', open_bambuddy: 'Open Bambuddy', check_pc: 'Check the PC', not_answering: "{name} isn't answering",
    pc_off: 'The PC is asleep', pc_waking: 'The PC is waking up',
    assistant_down: "The Assistant isn't answering", source_down: "{name} isn't answering",
    unknown_release: 'Not reported',
    decisions_heading: 'Decisions ({n})', decisions_loading: 'Loading decisions', decisions_unreadable: "Decisions couldn't be read", decisions_stale: "Not current: couldn't refresh the decisions",
    decision_recommended: 'Recommended', decision_spec: 'Open the spec', decision_text_label: 'Your answer', decision_send: 'Send',
    decision_pending: 'Recording your answer', decision_recorded: 'Recorded: {answer}', decision_failed: 'Not recorded. Try again.',
    decision_no_answer: "This decision can't be answered here", decision_empty: 'Write an answer first',
    decision_yes: 'Yes', decision_no: 'No', decision_choose_label: 'Choose any that apply',
    decision_choose_one: 'Choose at least one first', decision_why_needed: 'Why it is asked: {text}',
    decision_rationale: 'Why it is recommended: {text}',
    prov_live: 'Live', prov_reported: 'Reported {when}', prov_checked: 'Checked {when}', prov_imported: 'Imported from {source}',
    prov_owner: 'Recorded by you', prov_unavailable: 'No report since {when}', prov_never: 'No report yet',
    outside_alarm_quiet: "The outside alarm isn't hearing from the Pi",
    judge_it: 'Judge it', open_printer: 'Open printer', open_network: 'Open Network', see_usage: "See what's using it",
    acknowledge: 'Acknowledge', ack_pending: 'Acknowledging', ack_failed: 'Not acknowledged. Try again.',
  });
});

const trim = l => l.trim();
const norm = l => l.replace(/[\t\n\r]/g, '').trim();
const resolveTool = l => (l === 'tool:bambuddy' ? 'https://bambuddy.home.arpa/' : l);

test('safeLink keeps same-origin paths, hashes, same-origin absolutes and resolver-produced URLs', () => {
  assert.deepEqual(safeLink('/workshop', { resolve, here }), { href: 'http://10.0.0.80/workshop', external: false });
  assert.deepEqual(safeLink('#printLab?e=E-1', { resolve, here }), { href: 'http://10.0.0.80/home#printLab?e=E-1', external: false });
  assert.deepEqual(safeLink('http://10.0.0.80/x?a=1#h', { resolve, here }), { href: 'http://10.0.0.80/x?a=1#h', external: false });
  assert.deepEqual(safeLink('bambuddy', { resolve, here }), { href: 'https://bambuddy.home.arpa/', external: true });
  assert.deepEqual(safeLink('tool:bambuddy', { resolve: resolveTool, here }), { href: 'https://bambuddy.home.arpa/', external: true });
});

test('safeLink drops anything else', () => {
  for (const l of ['javascript:x', 'data:x', '//evil.com', 'https://evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', '/\r\\evil.com',
    ' https://evil.com', '\t//evil.com', 'HTTPS://evil.com', '', null, undefined]) {
    for (const r of [resolve, trim, norm]) assert.equal(safeLink(l, { resolve: r, here }), null, JSON.stringify(l));
  }
  assert.equal(safeLink('x', { resolve: () => 'javascript:alert(1)', here }), null);
  assert.equal(safeLink('x', { resolve: () => 42, here }), null);
});

const tricks = ['/..//evil.com', '/.//evil.com', '/x/..//evil.com', '/./\\evil.com', '\\..\\\\evil.com', '/%2e%2e//evil.com', '/%2e//evil.com',
  'http://10.0.0.80//evil.com/x', '#', ' # '];

test('dot-segment and double-slash tricks never yield a link that leaves the origin', () => {
  for (const l of tricks) {
    for (const r of [resolve, trim, norm]) {
      const out = safeLink(l, { resolve: r, here });
      assert.ok(out === null || new URL(out.href, here).origin === here.origin, JSON.stringify(l));
      assert.ok(out === null || !/^\/[\/\\]/.test(new URL(out.href, here).pathname), JSON.stringify(l));
    }
  }
  assert.equal(safeLink('#', { resolve, here }), null);
});

test('a throwing resolver means no link', () => {
  assert.equal(safeLink('tool:x', { resolve: () => { throw new Error('boom'); }, here }), null);
});

test('userinfo is stripped from every emitted href', () => {
  for (const r of [resolve, resolveTool]) {
    const a = safeLink('http://evil.com@10.0.0.80/x', { resolve: r, here });
    assert.ok(a && !a.href.includes('@'), JSON.stringify(a));
    assert.equal(a.external, false);
  }
  const b = safeLink('x', { resolve: () => 'https://u:p@bambuddy.home.arpa/y', here });
  assert.deepEqual(b, { href: 'https://bambuddy.home.arpa/y', external: true });
});
