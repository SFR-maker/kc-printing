import { chromium } from "@playwright/test";

const BASE = "http://localhost:3100";
const OUT = "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/19242b49-374e-4aaa-82b5-44b8d9f5b410/scratchpad";
const SLUG = "florist-bold-block";
const CARD_W_IN = 3.6;
const CARD_H_IN = 2.1;

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` :: ${detail}` : ""}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

await page.goto(`${BASE}/services/business-cards/design/t-${SLUG}`);
await page.waitForSelector("canvas");
await page.waitForTimeout(1500);

// ---------- 4. template placeholder prompt ----------
const prompt = page.locator('[data-testid="placeholder-prompt"]');
check("editor warns that template details are samples", await prompt.isVisible());
console.log("   prompt text:", (await prompt.innerText()).replace(/\s+/g, " "));
await page.screenshot({ path: `${OUT}/01-editor-prompt.png` });

// ---------- helpers ----------
const canvas = page.locator("canvas").first();
async function pointIn(xIn, yIn) {
  const box = await canvas.boundingBox();
  return { x: box.x + (xIn / CARD_W_IN) * box.width, y: box.y + (yIn / CARD_H_IN) * box.height };
}
const panel = page.locator("div.w-64").last();
const panelText = () => panel.innerText();

// Blank part of the phone text box — sits on top of the black block shape, away from the glyphs.
// This is the click that used to select the shape.
const phonePoint = await pointIn(2.6, 1.455);

// ---------- 2a. clicking text selects the text, not the shape behind it ----------
await page.mouse.click(phonePoint.x, phonePoint.y);
await page.waitForTimeout(400);
let text = await panelText();
check("single click on text selects the text (not the shape)", text.includes("Text on the card") && !text.includes("Corner radius"), text.split("\n").slice(0, 3).join(" | "));

// ---------- 2b. text field is first and above the fold ----------
const textArea = page.locator("#element-text");
const taBox = await textArea.boundingBox();
const xField = page.locator('label:has-text("X (in)")').first();
const xBox = await xField.boundingBox();
check("text box sits above X/Y in the panel", taBox.y < xBox.y, `text y=${Math.round(taBox.y)} X y=${Math.round(xBox.y)}`);
check("text box is visible without scrolling at 1280x800", taBox.y + taBox.height < 800, `bottom=${Math.round(taBox.y + taBox.height)}`);
check("text box holds the selected text", (await textArea.inputValue()) === "(913) 555-0341", await textArea.inputValue());
await page.screenshot({ path: `${OUT}/02-text-selected.png` });

// ---------- 2c. double-click opens the text editor on the text ----------
await page.mouse.click(phonePoint.x, phonePoint.y, { clickCount: 2 });
await page.waitForTimeout(500);
const inlineEditor = page.locator("[data-canvas-text-editor]");
check("double-click opens the inline text editor", await inlineEditor.isVisible());
text = await panelText();
check("double-click leaves the TEXT selected in the panel", text.includes("Text on the card") && !text.includes("Corner radius"));
await page.screenshot({ path: `${OUT}/03-double-click-edit.png` });

await inlineEditor.fill("(816) 421-8890");
await inlineEditor.press("Enter");
await page.waitForTimeout(400);
check("typed replacement lands on the card", (await textArea.inputValue()) === "(816) 421-8890", await textArea.inputValue());

// ---------- 3. save status ----------
const status = page.locator('[data-testid="save-status"]');
const dirtyLabel = await status.innerText();
check("dirty state never claims to be saved", !/saved/i.test(dirtyLabel) || /not saved/i.test(dirtyLabel), dirtyLabel);
await page.waitForTimeout(4000);
const cleanLabel = await status.innerText();
check("clean state says so unambiguously", /all changes saved/i.test(cleanLabel), cleanLabel);
console.log(`   labels: dirty="${dirtyLabel}" clean="${cleanLabel}"`);

// edit again — the label must go back to a not-saved wording
await textArea.fill("(816) 421-8891");
await page.waitForTimeout(200);
const dirtyAgain = await status.innerText();
check("editing again returns to a not-saved label", !/all changes saved/i.test(dirtyAgain), dirtyAgain);
await page.waitForTimeout(4000);

// ---------- 1 + 4. proof screen ----------
await page.locator("button", { hasText: "Continue" }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/04-proof.png`, fullPage: true });

const consent = page.locator("label", { has: page.locator('input[type="checkbox"]') }).first();
const consentText = (await consent.innerText()).replace(/\s+/g, " ");
console.log("   checkbox reads:", consentText);
const lower = consentText.toLowerCase();
check("checkbox drops 'bleed'", !lower.includes("bleed"));
check("checkbox drops 'safe zone'", !lower.includes("safe zone"));
check("checkbox drops 'low-resolution'", !lower.includes("low-resolution"));
check("checkbox speaks plainly", lower.includes("phone number") && lower.includes("both sides"));
const notesShown =
  (await page.locator("text=Please fix these before ordering").count()) +
  (await page.locator("text=Worth a look before you order").count());
check("only cites notes that are actually on screen", lower.includes("notes above") === notesShown > 0, `notes on screen=${notesShown}`);

const placeholderCard = page.locator("text=This card still has our sample details on it");
check("proof flags leftover sample details", await placeholderCard.isVisible());
const proofBody = await page.locator("body").innerText();
check("names the leftover email", proofBody.includes("rosa@lindqvistflowers.com"));
check("does not flag the phone number that was replaced", !proofBody.includes("(913) 555-0341"));

const confirm = page.locator("button", { hasText: "Confirm and Continue to Order" });
check("confirm starts disabled", await confirm.isDisabled());
await page.locator('input[type="checkbox"]').first().check();
check("confirm still blocked while sample details remain", await confirm.isDisabled());
await page.locator("text=These really are my details").click();
await page.waitForTimeout(200);
check("confirm available once the customer vouches for them", await confirm.isEnabled());
await page.screenshot({ path: `${OUT}/05-proof-accepted.png`, fullPage: true });

// ---------- a design with no leftovers reaches confirm straight away ----------
await page.goto(`${BASE}/services/business-cards/design/new`);
await page.waitForSelector("canvas");
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Heading", exact: true }).click();
await page.waitForTimeout(600);
await page.locator("button", { hasText: "Continue" }).first().click();
await page.waitForTimeout(1000);
const blankConsent = (await page.locator("label", { has: page.locator('input[type="checkbox"]') }).first().innerText()).replace(/\s+/g, " ");
console.log("   blank-card checkbox reads:", blankConsent);
const blankNotes =
  (await page.locator("text=Please fix these before ordering").count()) +
  (await page.locator("text=Worth a look before you order").count());
check("blank card: checkbox matches what is shown", blankConsent.toLowerCase().includes("notes above") === blankNotes > 0, `notes=${blankNotes}`);
await page.screenshot({ path: `${OUT}/06-proof-blank.png`, fullPage: true });

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
