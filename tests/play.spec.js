// Plays every game to the end through the real buttons, plus the daily puzzle,
// and taps every board button (keyboard keys, number pad, letter tiles, cards).
const { test, expect } = require('@playwright/test');
const { GAMES, NAMES, watchErrors, open, signature, cur } = require('./helpers');

const sheetUp = page => page.locator('#sheet.open').count();

async function solveWS(page) {
  const c = await cur(page), n = c.st.p.size;
  for (const [k, w] of c.st.p.words.entries()) {
    if (c.st.found.includes(k)) continue;
    const s = w.r * n + w.c, e = (w.r + w.dr * (w.a.length - 1)) * n + (w.c + w.dc * (w.a.length - 1));
    if (k === 0) {   // first word by dragging a finger, the rest by tapping start and end
      const a = await page.locator(`.wc[data-i="${s}"]`).boundingBox(), b = await page.locator(`.wc[data-i="${e}"]`).boundingBox();
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 10 }); await page.mouse.up();
    } else { await page.locator(`.wc[data-i="${s}"]`).tap(); await page.locator(`.wc[data-i="${e}"]`).tap(); }
    await expect.poll(async () => (await cur(page)).st.found.includes(k), { message: `word ${w.a} should be found` }).toBe(true);
  }
}
async function solveCW(page) {
  const c = await cur(page), p = c.st.p, W = p.w, done = new Set();
  for (const e of p.entries) for (let j = 0; j < e.a.length; j++) {
    const i = (e.r + (e.dir === 'D' ? j : 0)) * W + e.c + (e.dir === 'A' ? j : 0); if (done.has(i)) continue; done.add(i);
    if (await sheetUp(page)) return;
    await page.locator(`.cc[data-i="${i}"]`).tap(); await page.locator(`.kbd [data-key="${e.a[j]}"]`).tap();
  }
}
async function solveSU(page) {
  const c = await cur(page), sol = c.st.sol;
  if (c.st.notesMode) await page.locator('#app [data-notes]').tap();
  for (let i = 0; i < 81; i++) {
    if (c.st.v[i] === +sol[i]) continue;
    if (await sheetUp(page)) return;
    await page.locator(`.sc[data-i="${i}"]`).tap(); await page.locator(`.pad [data-n="${sol[i]}"]`).tap();
  }
}
async function solveSC(page) {
  for (let guard = 0; guard < 15; guard++) {
    const c = await cur(page); if (c.st.done) return;
    const it = c.st.items[c.st.idx];
    if (c.st.state === 'play') {
      const picked = c.st.picked.slice();
      for (let k = picked.length; k < it.a.length; k++) {
        const id = c.st.order.find(id => c.st.tiles[id] === it.a[k] && !picked.includes(id)); picked.push(id);
        await page.locator(`[data-tile="${id}"]`).tap();
      }
      await page.waitForTimeout(150);
    }
    const c2 = await cur(page); if (c2.st.done) return;
    if (c2.st.state !== 'play') await page.locator('[data-nextw]').tap();
  }
}
async function solveMM(page) {
  const c = await cur(page), seen = {};
  c.st.cards.forEach((v, i) => { (seen[v] = seen[v] || []).push(i); });
  for (const v in seen) {
    if (c.st.matched[seen[v][0]]) continue;
    await page.locator(`.mcard[data-c="${seen[v][0]}"]`).tap(); await page.locator(`.mcard[data-c="${seen[v][1]}"]`).tap();
    await expect.poll(async () => (await cur(page)).st.matched[seen[v][0]], { message: 'a matching pair should stay face up' }).toBeTruthy();
  }
}
const SOLVE = { ws: solveWS, cw: solveCW, su: solveSU, sc: solveSC, mm: solveMM };

async function expectWin(page, gid) {
  await expect(page.locator('#sheet.open h2'), 'the "you did it" message shows').toHaveText(/Wonderful/, { timeout: 8000 });
  expect((await page.evaluate(g => window.__pc.S().games[g].solved, gid)), 'the solved count goes up').toBeGreaterThan(0);
}

for (const gid of GAMES) {
  test(`${NAMES[gid]}: can be played to the end on every difficulty`, async ({ page }) => {
    test.slow();
    const w = watchErrors(page);
    for (const diff of ['easy', 'medium', 'hard']) {
      await open(page, gid);
      if ((await cur(page)).diff !== diff) {
        // pick the difficulty the way a player would (buttons on iPad, settings popup on phone)
        if (await page.locator(`#app [data-diff="${diff}"]`).isVisible()) await page.locator(`#app [data-diff="${diff}"]`).tap();
        else { await page.locator('#app [data-act="settings"]').tap(); await page.locator(`#sheet [data-sdiff="${diff}"]`).tap(); }
        if (await sheetUp(page)) await page.locator('#sheet [data-sb="1"]').tap();   // "start a new puzzle?" → yes
        await expect.poll(async () => (await cur(page)).diff).toBe(diff);
        await page.evaluate(() => { document.getElementById('toast').className = ''; });
        if (await sheetUp(page)) await page.locator('#sheet [data-sclose], #sheet [data-sb="0"]').first().tap();
      }
      await SOLVE[gid](page);
      await expectWin(page, gid);
      await page.locator('#sheet [data-sb]').last().tap();  // play another / close
    }
    w.expectClean();
  });
}

