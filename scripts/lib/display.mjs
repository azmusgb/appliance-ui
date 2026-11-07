// The display kit's Mac proof (display-kit K8): compile tests/display/harness.cpp against dist/display, run it, and
// compare what it renders with demo/screens/display/*.png. Shared by `npm run display` and tests/display.test.mjs.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, rgb565ToRgb } from '../../tests/display/png.mjs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const refDir = path.join(root, 'demo/screens/display');
export const fontsDir = path.join(root, 'dist/display/fonts');
export const W = 480, H = 320;

export const compiler = () => ['c++', 'clang++', 'g++'].find(c => spawnSync(c, ['--version']).status === 0) || null;

// Builds the harness into `dir` and returns its path. Warnings are errors: the parts must be clean under -Wall -Wextra -Wpedantic.
export function compileHarness(dir) {
  const cxx = compiler();
  if (!cxx) throw new Error('no C++ compiler (c++, clang++ or g++) on PATH');
  const exe = path.join(dir, 'harness');
  const r = spawnSync(cxx, ['-std=c++17', '-O1', '-Wall', '-Wextra', '-Wpedantic', '-Werror', '-I', path.join(root, 'dist'), path.join(root, 'tests/display/harness.cpp'), '-o', exe], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`compile failed:\n${r.stderr}`);
  return exe;
}

export const run = (exe, ...args) => spawnSync(exe, args, { encoding: 'utf8' });

// Renders every scene; returns { name: rgb Buffer }.
export function renderScenes(exe, dir) {
  const r = run(exe, 'render', fontsDir, dir);
  if (r.status !== 0) throw new Error(`render failed:\n${r.stderr}`);
  const out = {};
  for (const name of r.stdout.split('\n').filter(Boolean)) out[name] = rgb565ToRgb(fs.readFileSync(path.join(dir, `${name}.rgb565`)));
  return out;
}

// Names of scenes whose pixels differ from the reference PNG, with how many pixels; and references with no scene.
export function compare(scenes) {
  const problems = [];
  for (const [name, rgb] of Object.entries(scenes)) {
    const file = path.join(refDir, `${name}.png`);
    if (!fs.existsSync(file)) { problems.push(`${name}: no reference image (npm run display:update)`); continue; }
    const ref = decodePng(fs.readFileSync(file));
    if (ref.width !== W || ref.height !== H) { problems.push(`${name}: reference is ${ref.width}x${ref.height}, not ${W}x${H}`); continue; }
    let diff = 0;
    for (let i = 0; i < rgb.length; i += 3) if (rgb[i] !== ref.rgb[i] || rgb[i + 1] !== ref.rgb[i + 1] || rgb[i + 2] !== ref.rgb[i + 2]) diff++;
    if (diff) problems.push(`${name}: ${diff} pixels differ from demo/screens/display/${name}.png`);
  }
  if (fs.existsSync(refDir)) for (const f of fs.readdirSync(refDir)) if (f.endsWith('.png') && !(f.slice(0, -4) in scenes)) problems.push(`${f}: a reference image with no scene`);
  return problems;
}

export function update(scenes) {
  fs.mkdirSync(refDir, { recursive: true });
  for (const f of fs.readdirSync(refDir)) if (f.endsWith('.png') && !(f.slice(0, -4) in scenes)) fs.rmSync(path.join(refDir, f));
  for (const [name, rgb] of Object.entries(scenes)) fs.writeFileSync(path.join(refDir, `${name}.png`), encodePng(rgb, W, H));
}

export const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ui-display-'));
