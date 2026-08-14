import { chromium } from "@playwright/test";

const BASE = "http://localhost:3100";
const OUT = "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/19242b49-374e-4aaa-82b5-44b8d9f5b410/scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("console", (m) => console.log("   [console]", m.text()));
await page.goto(`${BASE}/services/business-cards/design/t-florist-bold-block`);
await page.waitForSelector("canvas");
await page.waitForTimeout(1500);

const canvas = page.locator("canvas").first();
const box = await canvas.boundingBox();
const pt = (xIn, yIn) => ({ x: box.x + (xIn / 3.6) * box.width, y: box.y + (yIn / 2.1) * box.height });
const panel = page.locator("div.w-64").last();

const p = pt(2.6, 1.455);

async function report(label) {
  const t = (await panel.innerText()).replace(/\s+/g, " ").slice(0, 60);
  const editor = await page.locator("[data-canvas-text-editor]").count();
  console.log(`${label}: panel="${t}" inlineEditor=${editor}`);
}

await page.mouse.click(p.x, p.y);
await page.waitForTimeout(300);
await report("after single click");

// human-paced double click
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(120);
await page.mouse.click(p.x, p.y);
await page.waitForTimeout(500);
await report("after paced double click");

await page.screenshot({ path: `${OUT}/dbg-1.png` });

// playwright dblclick helper
await page.mouse.dblclick(p.x, p.y);
await page.waitForTimeout(500);
await report("after mouse.dblclick");
await page.screenshot({ path: `${OUT}/dbg-2.png` });

await browser.close();
