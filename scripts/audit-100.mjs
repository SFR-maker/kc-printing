import fs from "node:fs";
import { chromium } from "@playwright/test";

/**
 * A hundred checks across the live site: pages, security, SEO, catalogue integrity, print geometry,
 * order behaviour, accessibility and performance.
 *
 * Every check asserts something specific and reports what it actually saw. A check that cannot run
 * is reported as SKIP rather than passed, because a green run that quietly skipped half its work is
 * worse than a red one.
 *
 *   node scripts/audit-100.mjs [--base https://611printing.com]
 */

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "https://611printing.com");
const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const results = [];
let n = 0;
function record(area, name, status, detail) {
  results.push({ n: ++n, area, name, status, detail });
  const mark = status === "PASS" ? "ok  " : status === "FAIL" ? "FAIL" : "skip";
  console.log(`  ${String(n).padStart(3)}. [${mark}] ${area.padEnd(11)} ${name}${detail ? ` — ${detail}` : ""}`);
}
const check = (area, name, cond, detail) => record(area, name, cond ? "PASS" : "FAIL", detail);
const skip = (area, name, why) => record(area, name, "SKIP", why);

const get = async (path, opts = {}) => {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { redirect: "manual", ...opts });
  return { res, ms: Date.now() - t0, text: async () => res.text() };
};

console.log(`\n=== 611 Printing — 100-check audit against ${BASE} ===\n`);

/* ─── 1. Pages respond ─────────────────────────────────────────────────── */
const PAGES = [
  "/", "/services", "/services/business-cards", "/services/postcards", "/services/banners",
  "/services/rigid-signs", "/services/business-cards/order", "/services/postcards/order",
  "/services/banners/order", "/services/rigid-signs/order", "/pricing", "/portfolio",
  "/contact", "/faq", "/about", "/terms", "/privacy", "/refund-policy",
];
for (const p of PAGES) {
  const { res, ms } = await get(p);
  check("pages", `${p} responds`, res.status === 200, `${res.status} in ${ms}ms`);
}

/* ─── 2. Security ──────────────────────────────────────────────────────── */
{
  const { res } = await get("/");
  const h = (k) => res.headers.get(k) ?? "";
  check("security", "HSTS set", /max-age=\d{7,}/.test(h("strict-transport-security")), h("strict-transport-security"));
  check("security", "nosniff", h("x-content-type-options") === "nosniff");
  check("security", "frame protection", /SAMEORIGIN|DENY/i.test(h("x-frame-options")));
  check("security", "referrer policy", h("referrer-policy").length > 0, h("referrer-policy"));
  check("security", "permissions policy", h("permissions-policy").includes("camera=()"));
  check("security", "CSP enforces object-src", h("content-security-policy").includes("object-src 'none'"));
  check("security", "CSP allows the live Clerk host", h("content-security-policy-report-only").includes("clerk.611printing.com"));
  check("security", "framework header hidden", !h("x-powered-by"), h("x-powered-by") || "absent");
}
for (const p of ["/admin", "/admin/orders", "/account", "/api/admin/orders/x/print-file"]) {
  const { res } = await get(p);
  check("security", `${p} refuses anonymous`, [301, 302, 307, 401, 403].includes(res.status), String(res.status));
}
{
  const { res } = await get("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  check("security", "order API rejects an empty body", res.status >= 400, String(res.status));
}

/* ─── 3. SEO ───────────────────────────────────────────────────────────── */
{
  const { res } = await get("/");
  const html = await res.text();
  check("seo", "homepage canonical is the root", /<link rel="canonical" href="https:\/\/611printing\.com\/?"/.test(html));
  check("seo", "title present", /<title>[^<]{10,}/.test(html));
  check("seo", "meta description", /name="description" content="[^"]{50,}/.test(html));
  check("seo", "og:image", /property="og:image"/.test(html));
  check("seo", "LocalBusiness schema", html.includes('"@type":"LocalBusiness"'));
  check("seo", "no KC Printing left in markup", !/KC Printing/.test(html), "brand consistency");
}
{
  const { res } = await get("/sitemap.xml");
  const xml = await res.text();
  check("seo", "sitemap serves", res.status === 200);
  const { res: r2 } = await get("/sitemap-0.xml");
  const body = await r2.text();
  check("seo", "sitemap lists pages", (body.match(/<loc>/g) ?? []).length >= 15, `${(body.match(/<loc>/g) ?? []).length} urls`);
  void xml;
}
{
  const { res } = await get("/robots.txt");
  const txt = await res.text();
  check("seo", "robots disallows /admin", txt.includes("Disallow: /admin"));
  check("seo", "robots points at the sitemap", txt.includes("sitemap.xml"));
}
{
  const { res } = await get("/does-not-exist");
  check("seo", "unknown page 404s", res.status === 404, String(res.status));
}

