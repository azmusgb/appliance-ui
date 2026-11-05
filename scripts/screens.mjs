#!/usr/bin/env node
// Screenshots of demo/index.html and demo/page.html (2.6.0) at phone and desktop width in both themes, into demo/screens/ (for review and PRs).
// Usage: npm run build && node scripts/screens.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const browser = await chromium.launch();
try {
  for (const [demo, file] of [['demo', 'index.html'], ['page', 'page.html']]) {
  const url = pathToFileURL(path.join(root, 'demo', file)).href;
  for (const [name, viewport] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
    for (const scheme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport, colorScheme: scheme, reducedMotion: 'reduce', deviceScaleFactor: name === 'phone' ? 2 : 1 });
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      const file = path.join(root, 'demo/screens', `${demo}-${name}-${scheme}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await page.close();
      console.log(path.relative(root, file));
    }
  }
  }
} finally {
  await browser.close();
}
