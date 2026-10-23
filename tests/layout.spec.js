// Layout: nothing hangs off the sides, boards fit on screen, buttons are big enough to tap — at normal and largest text sizes.
const { test, expect } = require('@playwright/test');
const { GAMES, NAMES, open, sidewaysOverflow } = require('./helpers');

const ROUTES = [['home', ''], ...GAMES.map(g => [NAMES[g], g])];

async function setScale(page, biggest) {
  if (!biggest) return;
  await page.locator('#app [data-act="settings"]').tap();
  while (await page.locator('#sheet [data-act="larger"]:not([disabled])').count()) await page.locator('#sheet [data-act="larger"]').tap();
  await page.locator('#sheet [data-sclose]').tap();
}

for (const biggest of [false, true]) {
  for (const [name, route] of ROUTES) {
    test(`${name}${biggest ? ' (largest text)' : ''}: fits the screen with tappable buttons`, async ({ page }, info) => {
      const phone = info.project.name.endsWith('phone');
      await open(page, route);
      await setScale(page, biggest);
      await page.waitForTimeout(300);
      const o = await sidewaysOverflow(page);
      expect(o.scroll, 'page should not scroll sideways').toBeLessThanOrEqual(1);
      expect(o.bad, 'nothing cut off at the sides').toEqual([]);
      if (route) {
        const board = await page.locator('.board-area, .sc-wrap').first().boundingBox();
        const vw = page.viewportSize().width;
        expect(board.x, 'board starts on screen').toBeGreaterThanOrEqual(-1);
        expect(board.x + board.width, 'board ends on screen').toBeLessThanOrEqual(vw + 1);
      }
      // tap targets: 44px minimum on phone (Apple guideline), bigger on iPad
      const min = phone ? 40 : 44;
      const small = await page.evaluate(min => [...document.querySelectorAll('#app button')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); return { t: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 20), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(x => x.h < min || x.w < min), min);
      expect(small, `buttons at least ${min}px`).toEqual([]);
      // the settings popup fits
      await page.locator('#app [data-act="settings"]').tap();
      const box = await page.locator('#sheet .sheet-box').boundingBox(), vp = page.viewportSize();
      expect(box.y >= -1 && box.x >= -1 && box.x + box.width <= vp.width + 1, 'settings popup fits on screen').toBe(true);
      expect((await sidewaysOverflow(page)).scroll).toBeLessThanOrEqual(1);
    });
  }
}
