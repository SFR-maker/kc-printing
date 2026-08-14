import { describe, it, expect } from "vitest";
import { OCCUPATION_TERMS, categoriesForQuery, normalise, termsForCategory, matchesQuery, queryTokens } from "@/lib/business-card/templates/occupations";
import { CATEGORIES } from "@/lib/business-card/templates/categories";

/**
 * Category slugs are the shop's filing system; customers type the job they do. Every miss here
 * shows the customer an empty gallery for a trade that has dozens of cards, so these lock the
 * searches people actually run.
 */

describe("occupation search", () => {
  it("finds the trade from the job title", () => {
    const cases: [string, string][] = [
      ["plumber", "plumbing"],
      ["electrician", "electrical"],
      ["sparky", "electrical"],
      ["hairdresser", "beauty-salon"],
      ["barber", "barber"],
      ["realtor", "real-estate"],
      ["estate agent", "real-estate"],
      ["mechanic", "automotive"],
      ["roofer", "roofing"],
      ["gardener", "landscaping"],
      ["dog walker", "pets-animals"],
      ["nanny", "childcare"],
      ["personal trainer", "fitness"],
      ["chef", "restaurant"],
      ["dentist", "dental"],
      ["solicitor", "legal"],
      ["accountant", "accounting"],
      ["tattoo artist", "tattoo"],
      ["photographer", "photography"],
      ["removals", "moving"],
      ["exterminator", "pest-control"],
      ["locksmith", "security"],
      ["massage therapist", "spa-massage"],
      ["wedding planner", "event-planning"],
      ["it support", "technology"],
    ];
    for (const [query, expected] of cases) {
      expect(categoriesForQuery(query), `"${query}" should reach ${expected}`).toContain(expected);
    }
  });

  it("handles both spellings and informal wording", () => {
    expect(categoriesForQuery("tyre")).toContain("automotive");
    expect(categoriesForQuery("tire")).toContain("automotive");
    expect(categoriesForQuery("colourist")).toContain("beauty-salon");
    expect(categoriesForQuery("aircon")).toContain("hvac");
    expect(categoriesForQuery("man and van")).toContain("moving");
  });

  it("matches a partial word, and a longer phrase containing a term", () => {
    // Someone still typing.
    expect(categoriesForQuery("plumb")).toContain("plumbing");
    // Someone typing more than the term.
    expect(categoriesForQuery("emergency plumber near me")).toContain("plumbing");
  });

  it("ignores punctuation and case", () => {
    expect(categoriesForQuery("Real-Estate")).toContain("real-estate");
    expect(normalise("Real-Estate  Agent!")).toBe("real estate agent");
  });

  it("does not fire on a single character", () => {
    expect(categoriesForQuery("p")).toEqual([]);
    expect(categoriesForQuery(" ")).toEqual([]);
  });

  it("returns nothing for a query no trade uses", () => {
    expect(categoriesForQuery("zzzqqqx")).toEqual([]);
  });

  it("covers every category in the template library", () => {
    // A category with no terms is unreachable by occupation search, which is the failure this
    // whole module exists to prevent.
    const missing = CATEGORIES.map((c) => c.key).filter((k) => termsForCategory(k).length === 0);
    expect(missing, `categories with no occupation terms: ${missing.join(", ")}`).toEqual([]);
  });

  it("keeps terms lowercase and free of duplicates within a category", () => {
    for (const [slug, terms] of Object.entries(OCCUPATION_TERMS)) {
      expect(terms.every((t) => t === t.toLowerCase()), `${slug} has an uppercase term`).toBe(true);
      expect(new Set(terms).size, `${slug} repeats a term`).toBe(terms.length);
    }
  });
});

describe("multi-word queries", () => {
  it("finds a category from a phrase, not just a single word", () => {
    // "spring sale" returned 0 while "sale" returned 26, and "flower shop" returned generic retail
    // cards while "florist" found the right ones. Both are what a customer types first.
    expect(matchesQuery("SALE", "spring sale")).toBe(true);
    expect(matchesQuery("SPRING SERVICE SALE", "spring sale")).toBe(true);
    expect(categoriesForQuery("flower shop")).toContain("florist");
    expect(categoriesForQuery("emergency plumber near me")).toContain("plumbing");
  });

  it("still matches the whole phrase when it is present", () => {
    expect(matchesQuery("Grand Opening banner", "grand opening")).toBe(true);
  });

  it("ignores words too short to be meaningful", () => {
    expect(queryTokens("a of the sale")).toEqual(["the", "sale"]);
    expect(matchesQuery("Roof Repair", "of")).toBe(false);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery("Roof Repair", "spring sale")).toBe(false);
  });
});
