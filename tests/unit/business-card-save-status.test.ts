import { describe, it, expect } from "vitest";
import {
  deriveSaveStatus,
  saveStatusLabel,
  type SaveStatusInput,
} from "@/components/business-card/save-status";

/** A design the server has, with no edits pending — the only genuinely saved state. */
const settled: SaveStatusInput = { saving: false, saveFailed: false, dirty: false, savedOnce: true };

describe("save status", () => {
  it("says saved only when the server has the design and nothing is pending", () => {
    expect(deriveSaveStatus(settled)).toBe("saved");
  });

  it("never says saved for a design that has never reached the server", () => {
    // A template opened and not yet touched: clean, but nowhere but this browser.
    expect(deriveSaveStatus({ ...settled, savedOnce: false })).toBe("unsaved");
  });

  it("never says saved while there are edits since the last save", () => {
    expect(deriveSaveStatus({ ...settled, dirty: true })).toBe("unsaved");
  });

  it("never says saved after a save that failed, however clean the design looks", () => {
    expect(deriveSaveStatus({ ...settled, saveFailed: true })).toBe("failed");
    expect(deriveSaveStatus({ ...settled, saveFailed: true, dirty: true })).toBe("failed");
  });

  it("reports an in-flight save ahead of everything else", () => {
    expect(deriveSaveStatus({ saving: true, saveFailed: true, dirty: true, savedOnce: false })).toBe("saving");
  });

  it("states the negative outright in every status that is not saved", () => {
    // "Not saved yet" is fine; anything a customer could skim as reassurance is not.
    for (const status of ["unsaved", "failed"] as const) {
      expect(saveStatusLabel(status, false)).toMatch(/^Not saved/);
    }
    expect(saveStatusLabel("saving", false)).toBe("Saving...");
    expect(saveStatusLabel("saved", false)).toBe("All changes saved as guest");
    expect(saveStatusLabel("saved", true)).toBe("All changes saved");
  });

  it("tells a guest plainly when nothing has been saved yet", () => {
    expect(saveStatusLabel(deriveSaveStatus({ ...settled, savedOnce: false }), false)).toBe("Not saved yet");
  });
});
