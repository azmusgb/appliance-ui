// check/literals.mjs (Pi Hub amendment A22 1.5): what an app wrote by hand instead of taking from the kit, as a ratchet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanText, compare, main, CATEGORIES } from '../check/literals.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'check/literals.mjs');
const cats = (name, text, names) => scanText(name, text, names).map(f => f.category);
const css = (text, names) => cats('a.css', text, names);

// An app in a temp folder: files under app/, the check run from the folder as an app would run it.
function app(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-literals-'));
  const put = (name, body) => { fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true }); fs.writeFileSync(path.join(dir, name), body); };
  for (const [name, body] of Object.entries(files)) put(name, body);
  const run = (...args) => { const out = [], err = []; const code = main(['app', ...args], { cwd: dir, here: path.join(dir, 'kit'), kit: '9.9.9', out: l => out.push(l), err: l => err.push(l) }); return { code, out: out.join('\n'), err: err.join('\n') }; };
  const baseline = () => JSON.parse(fs.readFileSync(path.join(dir, '.kit-literals-baseline.json'), 'utf8'));
  return { dir, put, run, baseline, rm: name => fs.rmSync(path.join(dir, name)) };
}

test('colour: hex, the colour functions and a named colour are rejected; kit values, transparent and currentColor pass', () => {
  assert.deepEqual(css('.a{color:#fff}'), ['colour']);
  assert.deepEqual(css('.a{color:#FFFFFF80}'), ['colour']);
  for (const fn of ['rgb(0 0 0)', 'rgba(0,0,0,.5)', 'hsl(0 0% 0%)', 'hsla(0,0%,0%,.5)', 'oklch(50% 0 0)']) assert.deepEqual(css(`.a{background:${fn}}`), ['colour'], fn);
  assert.deepEqual(css('.a{border:1px solid red}'), ['colour']);
  assert.deepEqual(css('.a{background:linear-gradient(#000,#fff)}'), ['colour', 'colour'], 'each literal counts');
  for (const ok of ['color:var(--ui-text)', 'color:transparent', 'color:currentColor', 'background:color-mix(in srgb,var(--ui-accent) 20%,transparent)',
    'color:inherit', 'white-space:nowrap', 'animation-name:red', 'grid-area:tan']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
  assert.deepEqual(css('.a{color:color-mix(in srgb,#fff 20%,transparent)}'), ['colour'], 'a literal inside color-mix still counts');
});

test('type size: font-size or font with a px, rem or em number is rejected; the kit scale passes', () => {
  for (const bad of ['font-size:14px', 'font-size:.875rem', 'font-size:1.2em', 'font:600 14px/1.4 Archivo', 'font-size:clamp(1rem,2vw,2rem)']) assert.deepEqual(css(`.a{${bad}}`), ['type'], bad);
  for (const ok of ['font-size:var(--ui-fs-3)', 'font:600 var(--ui-fs-3)/1.4 var(--ui-font)', 'font-size:0', 'font-size:min(var(--ui-fs-1),3.85cqi)', 'font-size:inherit']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
});

test('spacing: margin, padding, gap and inset with a non-zero px, rem or em number are rejected', () => {
  for (const bad of ['margin:4px', 'margin-top:-1rem', 'padding:0 .5em', 'padding-inline:8px', 'gap:6px', 'row-gap:1rem', 'inset:4px', 'inset-block-start:2px',
    'padding:calc(var(--ui-s-2) + 2px)']) assert.deepEqual(css(`.a{${bad}}`), ['space'], bad);
  for (const ok of ['margin:0', 'margin:0 auto', 'margin:0px', 'padding:var(--ui-s-2)', 'gap:calc(var(--ui-space)*3)', 'inset:0', 'padding:env(safe-area-inset-top)',
    'padding:0 var(--ui-s-4)', 'width:240px', 'top:4px']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
});

test('radius: a number is rejected; the kit radii, the pill, 0 and 50% pass', () => {
  for (const bad of ['border-radius:6px', 'border-top-left-radius:.5rem', 'border-radius:999px', 'border-radius:40%', 'border-radius:calc(var(--ui-r-3) - 1px)']) assert.deepEqual(css(`.a{${bad}}`), ['radius'], bad);
  for (const ok of ['border-radius:var(--ui-r-3)', 'border-radius:var(--ui-r-pill)', 'border-radius:0', 'border-radius:50%', 'border-radius:0 var(--ui-r-2) var(--ui-r-2) 0']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
});

test('shadow: a literal box-shadow is rejected; the kit shadows and none pass', () => {
  assert.deepEqual(css('.a{box-shadow:0 1px 2px var(--ui-line)}'), ['shadow']);
  assert.deepEqual(css('.a{box-shadow:inset 0 0 0 1.5px currentColor}'), ['shadow']);
  for (const ok of ['box-shadow:none', 'box-shadow:var(--ui-shadow-1)', 'box-shadow:var(--ui-shadow-1), var(--ui-shadow-2)', 'box-shadow:inherit']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
});

test('motion: a literal duration or easing in transition or animation is rejected; the kit values pass', () => {
  for (const bad of ['transition:opacity .2s', 'transition:opacity var(--ui-dur-1) ease-out', 'animation:spin 1.6s ease-in-out infinite', 'transition-duration:120ms',
    'animation-timing-function:linear', 'transition:all var(--ui-dur-1) cubic-bezier(.2,0,0,1)', 'animation-delay:100ms']) assert.deepEqual(css(`.a{${bad}}`), ['motion'], bad);
  for (const ok of ['transition:opacity var(--ui-dur-1) var(--ui-ease)', 'animation:spin var(--ui-dur-2) var(--ui-ease) infinite', 'transition:none', 'animation:none',
    'transition-property:opacity', 'animation-name:ease-wipe', 'transition-delay:0s']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
});

test('layer: a z-index other than 0, 1 and -1 is rejected; the kit layers pass', () => {
  for (const bad of ['z-index:2', 'z-index:10', 'z-index:-2', 'z-index:calc(var(--ui-z-bar) + 5)']) assert.deepEqual(css(`.a{${bad}}`), ['layer'], bad);
  for (const ok of ['z-index:0', 'z-index:1', 'z-index:-1', 'z-index:auto', 'z-index:var(--ui-z-sheet)', 'z-index:calc(var(--ui-z-bar) + 1)']) assert.deepEqual(css(`.a{${ok}}`), [], ok);
});

test('names: a custom property that is not --ui-* is rejected unless the app allows it; its colour still counts', () => {
  assert.deepEqual(css(':root{--surface:var(--ui-surface)}'), ['name']);
  assert.deepEqual(css(':root{--ui-beam:var(--ui-warn)}'), []);
  assert.deepEqual(css('.a{--pct:40%}', [/^--pct$/]), []);
  assert.deepEqual(css('.a{--shade:#000}', [/^--shade$/]), ['colour'], 'an allowed name may not carry a literal colour');
  assert.deepEqual(css(':root{--gap:12px}'), ['name'], 'a private name is one finding: its value has no property to judge it by');
});

test('comments, strings and url() are not read; a selector and an at-rule condition are not declarations', () => {
  assert.deepEqual(css('/* color:#fff; margin:4px */.a{color:var(--ui-text)}'), []);
  assert.deepEqual(css('.a{background:url("img#fff.png");content:"#fff 4px"}'), []);
  assert.deepEqual(css('a:hover{color:var(--ui-text)}@media (min-width:600px){.a{margin:0}}@import "x.css";'), []);
  assert.deepEqual(css('@media (min-width:600px){.a{margin:4px}}'), ['space']);
});

test('a finding carries its line', () => {
  assert.deepEqual(scanText('a.css', '.a{\n  color:var(--ui-text);\n  margin:4px;\n}\n/* x\n y */\n.b{z-index:9}'), [
    { category: 'space', line: 3, text: 'margin:4px' }, { category: 'layer', line: 7, text: 'z-index:9' }]);
});

test('a script is read for colours, and its style attributes for the rest; an id, a link and a comment are not colours', () => {
  const js = text => cats('a.js', text);
  assert.deepEqual(js("const c = '#3fc1c9';"), ['colour']);
  assert.deepEqual(js("ctx.fillStyle = 'rgba(1,2,3,.4)';"), ['colour']);
  assert.deepEqual(js("go('#group-a'); open('https://x.test/#abc-def'); const u = 'page#abc'; // was #ffffff\nlab(view); pick.color(1); x.rgb(1);"), []);
  assert.deepEqual(js('el.innerHTML = `<p style="margin:4px;color:${c};padding:${n}px">x</p>`;'), ['space']);
  assert.deepEqual(js('el.innerHTML = `<p style="color:#fff">x</p>`;'), ['colour'], 'a colour in a style attribute counts once');
  assert.deepEqual(js('const s = "margin:4px";'), [], 'a size outside a style attribute is not seen: the stated limit');
});

test('a page: its <style>, its style attributes, its scripts, and colours in drawing attributes', () => {
  const html = text => cats('a.html', text);
  assert.deepEqual(html('<style>.x{color:#000;margin:2px}</style>'), ['colour', 'space']);
  assert.deepEqual(html('<p style="font-size:12px; color: blue">t</p>'), ['colour', 'type']);
  assert.deepEqual(html('<script>const k = "#fff";</script>'), ['colour']);
  assert.deepEqual(html('<meta name="theme-color" content="#1a1d1c"><svg><path stroke="#0b0d11" fill="none"/></svg>'), ['colour', 'colour']);
  assert.deepEqual(html('<a href="#abc" id="fed">x</a><!-- <p style="color:#fff"> --><meta name="viewport" content="width=device-width">'), []);
});

test('compare: a rise, a new file, a fall and a file that is gone, by file then category', () => {
  const d = compare({ 'b.css': { colour: 3, space: 1 }, 'a.css': { type: 1 }, 'c.css': { colour: 1 } },
    { 'b.css': { colour: 2, space: 4 }, 'c.css': { colour: 1 }, 'z.css': { layer: 2 } });
  assert.deepEqual(d.map(x => `${x.file} ${x.category} ${x.kind} ${x.have}/${x.want}`),
    ['a.css type new 1/0', 'b.css colour rise 3/2', 'b.css space fall 1/4', 'z.css layer gone 0/2']);
  assert.deepEqual(compare({ 'a.css': { colour: 1 } }, { 'a.css': { colour: 1 } }), []);
  assert.deepEqual(CATEGORIES, ['colour', 'type', 'space', 'radius', 'shadow', 'motion', 'layer', 'name']);
});

test('the first baseline is written on request, and a clean run then passes', () => {
  const a = app({ 'app/a.css': '.a{color:#fff;margin:4px}', 'app/sub/b.js': "const c = '#000';", 'app/none.css': '.a{color:var(--ui-text)}' });
  const none = a.run();
  assert.equal(none.code, 2); assert.match(none.err, /no baseline/);
  assert.equal(a.run('--write-baseline').code, 0);
  assert.deepEqual(a.baseline(), { kit: '9.9.9', files: { 'app/a.css': { colour: 1, space: 1 }, 'app/sub/b.js': { colour: 1 } } });
  const ok = a.run();
  assert.equal(ok.code, 0); assert.match(ok.out, /2 files match the baseline \(colour 2, type 0, space 1,/);
});

test('adding one hex colour fails, and names the file and the category', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}' });
  a.run('--write-baseline');
  a.put('app/a.css', '.a{color:#fff}\n.b{background:#ff0000}');
  const r = a.run();
  assert.equal(r.code, 1);
  assert.match(r.err, /^app\/a\.css: colour 2, the baseline says 1\. Use the kit's value instead/);
  assert.match(a.run('--list').out, /app\/a\.css:2\tcolour\t#ff0000/);
});

test('a new file starts at zero: one literal in it fails', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}' });
  a.run('--write-baseline');
  a.put('app/new.css', '.n{margin:4px}');
  const r = a.run();
  assert.equal(r.code, 1); assert.match(r.err, /app\/new\.css: space 1, the baseline says 0: a new file starts at zero/);
  a.put('app/new.css', '.n{margin:var(--ui-s-1)}');
  assert.equal(a.run().code, 0);
});

test('a fall fails until the baseline is lowered, and the writer lowers it', () => {
  const a = app({ 'app/a.css': '.a{color:#fff;background:#000}' });
  a.run('--write-baseline');
  a.put('app/a.css', '.a{color:#fff;background:var(--ui-bg)}');
  const r = a.run();
  assert.equal(r.code, 1); assert.match(r.err, /app\/a\.css: colour 1, the baseline says 2\. Lower the baseline in the same change/);
  const w = a.run('--write-baseline');
  assert.equal(w.code, 0); assert.match(w.out, /1 count lower/);
  assert.deepEqual(a.baseline().files, { 'app/a.css': { colour: 1 } });
  assert.equal(a.run().code, 0);
});

test('a file that is gone but still in the baseline fails, once, and the writer removes it', () => {
  const a = app({ 'app/a.css': '.a{color:#fff;margin:4px}', 'app/b.css': '.b{color:#000}' });
  a.run('--write-baseline');
  a.rm('app/a.css');
  const r = a.run();
  assert.equal(r.code, 1); assert.equal(r.err, 'app/a.css is gone but still in the baseline. Write the baseline back: --write-baseline.');
  assert.equal(a.run('--write-baseline').code, 0);
  assert.deepEqual(a.baseline().files, { 'app/b.css': { colour: 1 } });
});

test('the writer refuses to raise a number, and leaves the baseline as it was', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}', 'app/b.css': '.b{color:#000;background:#111}' });
  a.run('--write-baseline');
  const before = a.baseline();
  a.put('app/a.css', '.a{color:#fff;margin:4px}');
  a.put('app/b.css', '.b{color:#000}');  // a fall elsewhere doesn't buy a rise
  const r = a.run('--write-baseline');
  assert.equal(r.code, 1); assert.match(r.err, /not written, because a count would go up[\s\S]*app\/a\.css: space 1, the baseline says 0/);
  assert.deepEqual(a.baseline(), before);
});

test('--remeasure writes a rise only when the baseline came from another kit version', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}' });
  a.run('--write-baseline');
  a.put('app/a.css', '.a{color:#fff;margin:4px}');
  const same = a.run('--remeasure');
  assert.equal(same.code, 2); assert.match(same.err, /only for a baseline measured by another kit version/);
  fs.writeFileSync(path.join(a.dir, '.kit-literals-baseline.json'), JSON.stringify({ ...a.baseline(), kit: '9.9.8' }));
  assert.equal(a.run('--remeasure').code, 0);
  assert.deepEqual(a.baseline(), { kit: '9.9.9', files: { 'app/a.css': { colour: 1, space: 1 } } });
});

test('an allowed file is skipped and an allowed name passes; a file outside the pattern is still read', () => {
  const a = app({ 'app/art/sky.js': "const c = ['#000', '#111'];", 'app/art/deep/sea.js': "const c = '#222';", 'app/a.css': '.a{--pct:4%;--wall-gap:1;--mine:2}',
    '.kit-literals-allow.json': JSON.stringify({ files: ['app/art/*.js'], names: ['--pct', '--wall-*'] }) });
  a.run('--write-baseline');
  assert.deepEqual(a.baseline().files, { 'app/a.css': { name: 1 }, 'app/art/deep/sea.js': { colour: 1 } });
});

test('the kit\'s own folder, node_modules and dot-folders are not read', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}', 'app/node_modules/x/x.css': '.a{color:#fff}', 'app/.cache/x.css': '.a{color:#fff}' });
  a.put('app/ui/components.css', '.a{color:#fff}');
  const out = [];
  const code = main(['app', '--write-baseline'], { cwd: a.dir, here: path.join(a.dir, 'app/ui'), kit: '9.9.9', out: l => out.push(l), err: () => {} });
  assert.equal(code, 0);
  assert.deepEqual(Object.keys(a.baseline().files), ['app/a.css']);
});

test('two files are reported in a fixed order, whatever order the folders are given in', () => {
  const a = app({ 'app/z.css': '.a{color:#fff}', 'app/a.css': '.a{color:#fff}', 'more/m.css': '.a{color:#fff}' });
  const run = args => { const err = []; main(args, { cwd: a.dir, here: path.join(a.dir, 'kit'), kit: '9.9.9', out: () => {}, err: l => err.push(l) }); return err; };
  run(['app', 'more', '--write-baseline']);
  for (const f of ['app/z.css', 'app/a.css', 'more/m.css']) a.put(f, '.a{color:#fff;margin:4px}');
  const want = ['app/a.css', 'app/z.css', 'more/m.css'];
  assert.deepEqual(run(['app', 'more']).map(l => l.split(':')[0]), want);
  assert.deepEqual(run(['more', 'app']).map(l => l.split(':')[0]), want);
});

test('a malformed baseline or allow list, an unknown flag and a missing folder are exit 2, never a pass', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}' });
  assert.equal(a.run('--nope').code, 2);
  assert.equal(main([], { cwd: a.dir, out: () => {}, err: () => {} }), 2);
  assert.equal(main(['missing'], { cwd: a.dir, out: () => {}, err: () => {} }), 2);
  a.put('.kit-literals-baseline.json', '{not json');
  assert.equal(a.run().code, 2);
  a.put('.kit-literals-baseline.json', JSON.stringify({ kit: '1', files: { 'app/a.css': { colour: -1 } } }));
  assert.equal(a.run().code, 2);
  a.put('.kit-literals-baseline.json', JSON.stringify({ kit: '1', files: { 'app/a.css': { colours: 1 } } }));
  assert.equal(a.run().code, 2);
  a.put('.kit-literals-baseline.json', JSON.stringify({ kit: '1', files: { 'app/a.css': { colour: 1 } } }));
  assert.equal(a.run().code, 0);
  a.put('.kit-literals-allow.json', JSON.stringify({ files: ['app/**'], skip: true }));
  assert.equal(a.run().code, 2, 'an unknown key in the allow list is refused, not ignored');
  a.put('.kit-literals-allow.json', JSON.stringify({ names: ['pct'] }));
  assert.equal(a.run().code, 2);
  a.rm('.kit-literals-allow.json');
  assert.equal(a.run('--allow', 'nowhere.json').code, 2, 'an allow list that was named must exist');
});

test('run as a program: exit codes and the message reach the shell', () => {
  const a = app({ 'app/a.css': '.a{color:#fff}' });
  const node = (...args) => spawnSync(process.execPath, [script, 'app', ...args], { cwd: a.dir, encoding: 'utf8' });
  assert.equal(node('--write-baseline').status, 0);
  assert.equal(node().status, 0);
  a.put('app/a.css', '.a{color:#fff;color:#000}');
  const r = node();
  assert.equal(r.status, 1); assert.match(r.stderr, /app\/a\.css: colour 2, the baseline says 1/);
});

test("the kit's own src matches the kit's baseline", () => {
  const r = spawnSync(process.execPath, [script, 'src'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
