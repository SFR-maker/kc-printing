/**
 * What the editor's save indicator is allowed to say, and when.
 *
 * The rule this module exists to enforce: the indicator must never describe a design as saved
 * unless the server has actually accepted it. It used to get this wrong in three separate ways.
 *
 *  1. It was derived inline from `dirty` alone, so a *failed* save read "Saved as guest" — the
 *     autosave marked the design clean whether or not the request had succeeded.
 *  2. The same guest read "Unsaved changes" a moment earlier and "Saved as guest" a moment later,
 *     one slot carrying two meanings for what a customer experiences as one situation.
 *  3. A design opened from a template read "Saved as guest" *on arrival* — before a single
 *     keystroke, with nothing on the server at all — because a pristine design is not dirty, and
 *     not-dirty was being read as saved. This is the worst of the three: it is the state a customer
 *     is in when they close the tab believing their work is somewhere.
 *
 * Cleanliness is not the same fact as existence. `dirty` says whether there are edits since the
 * last save; `savedOnce` says whether a save has ever succeeded. Only both together mean "saved".
 */
export type SaveStatus = "saving" | "unsaved" | "saved" | "failed";

export interface SaveStatusInput {
  /** A save request is in flight right now. */
  saving: boolean;
  /** The last save attempt did not succeed. */
  saveFailed: boolean;
  /** There are edits since the last successful save. */
  dirty: boolean;
  /**
   * The server has accepted this design at least once — either it was opened from a saved design,
   * or a save has since succeeded. False for a design that has only ever existed in this browser.
   */
  savedOnce: boolean;
}

export function deriveSaveStatus({ saving, saveFailed, dirty, savedOnce }: SaveStatusInput): SaveStatus {
  if (saving) return "saving";
  if (saveFailed) return "failed";
  if (dirty) return "unsaved";
  return savedOnce ? "saved" : "unsaved";
}

/**
 * Says what is true of the design right now, in words a customer can act on.
 *
 * "saved" is the only branch that claims anything, and deriveSaveStatus only reaches it for a
 * design the server has. Everything else says plainly that the work is not safe yet.
 */
export function saveStatusLabel(status: SaveStatus, isSignedIn?: boolean): string {
  if (status === "saving") return "Saving...";
  if (status === "failed") return "Not saved - we'll keep trying";
  if (status === "unsaved") return "Not saved yet";
  return isSignedIn === false ? "All changes saved as guest" : "All changes saved";
}
