// Offline support: the service worker installs on the first visit, then every game works with no internet.
const { test, expect } = require('@playwright/test');
const { GAMES, watchErrors, open, cur } = require('./helpers');

test('service worker registers and every game works offline after the first visit', async ({ page, context }) => {
  const w = watchErrors(page, { ignore: [/Failed to load resource/i, /ERR_INTERNET_DISCONNECTED/i] });
  await open(page);
  const sw = await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; return { scope: reg.scope, state: reg.active && reg.active.state }; });
  expect(sw.scope).toMatch(/\/puzzle-corner\/$/);
  expect(sw.state).toBe('activated');
  const cached = await page.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k.find(x => x.startsWith('puzzle-corner-'))); return (await c.keys()).map(r => new URL(r.url).pathname); });
  for (const f of ['/puzzle-corner/', '/puzzle-corner/index.html', '/puzzle-corner/app.js', '/puzzle-corner/games.js', '/puzzle-corner/fonts/atkinson-700.woff2'])
    expect(cached, 'offline cache has ' + f).toContain(f);

  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__pc && document.querySelector('#app .screen'));
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller), 'page came from the offline copy').toBe(true);
  for (const gid of GAMES) {
    await page.locator(`#app [data-game="${gid}"]`).tap();
    await expect(page).toHaveURL(new RegExp('#' + gid + '$'));
    await page.waitForTimeout(450); await page.evaluate(() => { document.getElementById('toast').className = ''; });
    await page.locator('#app [data-hint]').tap();
    await page.locator('#app [data-act="home"]').tap();
  }
  await page.locator('#app [data-daily]').tap();
  await expect.poll(async () => !!((await cur(page)) || {}).daily, { message: 'daily puzzle opens offline' }).toBe(true);
  // opening the app fresh while offline (new tab) also works
  const p2 = await context.newPage();
  const w2 = watchErrors(p2, { ignore: [/Failed to load resource/i] });
  await p2.goto('./#cw');
  await p2.waitForFunction(() => window.__pc && document.querySelector('#app .screen.g-cw'));
  await context.setOffline(false);
  w.expectClean(); w2.expectClean();
});

test('makes no requests to other websites', async ({ page }) => {
  const outside = [];
  page.on('request', r => { const u = new URL(r.url()); if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !/^(data|blob):/.test(r.url())) outside.push(r.url()); });
  await open(page);
  for (const g of GAMES) await open(page, g);
  expect(outside).toEqual([]);
});
