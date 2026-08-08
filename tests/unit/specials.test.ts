import { describe, it, expect } from "vitest";
import { specialStatus, slugifySpecial } from "@/lib/specials-shared";

/**
 * lib/specials itself is `server-only` and imports Prisma, so it cannot be loaded in a test process.
 * What is testable without a database is the scheduling logic and the slug generator - which is
 * also where the bugs would be, since both decide things silently.
 */

const AT = new Date("2026-08-08T12:00:00Z");
const BEFORE = new Date("2026-08-01T00:00:00Z");
const AFTER = new Date("2026-09-01T00:00:00Z");

describe("specialStatus", () => {
  it("is live when switched on with no dates at all", () => {
    expect(specialStatus({ active: true, startsAt: null, endsAt: null }, AT)).toBe("live");
  });

  it("is off when switched off, whatever the dates say", () => {
    // Deactivating has to win over a live window, or turning a promotion off would do nothing.
    expect(specialStatus({ active: false, startsAt: null, endsAt: null }, AT)).toBe("off");
    expect(specialStatus({ active: false, startsAt: BEFORE, endsAt: AFTER }, AT)).toBe("off");
  });

  it("is scheduled before its start date", () => {
    expect(specialStatus({ active: true, startsAt: AFTER, endsAt: null }, AT)).toBe("scheduled");
  });

  it("is expired after its end date", () => {
    expect(specialStatus({ active: true, startsAt: null, endsAt: BEFORE }, AT)).toBe("expired");
  });

  it("is live inside its window", () => {
    expect(specialStatus({ active: true, startsAt: BEFORE, endsAt: AFTER }, AT)).toBe("live");
  });

  it("treats the end instant as already over", () => {
    // An offer "ending at midnight" should not still be running at midnight.
    expect(specialStatus({ active: true, startsAt: BEFORE, endsAt: AT }, AT)).toBe("expired");
  });

  it("treats the start instant as already begun", () => {
    expect(specialStatus({ active: true, startsAt: AT, endsAt: AFTER }, AT)).toBe("live");
  });
});

describe("slugifySpecial", () => {
  it("makes a URL segment from a title", () => {
    expect(slugifySpecial("Spring Window Graphics Sale")).toBe("spring-window-graphics-sale");
  });

  it("strips punctuation and collapses separators", () => {
    expect(slugifySpecial("20% off — everything!")).toBe("20-off-everything");
  });

  it("handles accented Spanish titles without producing an empty slug", () => {
    // Accented characters are stripped rather than transliterated; what matters is that something
    // usable and unique-ish comes out, since the create route suffixes on collision anyway.
    expect(slugifySpecial("Promoción de primavera")).toBe("promoci-n-de-primavera");
  });

  it("never returns an empty string", () => {
    // An empty slug would collide with itself on the second untitled special and break the URL.
    expect(slugifySpecial("")).toBe("special");
    expect(slugifySpecial("!!!")).toBe("special");
  });

  it("caps the length", () => {
    expect(slugifySpecial("a".repeat(200)).length).toBeLessThanOrEqual(60);
  });
});
