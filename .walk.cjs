const { chromium } = require('@playwright/test');

const SLUGS = ['business-cards', 'postcards', 'banners', 'rigid-signs', 'window-decals'];
const BASE = 'http://localhost:3000';

async function probe(page, url, vp) {
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => ({}));
  await page.waitForTimeout(1200);
  return await page.evaluate(() => {
    const txt = el => (el ? el.textContent.trim().replace(/\s+/g, ' ') : null);
    const h1 = txt(document.querySelector('h1'));

    // stepper
    const stepBtns = [...document.querySelectorAll('button[aria-label^="Step "]')].map(b => b.getAttribute('aria-label'));

    // option groups (card style)
    const radiogroups = [...document.querySelectorAll('[role="radiogroup"]')].map(g => ({
      label: g.getAttribute('aria-label'),
      count: g.querySelectorAll('[role="radio"]').length,
      kind: 'cards',
    }));

    // selects (shadcn combobox triggers)
    const selects = [...document.querySelectorAll('button[role="combobox"]')].map(s => ({
      label: s.getAttribute('aria-label') || txt(s.closest('div')?.querySelector('label')) || null,
      value: txt(s),
      kind: 'select',
    }));

    // any uppercase-tracking label divs (control labels)
    const ctlLabels = [...document.querySelectorAll('.uppercase.tracking-wide')].map(e => txt(e));

    // price-ish text
    const bodyText = document.body.innerText;
    const prices = (bodyText.match(/\$[\d,]+(\.\d{2})?/g) || []).slice(0, 12);

    // order summary panel
    const summaryHeadings = [...document.querySelectorAll('h2,h3,p,div')]
      .filter(e => /order summary|your order|summary/i.test(e.childNodes.length && e.childNodes[0].nodeValue || ''))
      .map(e => txt(e)).slice(0, 5);

    // sticky elements
    const sticky = [...document.querySelectorAll('*')].filter(e => {
      const p = getComputedStyle(e).position;
      return p === 'sticky' || p === 'fixed';
    }).map(e => ({
      tag: e.tagName.toLowerCase(),
      cls: (e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || '').toString().slice(0, 90),
      pos: getComputedStyle(e).position,
      text: (e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 70),
    })).slice(0, 15);

    // buttons
    const buttons = [...document.querySelectorAll('button, a[role="button"]')]
      .map(b => (b.innerText || '').trim().replace(/\s+/g, ' '))
      .filter(t => t && t.length < 60);

    // links
    const orderLinks = [...document.querySelectorAll('a')]
      .filter(a => /\/order|\/design/.test(a.getAttribute('href') || ''))
      .map(a => ({ href: a.getAttribute('href'), text: (a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) }))
      .slice(0, 10);

    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;

    // headings order
    const headings = [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ':' + txt(h)).slice(0, 30);

    return { h1, stepBtns, radiogroups, selects, ctlLabels, prices, summaryHeadings, sticky, buttons, orderLinks, overflow, headings, len: bodyText.length };
  });
}

(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const vp of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: vp.name === 'mobile', hasTouch: vp.name === 'mobile' });
    const page = await ctx.newPage();
    for (const slug of SLUGS) {
      for (const suffix of ['', '/order']) {
        const url = `/services/${slug}${suffix}`;
        try {
          out[`${vp.name}|${url}`] = await probe(page, url, vp);
        } catch (e) {
          out[`${vp.name}|${url}`] = { error: String(e).slice(0, 200) };
        }
      }
    }
    await ctx.close();
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