test('daily puzzle: can be finished and is marked done on the home screen', async ({ page }) => {
  const w = watchErrors(page);
  await open(page);
  const di = await page.evaluate(() => window.__pc.dailyInfo());
  await page.locator('#app [data-daily]').tap();
  await expect(page).toHaveURL(new RegExp(`#${di.gid}/daily$`));
  await page.waitForTimeout(500); await page.evaluate(() => { document.getElementById('toast').className = ''; });
  expect((await cur(page)).daily).toBeTruthy();
  await SOLVE[di.gid](page);
  await expectWin(page, di.gid);
  await page.goto('./'); await page.waitForTimeout(400);
  await expect(page.locator('.daily.done'), 'home shows today\'s puzzle as done').toHaveCount(1);
  w.expectClean();
});

test.describe('board buttons', () => {
  test('Crossword: every on-screen keyboard key types', async ({ page }) => {
    const w = watchErrors(page);
    await open(page, 'cw');
    // Delete: type a letter at the start of the first word, then delete it
    // (deleting at the start of an empty word is meant to do nothing)
    const first = await page.evaluate(() => { const st = window.__pc.cur().st, p = st.p, e = p.entries[0]; return e.r * p.w + e.c; });
    // tapping the already-selected square flips across/down, so only tap it if it isn't selected
    if ((await cur(page)).st.sel.i !== first) await page.locator(`.cc[data-i="${first}"]`).tap();
    await page.locator('#app .kbd [data-key="Q"]').tap();
    await expect.poll(async () => (await cur(page)).st.fill[first]).toBe('Q');
    await page.locator('#app .kbd [data-key="DEL"]').tap();
    await expect.poll(async () => (await cur(page)).st.fill[first], { message: 'key DEL should delete the letter' }).toBe('');
    const keys = await page.locator('#app .kbd [data-key]').evaluateAll(els => els.map(e => e.dataset.key));
    expect(keys.length).toBeGreaterThanOrEqual(27);
    for (const k of keys.filter(k => k !== 'DEL')) {
      const before = await signature(page);
      await page.locator(`#app .kbd [data-key="${k}"]`).tap();
      await expect.poll(() => signature(page), { message: `key ${k} should do something`, timeout: 2500 }).not.toBe(before);
    }
    for (const nav of ['prev', 'next']) {
      const before = await signature(page);
      await page.locator(`#app [data-${nav}]`).tap();
      await expect.poll(() => signature(page), { message: `${nav} clue should move`, timeout: 2500 }).not.toBe(before);
    }
    w.expectClean();
  });

  test('Sudoku: every number on the pad fills a square', async ({ page }) => {
    const w = watchErrors(page);
    await open(page, 'su');
    if ((await cur(page)).st.notesMode) await page.locator('#app [data-notes]').tap();
    for (let n = 1; n <= 9; n++) {
      const i = await page.evaluate(() => window.__pc.cur().st.v.indexOf(0));
      await page.locator(`.sc[data-i="${i}"]`).tap();
      await page.locator(`#app .pad [data-n="${n}"]`).tap();
      await expect.poll(async () => (await cur(page)).st.v[i], { message: `number ${n} should go in the square` }).toBe(n);
    }
    w.expectClean();
  });

  test('Word Scramble: every letter tile and every answer slot responds', async ({ page }) => {
    const w = watchErrors(page);
    await open(page, 'sc');
    const c = await cur(page), len = c.st.items[c.st.idx].a.length;
    const tiles = await page.locator('#app [data-tile]').evaluateAll(els => els.map(e => e.dataset.tile));
    // tap all but the last tile (tapping the last would finish the word), checking each lands in a slot
    for (const id of tiles.slice(0, Math.min(tiles.length, len) - 1)) {
      const n = (await cur(page)).st.picked.length;
      await page.locator(`#app [data-tile="${id}"]`).tap();
      await expect.poll(async () => (await cur(page)).st.picked.length, { message: `tile ${id} should move up` }).toBe(n + 1);
    }
    // tapping a filled slot sends the letter back
    while ((await cur(page)).st.picked.length > (await cur(page)).st.locked) {
      const n = (await cur(page)).st.picked.length;
      await page.locator(`#app [data-slot="${n - 1}"]`).tap();
      await expect.poll(async () => (await cur(page)).st.picked.length).toBe(n - 1);
    }
    w.expectClean();
  });

  test('Memory Match: every card flips when tapped', async ({ page }) => {
    const w = watchErrors(page);
    await open(page, 'mm');
    const n = await page.locator('#app .mcard').count();
    for (let i = 0; i < n; i++) {
      // wait for any pair that didn't match to turn back over
      await expect.poll(async () => (await cur(page)).st.open.length, { timeout: 5000 }).toBeLessThan(2);
      const st = (await cur(page)).st;
      if (st.matched[i] || st.open.includes(i)) continue;
      await page.locator(`.mcard[data-c="${i}"]`).tap();
      await expect.poll(async () => { const s = (await cur(page)).st; return s.open.includes(i) || !!s.matched[i]; }, { message: `card ${i} should flip` }).toBe(true);
    }
    w.expectClean();
  });
});
