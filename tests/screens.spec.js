// Opens every screen and taps every visible button (and every button in every popup those buttons open).
// Each tap must visibly do something, with no errors.
const { test, expect } = require('@playwright/test');
const { GAMES, NAMES, watchErrors, open, signature, visibleButtons, sheetOpen } = require('./helpers');

const ROUTES = [['home', ''], ...GAMES.map(g => [NAMES[g], g]), ['daily puzzle', 'daily']];
const MAX_DEPTH = 3;

// Some buttons only make sense mid-game (Undo, Erase, Clear...), so each game starts with one move made.
const FIRST_MOVE = {
  su: async page => {
    const i = await page.evaluate(() => window.__pc.cur().st.v.indexOf(0));
    await page.locator(`.sc[data-i="${i}"]`).tap();
    const n = await page.evaluate(i => window.__pc.cur().st.sol[i], i);
    await page.locator(`#app [data-n="${n}"]`).tap();
  },
  cw: async page => { await page.locator('#app .kbd [data-key="A"]').tap(); },
  sc: async page => { await page.locator('#app [data-tile]').first().tap(); },
};

async function fresh(page, route, path) {
  await page.goto('about:blank');
  await open(page, route === 'daily' ? '' : route);
  if (route === 'daily') { await page.locator('#app [data-daily]').tap(); await page.waitForTimeout(500); await page.evaluate(() => { document.getElementById('toast').className = ''; }); }
  if (FIRST_MOVE[route]) { await FIRST_MOVE[route](page); await page.waitForTimeout(150); }
  for (const sel of path) { await page.locator(sel).tap(); await page.waitForTimeout(150); }
}

async function crawl(page, route, path, tested, sheetsSeen) {
  await fresh(page, route, path);
  const scope = (await sheetOpen(page)) ? '#sheet' : '#app';
  const buttons = (await visibleButtons(page, scope)).filter(b => !b.board);
  for (const b of buttons) {
    const where = [...path, b.sel].join(' > ');
    await fresh(page, route, path);
    const before = await signature(page);
    await page.locator(b.sel).tap();
    if (b.selected) { tested.push(where + ' (already picked)'); continue; }
    await expect.poll(() => signature(page), { message: `"${b.label}" (${where}) should do something when tapped`, timeout: 6000 }).not.toBe(before);
    tested.push(where);
    // a popup opened by this tap gets the same treatment
    if (await sheetOpen(page) && path.length + 1 < MAX_DEPTH) {
      const key = await page.evaluate(() => [...document.querySelectorAll('#sheet h2, #sheet button')].map(e => e.tagName === 'H2' ? e.textContent : JSON.stringify(e.dataset)).join('|'));
      if (!sheetsSeen.has(key)) { sheetsSeen.add(key); await crawl(page, route, [...path, b.sel], tested, sheetsSeen); }
    }
  }
}

for (const [name, route] of ROUTES) {
  test(`${name}: every button and popup button responds`, async ({ page }) => {
    test.setTimeout(420000);   // many fresh reloads, slow on WebKit
    await page.addInitScript(() => { if (location.protocol.startsWith('http')) localStorage.clear(); });   // every tap starts from a brand-new player
    const w = watchErrors(page);
    const tested = [];
    await crawl(page, route, [], tested, new Set());
    expect(tested.length).toBeGreaterThan(3);
    test.info().annotations.push({ type: 'buttons tapped', description: tested.length + ': ' + tested.join(', ') });
    w.expectClean();
  });
}

test('settings and progress are remembered after closing the app', async ({ page }) => {
  const w = watchErrors(page);
  await open(page, 'su');
  await page.locator('#app [data-act="settings"]').tap();
  await page.locator('#sheet [data-act="larger"]').tap();
  await page.locator('#sheet [data-act="sound"]').tap();
  await page.locator('#sheet [data-act="timer"]').tap();
  await page.locator('#sheet [data-sclose]').tap();
  const i = await page.evaluate(() => window.__pc.cur().st.v.indexOf(0));
  if ((await page.evaluate(() => window.__pc.cur().st.notesMode))) await page.locator('#app [data-notes]').tap();
  await page.locator(`.sc[data-i="${i}"]`).tap(); await page.locator('#app .pad [data-n="5"]').tap();
  const before = await page.evaluate(() => ({ s: window.__pc.S().settings, scale: getComputedStyle(document.documentElement).getPropertyValue('--scale') }));
  await open(page, 'su');
  const after = await page.evaluate(() => ({ s: window.__pc.S().settings, scale: getComputedStyle(document.documentElement).getPropertyValue('--scale') }));
  expect(after.s.scale).toBe(before.s.scale);
  expect(after.s.sound).toBe(false);
  expect(after.s.timer).toBe(true);
  expect(after.scale).toBe(before.scale);
  expect(await page.evaluate(i => window.__pc.cur().st.v[i], i), 'the number typed before is still there').toBe(5);
  await expect(page.locator('#app .timer')).toBeVisible();
  w.expectClean();
});
