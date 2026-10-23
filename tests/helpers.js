// Shared helpers for the Puzzle Corner QA checks.
const { expect } = require('@playwright/test');
const GAMES = ['ws', 'cw', 'su', 'sc', 'mm'];
const NAMES = { ws: 'Word Search', cw: 'Crossword', su: 'Sudoku', sc: 'Word Scramble', mm: 'Memory Match' };

function watchErrors(page, { ignore = [] } = {}) {
  const errors = [];
  page.on('pageerror', e => errors.push('uncaught: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !ignore.some(r => r.test(m.text()))) errors.push('console.error: ' + m.text()); });
  page.on('crash', () => errors.push('page crashed'));
  return { errors, expectClean: () => expect(errors, 'no console errors or uncaught exceptions').toEqual([]) };
}

async function open(page, route = '') {
  if (page.url().includes('#')) await page.goto('about:blank');   // make sure it is a real fresh load, not just a hash change
  await page.goto('./' + (route ? '#' + route : ''));
  await page.waitForFunction(() => window.__pc && document.querySelector('#app .screen'));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // phones show a first-visit tip ~0.4s after a game opens
  await page.waitForTimeout(await page.evaluate(() => window.__pc.isPhone()) ? 500 : 120);
  // the first-visit tip on phones would vanish on any tap and look like a change, so put it away first
  await page.evaluate(() => { document.getElementById('toast').className = ''; });
}

// Everything a tap could change: the page, popups, messages, saved settings and the puzzle (ignoring the ticking timer).
async function signature(page) {
  return page.evaluate(() => {
    const app = document.getElementById('app').cloneNode(true);
    app.querySelectorAll('.timer').forEach(t => t.remove());
    const strip = (k, v) => (k === 'elapsed' ? undefined : v);
    const c = window.__pc.cur();
    return JSON.stringify({
      hash: location.hash, app: app.innerHTML, sheet: document.getElementById('sheet').className + document.getElementById('sheet').innerHTML,
      toast: document.getElementById('toast').className + document.getElementById('toast').textContent,
      root: document.documentElement.getAttribute('style') + document.documentElement.className,
      S: JSON.stringify(window.__pc.S(), strip), st: c ? JSON.stringify(c.st, strip) : null,
    });
  });
}

async function tapAndExpectChange(page, locator, label) {
  const before = await signature(page);
  await locator.tap();
  await expect.poll(() => signature(page), { message: label + ' should do something when tapped', timeout: 2500 }).not.toBe(before);
}

// A stable selector for every visible, enabled button inside `scope`.
async function visibleButtons(page, scope = 'body') {
  return page.evaluate(scope => {
    const out = [], seen = new Set();
    document.querySelectorAll(scope + ' button').forEach(b => {
      const r = b.getBoundingClientRect(), cs = getComputedStyle(b);
      if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || b.disabled || b.closest('[hidden]')) return;
      const inSheet = !!b.closest('#sheet');
      if (!inSheet && document.getElementById('sheet').className === 'open') return;   // covered by an open popup
      const d = Object.entries(b.dataset)[0];
      let sel = d ? `[data-${d[0].replace(/[A-Z]/g, m => '-' + m.toLowerCase())}${d[1] !== '' ? `="${d[1]}"` : ''}]` : null;
      if (!sel) return;
      sel = (inSheet ? '#sheet ' : '#app ') + sel;
      if (seen.has(sel)) return; seen.add(sel);
      out.push({ sel, label: (b.getAttribute('aria-label') || b.textContent).trim().replace(/\s+/g, ' ').slice(0, 40), cls: b.className,
        board: ['key', 'n', 'tile', 'slot', 'c', 'i'].some(k => k in b.dataset),
        // tapping the difficulty that is already picked is allowed to do nothing
        selected: ('diff' in b.dataset || 'sdiff' in b.dataset) && b.classList.contains('on') });
    });
    return out;
  }, scope);
}

async function sheetOpen(page) { return (await page.locator('#sheet.open').count()) > 0; }
async function closeSheet(page) { if (await sheetOpen(page)) { await page.locator('#sheet [data-sb="0"], #sheet [data-sclose]').first().tap(); await expect(page.locator('#sheet.open')).toHaveCount(0); } }
async function cur(page) { return page.evaluate(() => { const c = window.__pc.cur(); return c ? JSON.parse(JSON.stringify({ gid: c.gid, diff: c.diff, daily: c.daily, st: c.st })) : null; }); }

// Things that must sit fully inside the screen width (nothing cut off on the sides).
async function sidewaysOverflow(page) {
  return page.evaluate(() => {
    const W = document.documentElement.clientWidth, bad = [];
    const scroll = document.scrollingElement.scrollWidth - W;
    document.querySelectorAll('#app *, #sheet.open *').forEach(el => {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.position === 'fixed' && el.closest('#fx')) return;
      // ignore things inside a box that scrolls sideways on purpose
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return; }
      if (r.left < -1 || r.right > W + 1) bad.push((el.className || el.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
    });
    return { scroll, bad: bad.slice(0, 10) };
  });
}

module.exports = { GAMES, NAMES, watchErrors, open, signature, tapAndExpectChange, visibleButtons, sheetOpen, closeSheet, cur, sidewaysOverflow };
