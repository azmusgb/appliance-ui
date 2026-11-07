#!/usr/bin/env node
// The display kit's Mac proof (display-kit K8): builds the harness, runs its checks, renders every part in every state
// and compares with demo/screens/display/*.png. Exit 1 on a failed check or a changed picture.
//   npm run display            check and compare
//   npm run display:update     check, then rewrite the reference images (on purpose, like npm run screens)
import { compileHarness, compare, fontsDir, renderScenes, run, tmp, update } from './lib/display.mjs';

const dir = tmp();
const exe = compileHarness(dir);
const checks = run(exe, 'check', fontsDir);
process.stdout.write(checks.stdout);
if (checks.status !== 0) { process.stderr.write(checks.stderr); process.exit(1); }
const scenes = renderScenes(exe, dir);
if (process.argv.includes('--update')) {
  update(scenes);
  console.log(`wrote ${Object.keys(scenes).length} reference images to demo/screens/display/`);
} else {
  const problems = compare(scenes);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`${Object.keys(scenes).length} scenes match demo/screens/display/`);
}