/* ─── 4. Catalogue integrity (server-side truth) ───────────────────────── */
const cat = JSON.parse(fs.readFileSync("lib/pricing/rigid-signs-catalogue.json", "utf8"));
const bannersScraped = JSON.parse(fs.readFileSync("lib/pricing/banners-scraped.json", "utf8"));
const postcards = JSON.parse(fs.readFileSync("lib/pricing/postcards-scraped.json", "utf8"));
const bcData = JSON.parse(fs.readFileSync("lib/pricing/business-card-data.json", "utf8"));
const finishing = JSON.parse(fs.readFileSync("lib/pricing/banner-finishing.json", "utf8"));

check("catalogue", "business cards offer sizes", bcData.sizes.length > 0, `${bcData.sizes.length}`);
check("catalogue", "business cards offer paper stocks", bcData.papers.length >= 10, `${bcData.papers.length} stocks`);
check("catalogue", "14 pt. Gloss is a stock", bcData.papers.some((p) => p.label === "14 pt. Gloss"));
check("catalogue", "business cards offer print sides", bcData.colors.length >= 2, `${bcData.colors.length}`);
check("catalogue", "business cards offer quantity breaks", bcData.quantities.length >= 5, `${bcData.quantities.length}`);

const pcSizes = new Set(Object.keys(postcards.prices).map((k) => k.split("|")[0]));
const pcPapers = new Set(Object.keys(postcards.prices).map((k) => k.split("|")[1]));
const pcQty = new Set(Object.keys(postcards.prices).map((k) => k.split("|")[3]));
check("catalogue", "postcards offer sizes", pcSizes.size >= 7, `${pcSizes.size}`);
check("catalogue", "postcards offer papers", pcPapers.size >= 10, `${pcPapers.size}`);
check("catalogue", "postcards offer quantities", pcQty.size >= 5, `${pcQty.size}`);
check("catalogue", "postcard prices are positive", Object.values(postcards.prices).every((v) => v > 0));

const bSizes = new Set(Object.keys(bannersScraped.prices).map((k) => k.split("|")[0]));
const bMats = new Set(Object.keys(bannersScraped.prices).map((k) => k.split("|")[1]));
check("catalogue", "banners offer sizes", bSizes.size === 12, `${bSizes.size}`);
check("catalogue", "banners offer materials", bMats.size === 3, `${bMats.size}`);
check("catalogue", "banner prices are positive", Object.values(bannersScraped.prices).every((v) => v > 0));
check("catalogue", "grommets priced for every banner size", [...bSizes].every((s) => finishing.prices[`${s}|Grommets - 4 Corners|1`] !== undefined));
check("catalogue", "hemming is free", Object.entries(finishing.prices).filter(([k]) => k.includes("Hemming")).every(([, v]) => v === 0));
check("catalogue", "no grommets costs nothing", finishing.prices["3 ft x 6 ft|No Grommets|1"] === 0);

const materials = Object.keys(cat);
check("catalogue", "rigid signs offer five materials", materials.length === 5, materials.join(", "));
for (const m of materials) {
  const e = cat[m];
  check("catalogue", `${m}: has sizes`, e.sizes.length > 0, `${e.sizes.length}`);
  check("catalogue", `${m}: has shapes`, e.shapes.length > 0, `${e.shapes.length}`);
  check("catalogue", `${m}: has thicknesses`, e.thicknesses.length > 0, `${e.thicknesses.length}`);
  check("catalogue", `${m}: has quantities`, e.quantities.length > 0, `${e.quantities.length}`);
  check("catalogue", `${m}: every size has real dimensions`, e.sizes.every((s) => s.widthIn > 0 && s.heightIn > 0 && s.dpi >= 100));
}
check("catalogue", "foam alone has a grade choice", cat["foam-boards"].types.length === 2 && materials.filter((m) => cat[m].types.length).length === 1);

/* ─── 5. Live pricing endpoint ─────────────────────────────────────────── */
{
  const body = (o) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) });
  const y = cat["yard-signs"];
  const shape = y.shapes[0];
  const size = y.sizes.find((s) => y.pairs.some(([sz, sh]) => sz === s.id && sh === shape.id)) ?? y.sizes[0];
  const spec = { material: "yard-signs", sizeId: size.id, shapeId: shape.id, thickness: y.thicknesses[0].value, type: "", color: y.colors[0].value, quantity: y.quantities[0] };
  const { res } = await get("/api/price/rigid-signs", body(spec));
  const j = await res.json();
  check("pricing", "rigid sign quote returns a price", j.valid === true && j.total > 0, `$${j.total}`);

  const { res: bad } = await get("/api/price/rigid-signs", body({ ...spec, quantity: 999999 }));
  const jb = await bad.json();
  check("pricing", "unquoted quantity is refused, not guessed", jb.valid === false);

  const { res: junk } = await get("/api/price/rigid-signs", body({ material: "nope" }));
  check("pricing", "malformed quote request rejected", junk.status === 400, String(junk.status));
}

