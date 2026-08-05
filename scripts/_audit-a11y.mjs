import fs from "node:fs";
import { chromium } from "@playwright/test";

/**
 * WCAG audit across the public site and the order flows, using axe-core against production.
 *
 * Run with a real browser rather than static analysis so computed colour, focus order and ARIA
 * state are measured as a screen reader would encounter them.
 */

const AXE = fs.readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const BASE = process.env.AUDIT_BASE ?? "https://611printing.com";

const PAGES = [
  "/", "/services", "/services/business-cards", "/services/business-cards/order",
  "/services/banners/order", "/services/postcards/order", "/services/rigid-signs/order",
  "/pricing", "/contact", "/faq", "/about", "/terms", "/privacy", "/sign-in",
];

const browser = await chromium.launch();
const results = [];

for (const path of PAGES) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(2500);
    await page.addScriptTag({ content: AXE });
    const r = await page.evaluate(async () => {
      // @ts-ignore
      const out = await window.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      });
      return out.violations.map((v) => ({
        id: v.id, impact: v.impact, help: v.help, n: v.nodes.length,
        sample: v.nodes[0]?.html?.slice(0, 110) ?? "",
        target: v.nodes[0]?.target?.[0] ?? "",
      }));
    });
    results.push({ path, violations: r });
    const crit = r.filter((v) => v.impact === "critical" || v.impact === "serious").length;
    console.log(`${path.padEnd(38)} ${String(r.length).padStart(2)} violations (${crit} serious+)`);
  } catch (e) {
    console.log(`${path.padEnd(38)} ERROR ${String(e).slice(0, 60)}`);
  }
  await ctx.close();
}

console.log("\n=== consolidated, by rule ===");
const byRule = {};
for (const p of results) {
  for (const v of p.violations) {
    (byRule[v.id] ??= { impact: v.impact, help: v.help, pages: [], nodes: 0, sample: v.sample, target: v.target });
    byRule[v.id].pages.push(p.path);
    byRule[v.id].nodes += v.n;
  }
}
const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
for (const [id, v] of Object.entries(byRule).sort((a, b) => (order[a[1].impact] ?? 9) - (order[b[1].impact] ?? 9))) {
  console.log(`\n[${(v.impact ?? "?").toUpperCase()}] ${id} - ${v.help}`);
  console.log(`  ${v.nodes} nodes across ${v.pages.length} pages: ${v.pages.slice(0, 5).join(", ")}${v.pages.length > 5 ? " …" : ""}`);
  console.log(`  target: ${v.target}`);
  console.log(`  sample: ${v.sample}`);
}
if (!Object.keys(byRule).length) console.log("  none");
await browser.close();
