// Every file the app points at must exist, and the sound engine must actually make sounds.
const { test, expect } = require('@playwright/test');
const fs = require('fs'), path = require('path');
const { watchErrors, open, cur } = require('./helpers');
const ROOT = path.resolve(__dirname, '..');

function referencedFiles() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = new Set(['sw.js']);
  for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"'#?]+)["']/g)) if (!/^(https?:|data:|mailto:|blob:)/.test(m[1])) files.add(m[1]);
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  for (const m of sw.match(/ASSETS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)) files.add(m[1].replace(/^\.\//, '') || './');
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const i of man.icons) files.add(i.src);
  for (const m of fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8').matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!/^data:/.test(m[1])) files.add(m[1]);
  return [...files];
}

test('every referenced file loads (HTML, styles, fonts, offline list, app icons)', async ({ request }, info) => {
  test.skip(!info.project.name.endsWith('ipad-landscape'), 'file checks do not depend on screen size');
  const files = referencedFiles();
  expect(files).toEqual(expect.arrayContaining(['index.html', 'sw.js', 'app.js', 'manifest.webmanifest', 'icons/icon-192.png', 'fonts/atkinson-400.woff2']));
  for (const f of files) {
    const res = await request.get(f);
    expect(res.status(), f + ' should load').toBe(200);
    expect((await res.body()).length, f + ' should not be empty').toBeGreaterThan(0);
  }
});

test('every file in the app folder is in the offline list (so nothing breaks offline)', async ({}, info) => {
  test.skip(!info.project.name.endsWith('ipad-landscape'), 'file checks do not depend on screen size');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  const listed = [...sw.match(/ASSETS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1].replace(/^\.\//, ''));
  const wanted = ['index.html', 'manifest.webmanifest', ...fs.readdirSync(ROOT).filter(f => /\.(js|css)$/.test(f) && !['sw.js', 'playwright.config.js'].includes(f)),
    ...fs.readdirSync(path.join(ROOT, 'fonts')).filter(f => f.endsWith('.woff2')).map(f => 'fonts/' + f),
    ...fs.readdirSync(path.join(ROOT, 'icons')).filter(f => f.endsWith('.png')).map(f => 'icons/' + f)];
  for (const f of wanted) expect(listed, f + ' should be saved for offline use').toContain(f);
});

test('app icons are real PNGs with the sizes the manifest promises', async ({ request }, info) => {
  test.skip(!info.project.name.endsWith('ipad-landscape'), 'file checks do not depend on screen size');
  const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  for (const i of man.icons) {
    const buf = await (await request.get(i.src)).body();
    expect(buf.slice(1, 4).toString(), i.src + ' is a PNG').toBe('PNG');
    expect(buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20), i.src).toBe(i.sizes);
  }
});

test('the bundled fonts load', async ({ page }) => {
  await open(page);
  const ok = await page.evaluate(async () => { await document.fonts.ready; return document.fonts.check('700 20px "Atkinson Hyperlegible"') && document.fonts.check('600 20px Fraunces'); });
  expect(ok).toBe(true);
});

// All sounds are made live with the Web Audio API (there are no sound files), so count the sounds started.
const COUNT_SOUNDS = () => {
  window.__soundsStarted = 0;
  const P = window.AudioScheduledSourceNode && AudioScheduledSourceNode.prototype;
  if (P) { const s = P.start; P.start = function () { window.__soundsStarted++; return s.apply(this, arguments); }; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (AC) { const R = AC; window.AudioContext = function () { const c = new R(...arguments); window.__ac = c; return c; }; window.AudioContext.prototype = R.prototype; }
};

test('taps make sounds, the audio engine runs, and Sound: Off silences everything', async ({ page }) => {
  const w = watchErrors(page);
  await page.addInitScript(COUNT_SOUNDS);
  await open(page, 'su');
  const sounds = () => page.evaluate(() => window.__soundsStarted);
  expect(await sounds(), 'no sound before the first touch').toBe(0);
  const i = await page.evaluate(() => window.__pc.cur().st.v.indexOf(0));
  await page.locator(`.sc[data-i="${i}"]`).tap();
  await expect.poll(sounds, { message: 'tapping a square plays a sound' }).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__ac && window.__ac.state), { message: 'audio engine is running' }).toBe('running');
  // right answer and wrong answer both make (different) sounds
  const sol = await page.evaluate(i => window.__pc.cur().st.sol[i], i);
  let before = await sounds();
  await page.locator(`#app .pad [data-n="${sol}"]`).tap();
  await expect.poll(sounds, { message: 'placing a number plays a sound' }).toBeGreaterThan(before);
  // finishing a puzzle (Memory Match is quickest) plays the 4-note win tune
  await open(page, 'mm');
  const c = await cur(page), seen = {};
  c.st.cards.forEach((v, k) => { (seen[v] = seen[v] || []).push(k); });
  for (const v in seen) {
    before = await sounds();
    await page.locator(`.mcard[data-c="${seen[v][0]}"]`).tap(); await page.locator(`.mcard[data-c="${seen[v][1]}"]`).tap();
    await expect.poll(async () => (await cur(page)).st.matched[seen[v][0]]).toBeTruthy();
  }
  await expect.poll(sounds, { message: 'finishing a puzzle plays the win tune' }).toBeGreaterThanOrEqual(before + 4);
  await expect(page.locator('#sheet.open h2')).toHaveText(/Wonderful/, { timeout: 5000 });
  // turn sound off in settings
  await open(page, 'su');
  await page.locator('#app [data-act="settings"]').tap();
  await page.locator('#sheet [data-act="sound"]').tap();
  expect(await page.evaluate(() => window.__pc.S().settings.sound)).toBe(false);
  await page.locator('#sheet [data-sclose]').tap();
  before = await sounds();
  const j = await page.evaluate(() => window.__pc.cur().st.v.indexOf(0));
  await page.locator(`.sc[data-i="${j}"]`).tap(); await page.locator('#app .pad [data-n="1"]').tap(); await page.locator('#app [data-hint]').tap();
  await page.waitForTimeout(300);
  expect(await sounds(), 'Sound: Off means silent').toBe(before);
  // and back on
  await page.locator('#app [data-act="settings"]').tap(); await page.locator('#sheet [data-act="sound"]').tap(); await page.locator('#sheet [data-sclose]').tap();
  before = await sounds();
  await page.locator(`.sc[data-i="${j}"]`).tap();
  await expect.poll(sounds, { message: 'turning sound back on works' }).toBeGreaterThan(before);
  w.expectClean();
});

test('every game makes sounds while playing', async ({ page }) => {
  const w = watchErrors(page);
  await page.addInitScript(COUNT_SOUNDS);
  const sounds = () => page.evaluate(() => window.__soundsStarted);
  const actions = {
    ws: async () => { await page.locator('#app [data-hint]').tap(); },
    cw: async () => { await page.locator('#app .kbd [data-key="A"]').tap(); },
    su: async () => { await page.locator('#app [data-hint]').tap(); },
    sc: async () => { await page.locator('#app [data-tile]').first().tap(); },
    mm: async () => { await page.locator('.mcard').first().tap(); },
  };
  for (const [gid, act] of Object.entries(actions)) {
    await open(page, gid);
    const before = await sounds();
    await act();
    await expect.poll(sounds, { message: gid + ' plays a sound when played' }).toBeGreaterThan(before);
  }
  w.expectClean();
});