/* ─── 6. Print geometry ────────────────────────────────────────────────── */
{
  const cases = [
    ["business-cards", 3.5, 2, 3.6, 2.1],
    ["postcards", 4, 6, 4.25, 6.25],
    ["postcards", 6, 11, 6.25, 11.25],
    ["banners", 36, 72, 36.25, 72.25],
    ["rigid-signs", 18, 24, 18.25, 24.25],
  ];
  const { printSpec, docSize } = await import("../lib/print/spec.ts").catch(() => ({}));
  if (!printSpec) {
    for (const [p] of cases) skip("geometry", `${p} document size`, "spec module not loadable here");
  } else {
    for (const [p, w, h, ew, eh] of cases) {
      const d = docSize(printSpec(p, w, h));
      check("geometry", `${p} ${w}x${h} document`, d.widthIn === ew && d.heightIn === eh, `${d.widthIn} x ${d.heightIn} in`);
    }
  }
}

/* ─── 7. Browser: layout, controls, accessibility ──────────────────────── */
const browser = await chromium.launch();

for (const [slug, expectControls] of [
  ["business-cards", ["Size", "Paper Stock", "Sides", "Quantity"]],
  ["postcards", ["Size", "Paper Stock", "Printed Sides", "Quantity"]],
  ["banners", ["Size", "Material", "Grommets", "Quantity"]],
  ["rigid-signs", ["Material", "Shape", "Size", "Thickness", "Printed Sides", "Quantity"]],
]) {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1100 } })).newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 80)));
  await page.goto(`${BASE}/services/${slug}/order`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(4500);

  const seen = await page.evaluate(() =>
    [...document.querySelectorAll("[role=combobox]")].map((e) => e.getAttribute("aria-label")).filter(Boolean));
  for (const c of expectControls) {
    check("builder", `${slug}: ${c} control present`, seen.includes(c), seen.length ? "" : "no comboboxes found");
  }
  check("builder", `${slug}: no console errors`, errors.length === 0, errors[0] ?? "");

  const qty = await page.evaluate(() => {
    const el = [...document.querySelectorAll("[role=combobox]")].find((e) => e.getAttribute("aria-label") === "Quantity");
    return el?.textContent?.trim() ?? null;
  });
  check("builder", `${slug}: quantity is not preselected`, /choose/i.test(qty ?? ""), qty ?? "no control");

  await page.close();
}

/* accessibility */
for (const p of ["/", "/services", "/pricing", "/contact", "/services/business-cards/order", "/services/banners/order", "/services/rigid-signs/order"]) {
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
    return r.violations.map((x) => `${x.id}(${x.nodes.length})`);
  });
  check("a11y", `${p} has no WCAG AA violations`, v.length === 0, v.join(", "));
  await page.close();
}

/* responsive: nothing may scroll sideways */
for (const [label, w] of [["mobile", 390], ["tablet", 768], ["desktop", 1440]]) {
  for (const p of ["/", "/pricing", "/services/banners/order"]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(2000);
    const over = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    check("responsive", `${p} at ${label} does not scroll sideways`, !over);
    await page.close();
  }
}

/* imagery reflects the product sold */
{
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  await page.goto(`${BASE}/services/banners`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(2500);
  const alts = await page.evaluate(() => [...document.querySelectorAll("img")].map((i) => i.alt).join(" | "));
  check("content", "banner imagery describes a hung vinyl banner", /grommet|rope|hemmed/i.test(alts), alts.slice(0, 70));
  check("content", "no roll-up language on the banner page", !/roll-?up|retractable/i.test(await page.evaluate(() => document.body.innerText)));
  await page.close();
}

/* ─── 8. Performance ───────────────────────────────────────────────────── */
for (const p of ["/", "/pricing", "/services/business-cards/order"]) {
  const { res, ms } = await get(p + "?cb=" + Math.random());
  const size = (await res.text()).length;
  check("perf", `${p} responds under 2s`, ms < 2000, `${ms}ms`);
  check("perf", `${p} html under 400KB`, size < 400_000, `${(size / 1024).toFixed(0)}KB`);
}

await browser.close();

/* ─── summary ──────────────────────────────────────────────────────────── */
const pass = results.filter((r) => r.status === "PASS").length;
const fail = results.filter((r) => r.status === "FAIL");
const skipped = results.filter((r) => r.status === "SKIP");
console.log(`\n=== ${n} checks: ${pass} passed, ${fail.length} failed, ${skipped.length} skipped ===`);
if (fail.length) {
  console.log("\nfailures:");
  for (const f of fail) console.log(`  ${f.n}. [${f.area}] ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
}
if (skipped.length) {
  console.log("\nskipped:");
  for (const s of skipped) console.log(`  ${s.n}. [${s.area}] ${s.name} — ${s.detail}`);
}
fs.writeFileSync("audit-results.json", JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));
process.exitCode = fail.length ? 1 : 0;
