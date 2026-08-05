import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { EDITOR_FONTS } from "@/lib/business-card/fonts";

/**
 * The PDF export registers one TrueType file per name, so a family that ships only its 700 cut
 * printed every weight bold - including body text whose proof showed it regular. Nothing failed and
 * nothing warned: the on-screen proof is rasterised by a different engine that resolves fonts by
 * name, so the two simply disagreed and only the printed piece was wrong.
 *
 * These check the files exist on both sides, since a missing one degrades silently to Helvetica.
 */

const SERVER_DIR = path.join(process.cwd(), "lib/business-card/fonts-ttf");
const PUBLIC_DIR = path.join(process.cwd(), "public/fonts");
const CSS = path.join(process.cwd(), "app/(public)/services/business-cards/design/editor-fonts.css");

describe("every editor font can actually be embedded", () => {
  it("ships the declared file for each family", () => {
    for (const font of EDITOR_FONTS) {
      expect(fs.existsSync(path.join(SERVER_DIR, font.file)), `${font.family}: ${font.file} missing`).toBe(true);
    }
  });

  it("ships a regular cut for every family bundled at 700", () => {
    // Without this the family has no 400 face and regular text is rendered with the bold file.
    for (const font of EDITOR_FONTS.filter((f) => f.weight === "700")) {
      expect(font.regularFile, `${font.family} has no regularFile`).toBeTruthy();
      expect(
        fs.existsSync(path.join(SERVER_DIR, font.regularFile!)),
        `${font.family}: ${font.regularFile} missing`,
      ).toBe(true);
    }
  });

  it("serves the same files to the browser, so the proof matches the print file", () => {
    for (const font of EDITOR_FONTS) {
      expect(fs.existsSync(path.join(PUBLIC_DIR, font.file)), `public/fonts/${font.file} missing`).toBe(true);
      if (font.regularFile) {
        expect(
          fs.existsSync(path.join(PUBLIC_DIR, font.regularFile)),
          `public/fonts/${font.regularFile} missing`,
        ).toBe(true);
      }
    }
  });

  it("declares both weights in the editor stylesheet", () => {
    const css = fs.readFileSync(CSS, "utf8");
    for (const font of EDITOR_FONTS.filter((f) => f.regularFile)) {
      expect(css, `${font.family} has no 400 face`).toContain(font.regularFile!);
    }
  });

  it("never points two families at the same regular file", () => {
    // A copy/paste slip here would silently print one family in another's typeface.
    const used = EDITOR_FONTS.filter((f) => f.regularFile).map((f) => f.regularFile!);
    expect(new Set(used).size).toBe(used.length);
  });
});
