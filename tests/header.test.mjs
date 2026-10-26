import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = pathToFileURL(path.join(root, 'tests/fixtures/header.html')).href;
let browser;
before(async () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  browser = await chromium.launch();
});
after(() => browser?.close());

async function open({ width = 1280, scheme = 'dark', theme = null, attention = null } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, colorScheme: scheme });
  const requests = [];
  page.on('request', r => requests.push(r.url()));
  await page.goto(fixture);
  await page.evaluate(({ theme, attention }) => {
    if (theme) document.documentElement.dataset.theme = theme;
    if (attention !== null) document.querySelector('appliance-header').setAttribute('attention', attention);
  }, { theme, attention });
  return { page, requests };
}
const links = (page, host, current) => page.evaluate(([h, c]) => window.ApplianceHeader.linksFor(h, c), [host, current]);
const byId = list => Object.fromEntries(list.map(l => [l.id, l]));

test('home network: the current app links to /, the others to their home addresses', async () => {
  const { page } = await open();
  const l = byId(await links(page, '10.0.0.30', 'home'));
  assert.equal(l.home.href, '/');
  assert.equal(l.assistant.href, 'https://10.0.0.21/');
  assert.equal(l.workshop.href, 'http://10.0.0.124/');
  assert.equal(l.materials.href, 'https://bambuddy.home.arpa/inventory');  // through the gate since step 6
  assert.ok(Object.values(l).every(x => !x.disabled && !x.away));
  await page.close();
});

test('away (Tailscale name or 100.64.0.0/10): Tailscale links, Workshop disabled', async () => {
  const { page } = await open();
  for (const host of ['pi.tailfa018e.ts.net', '100.92.174.18', '100.64.0.1', '100.127.255.254']) {
    const l = byId(await links(page, host, 'home'));
    assert.equal(l.assistant.href, 'https://bill-hpdesktop.tailfa018e.ts.net/', host);
    assert.equal(l.workshop.disabled, true, host);
    assert.equal(l.home.href, '/', host);
  }
  await page.close();
});

test('hosts outside the Tailscale range get home-network links', async () => {
  const { page } = await open();
  for (const host of ['100.200.1.1', '100.63.255.255', 'pi', 'localhost', '10.0.0.21']) {
    const l = byId(await links(page, host, 'assistant'));
    assert.equal(l.workshop.disabled, false, host);
    assert.equal(l.home.href, 'https://home.home.arpa/', host);
  }
  await page.close();
});

test('one banner landmark with an Apps nav: four links in order, current marked', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => {
    const s = document.querySelector('appliance-header').shadowRoot;
    const nav = s.querySelector('header nav[aria-label="Apps"]');
    return { headers: s.querySelectorAll('header').length, names: [...nav.querySelectorAll('a')].map(a => a.textContent.trim()),
      current: nav.querySelector('[aria-current="page"]')?.textContent.trim() };
  });
  assert.equal(r.headers, 1);
  assert.deepEqual(r.names, ['Home', 'Assistant', 'Workshop', 'Materials']);
  assert.equal(r.current, 'Home');
  await page.close();
});

test('attention shows a count badge; 0 hides it; the property mirrors the attribute', async () => {
  const { page } = await open({ attention: '3' });
  const badge = () => page.evaluate(() => {
    const b = document.querySelector('appliance-header').shadowRoot.querySelector('.attention');
    return b && !b.hidden ? { text: b.textContent.trim(), label: b.getAttribute('aria-label') } : null;
  });
  assert.deepEqual(await badge(), { text: '3', label: '3 need a look' });
  await page.evaluate(() => { document.querySelector('appliance-header').attention = 1; });
  assert.deepEqual(await badge(), { text: '1', label: '1 needs a look' });
  await page.evaluate(() => { document.querySelector('appliance-header').attention = 0; });
  assert.equal(await badge(), null);
  await page.close();
});

test('phone: a Switch app button opens a dialog of the four apps; Esc closes it and returns focus', async () => {
  const { page } = await open({ width: 390 });
  const s = page.locator('appliance-header');
  assert.equal(await s.locator('nav[aria-label="Apps"] >> visible=true').count(), 0);
  const btn = s.getByRole('button', { name: 'Switch app' });
  await btn.click();
  const dialog = s.getByRole('dialog');
  assert.equal(await dialog.getByRole('link').count(), 4);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.querySelector('appliance-header').shadowRoot.querySelector('dialog').contains(document.querySelector('appliance-header').shadowRoot.activeElement)), 'focus stays in the dialog');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  assert.equal(await page.evaluate(() => document.querySelector('appliance-header').shadowRoot.activeElement?.getAttribute('aria-label')), 'Switch app');
  await page.close();
});

test('the header follows the page data-theme, not the device', async () => {
  const { page } = await open({ scheme: 'dark', theme: 'light' });
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector('appliance-header').shadowRoot.querySelector('header')).backgroundColor);
  assert.equal(bg, 'rgb(255, 255, 255)');
  await page.close();
});

test('the header clears the safe area at the top', async () => {
  const src = fs.readFileSync(path.join(root, 'dist/appliance-header.js'), 'utf8');
  assert.match(src, /env\(safe-area-inset-top/);
});

test('the header makes no network requests', async () => {
  const { page, requests } = await open({ attention: '2' });
  await page.waitForTimeout(300);
  assert.ok(requests.every(u => u.startsWith('file://')), requests.join('\n'));
  await page.close();
});

test('header + tokens + components stay within 12 KB gzipped; lite exists', () => {
  const size = ['appliance-header.js', 'tokens.css', 'components.css']
    .reduce((n, f) => n + zlib.gzipSync(fs.readFileSync(path.join(root, 'dist', f))).length, 0);
  console.log(`gzipped size: ${size} bytes`);
  assert.ok(size <= 12 * 1024, `${size} bytes`);
  assert.ok(fs.existsSync(path.join(root, 'dist/appliance-header.lite.js')));
});
