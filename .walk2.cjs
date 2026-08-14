const { chromium } = require('@playwright/test');
const SLUGS = ['business-cards', 'postcards', 'banners', 'rigid-signs', 'window-decals'];
const BASE = 'http://localhost:3000';

const orderUrl = s => s === 'business-cards' ? '/services/business-cards' : `/services/${s}/order`;

async function snap(page) {
  return page.evaluate(() => {
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const bar = document.querySelector('.fixed.inset-x-0.bottom-0');
    const nextBtn = [...document.querySelectorAll('button')].find(b => /^Next$/.test(b.innerText.trim()));
    const backBtn = [...document.querySelectorAll('button')].find(b => /^Back$/.test(b.innerText.trim()));
    const alerts = [...document.querySelectorAll('[role="alert"]')].map(a => a.innerText.trim());
    const amber = [...document.querySelectorAll('.text-amber-700')].map(a => a.innerText.trim());
    const steps = [...document.querySelectorAll('button[aria-label^="Step "]')].map(b => b.getAttribute('aria-label'));
    const summary = document.querySelector('aside[data-testid="order-summary"]');
    const preview = [...document.querySelectorAll('div')].find(d => /Your artwork will appear here|Your design|Your uploaded artwork/.test(d.innerText || '') && d.className.includes('sticky'));
    let nextRect = null, barRect = null;
    if (nextBtn) { const r = nextBtn.getBoundingClientRect(); nextRect = { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }
    if (bar) { const r = bar.getBoundingClientRect(); barRect = { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }
    return {
      url: location.pathname + location.search,
      h2: [...document.querySelectorAll('h2')].map(h => h.innerText.trim()).slice(0, 4),
      steps, alerts, amber,
      nextText: nextBtn ? nextBtn.innerText.trim() : null,
      nextDisabled: nextBtn ? nextBtn.disabled : null,
      backDisabled: backBtn ? backBtn.disabled : null,
      summaryVisible: vis(summary),
      previewVisible: vis(preview),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      docW: document.documentElement.scrollWidth,
      nextRect, barRect,
      barText: bar ? bar.innerText.trim().replace(/\s+/g, ' ').slice(0, 80) : null,
    };
  });
}

async function pickQuantity(page) {
  // shadcn select trigger with aria-label Quantity
  const trig = page.locator('button[role="combobox"][aria-label="Quantity"]').first();
  if (await trig.count() === 0) return 'no-quantity-select';
  await trig.click();
  await page.waitForTimeout(400);
  const opts = page.locator('[role="option"]');
  const n = await opts.count();
  if (n === 0) { await page.keyboard.press('Escape'); return 'no-options'; }
  const pick = Math.min(2, n - 1);
  const label = (await opts.nth(pick).innerText()).trim();
  await opts.nth(pick).click();
  await page.waitForTimeout(1500);
  return label;
}

(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.name === 'mobile', hasTouch: vp.name === 'mobile' });
    const page = await ctx.newPage();
    for (const slug of SLUGS) {
      const key = `${vp.name}|${slug}`;
      const rec = {};
      try {
        await page.goto(BASE + orderUrl(slug), { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(1200);
        rec.initial = await snap(page);

        // 1. Press Next with nothing chosen
        const next = page.locator('button', { hasText: /^Next$/ }).first();
        if (await next.count()) { await next.click({ force: true }).catch(() => {}); await page.waitForTimeout(700); }
        rec.afterBlindNext = await snap(page);

        // 2. Choose a quantity
        rec.quantityPicked = await pickQuantity(page);
        rec.afterQuantity = await snap(page);

        // 3. Press Next again -> should hit artwork gate
        if (await next.count()) { await next.click({ force: true }).catch(() => {}); await page.waitForTimeout(800); }
        rec.afterNext2 = await snap(page);

        // 4. Choose "Design it for me" then Next
        const design = page.locator('button', { hasText: 'Design it for me' }).first();
        if (await design.count()) { await design.scrollIntoViewIfNeeded(); await design.click(); await page.waitForTimeout(600); }
        rec.artworkChoices = await page.evaluate(() =>
          [...document.querySelectorAll('button')].map(b => b.innerText.trim().split('\n')[0])
            .filter(t => /Create it with AI|Start from a template|I have my own design|Design it for me/.test(t)));
        if (await next.count()) { await next.click({ force: true }).catch(() => {}); await page.waitForTimeout(1200); }
        rec.afterAdvance = await snap(page);

        // 5. Browser back
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(1200);
        rec.afterBrowserBack = await snap(page);
      } catch (e) {
        rec.error = String(e).slice(0, 300);
      }
      out[key] = rec;
    }
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
