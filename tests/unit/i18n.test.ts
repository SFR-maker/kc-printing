import fs from "node:fs";
import { describe, it, expect } from "vitest";
import {
  LOCALES, DEFAULT_LOCALE, ROUTE_MAP, SERVICE_SLUG_ES,
  alternatePath, localeFromPath, localePath, serviceSlugFromEs,
} from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SERVICES } from "@/lib/service-data";
import { SERVICES_ES } from "@/lib/service-data-es";

/**
 * The failure modes worth testing here are the silent ones.
 *
 * A Spanish page that renders is obvious. A Spanish page whose "Contact us" button goes to the
 * English contact page, a route table that has drifted from the sitemap's copy of it, or a
 * dictionary key added in English and forgotten in Spanish all render perfectly and are wrong.
 */

describe("locales", () => {
  it("has English as the default", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["en", "es"]);
  });

  it("recognises Spanish paths and only Spanish paths", () => {
    expect(localeFromPath("/es")).toBe("es");
    expect(localeFromPath("/es/servicios")).toBe("es");
    expect(localeFromPath("/")).toBe("en");
    expect(localeFromPath("/services")).toBe("en");
    // "/espanol" starts with "/es" as a string but is not the Spanish tree.
    expect(localeFromPath("/especiales")).toBe("en");
    expect(localeFromPath("/estimates")).toBe("en");
  });
});

describe("route map", () => {
  it("maps every English route to a Spanish one and back", () => {
    for (const [en, es] of Object.entries(ROUTE_MAP)) {
      expect(alternatePath(en, "es"), en).toBe(es);
      expect(alternatePath(es, "en"), es).toBe(en);
    }
  });

  it("gives every Spanish route a distinct URL", () => {
    const es = Object.values(ROUTE_MAP);
    expect(new Set(es).size).toBe(es.length);
  });

  it("puts every Spanish route under /es", () => {
    for (const es of Object.values(ROUTE_MAP)) {
      expect(es === "/es" || es.startsWith("/es/"), es).toBe(true);
    }
  });

  it("translates the URL segments rather than only the content", () => {
    // The whole point of route-based i18n: /es/services/window-decals would rank for nothing.
    for (const [en, es] of Object.entries(ROUTE_MAP)) {
      if (en === "/") continue;
      expect(es, `${en} was not translated`).not.toBe(`/es${en}`);
    }
  });

  it("returns null rather than guessing for an untranslated page", () => {
    expect(alternatePath("/services/window-decals/order", "es")).toBeNull();
    expect(alternatePath("/account/orders", "es")).toBeNull();
    expect(alternatePath("/es/no-existe", "en")).toBeNull();
  });

  it("ignores a trailing slash", () => {
    expect(alternatePath("/services/", "es")).toBe("/es/servicios");
  });

  it("leaves English paths untouched in the English locale", () => {
    for (const en of Object.keys(ROUTE_MAP)) {
      expect(localePath(en, "en")).toBe(en);
    }
  });

  it("falls back to the English path when there is no translation", () => {
    // Correct for the order flow, which is genuinely English-only.
    expect(localePath("/services/window-decals/order", "es")).toBe("/services/window-decals/order");
  });
});

describe("service slugs", () => {
  it("covers every product the storefront sells", () => {
    expect(Object.keys(SERVICE_SLUG_ES).sort()).toEqual(Object.keys(SERVICES).sort());
  });

  it("round-trips each slug", () => {
    for (const [en, es] of Object.entries(SERVICE_SLUG_ES)) {
      expect(serviceSlugFromEs(es)).toBe(en);
    }
  });

  it("agrees with the route map", () => {
    for (const [en, es] of Object.entries(SERVICE_SLUG_ES)) {
      expect(ROUTE_MAP[`/services/${en}`]).toBe(`/es/servicios/${es}`);
    }
  });

  it("returns null for something that is not a service", () => {
    expect(serviceSlugFromEs("no-existe")).toBeNull();
  });
});

describe("dictionaries", () => {
  it("fills every key in both locales", () => {
    const en = getDictionary("en");
    const es = getDictionary("es");
    for (const section of Object.keys(en) as (keyof typeof en)[]) {
      for (const key of Object.keys(en[section])) {
        const value = (es[section] as Record<string, string>)[key];
        expect(value, `es.${section}.${key}`).toBeTypeOf("string");
      }
    }
  });

  /**
   * Strings that are correctly identical in both languages.
   *
   * An allowlist rather than a tolerance, so a genuinely untranslated string still fails the moment
   * it appears. "Legal" is the same word in Spanish; anything else showing up here is a bug.
   */
  const IDENTICAL_BY_DESIGN = new Set(["footer.legalHeading"]);

  it("actually translates rather than copying English through", () => {
    const en = getDictionary("en");
    const es = getDictionary("es");
    const untranslated: string[] = [];
    let total = 0;
    for (const section of Object.keys(en) as (keyof typeof en)[]) {
      for (const [key, value] of Object.entries(en[section])) {
        // orderFlowLanguageNote is intentionally empty in English - there is nothing to warn about.
        if (!value) continue;
        total++;
        const path = `${section}.${key}`;
        if ((es[section] as Record<string, string>)[key] === value && !IDENTICAL_BY_DESIGN.has(path)) {
          untranslated.push(path);
        }
      }
    }
    expect(total).toBeGreaterThan(40);
    expect(untranslated).toEqual([]);
  });

  it("warns Spanish readers that the order flow is in English", () => {
    expect(getDictionary("es").service.orderFlowLanguageNote).toMatch(/inglés/);
    // Empty in English, where there is nothing to warn about.
    expect(getDictionary("en").service.orderFlowLanguageNote).toBe("");
  });
});

describe("spanish product content", () => {
  it("covers every product", () => {
    expect(Object.keys(SERVICES_ES).sort()).toEqual(Object.keys(SERVICES).sort());
  });

  it("translates the name, tagline, description, specs and FAQs", () => {
    for (const slug of Object.keys(SERVICES)) {
      const en = SERVICES[slug];
      const es = SERVICES_ES[slug];
      expect(es.name, slug).not.toBe(en.name);
      expect(es.tagline, slug).not.toBe(en.tagline);
      expect(es.description, slug).not.toBe(en.description);
      expect(es.specs.length, slug).toBeGreaterThan(0);
      expect(es.faqs.length, slug).toBeGreaterThan(0);
      for (const faq of es.faqs) {
        expect(faq.q.length, slug).toBeGreaterThan(0);
        expect(faq.a.length, slug).toBeGreaterThan(0);
      }
    }
  });

  it("keeps prices and slugs identical to the English definition", () => {
    // A price that can be edited in one language and not the other is a bug waiting to happen.
    for (const slug of Object.keys(SERVICES)) {
      const en = SERVICES[slug];
      const es = SERVICES_ES[slug];
      expect(es.slug).toBe(en.slug);
      expect(es.packages.map((p) => p.price)).toEqual(en.packages.map((p) => p.price));
      expect(es.packages.map((p) => p.name)).toEqual(en.packages.map((p) => p.name));
      expect(es.addOns.map((a) => a.price)).toEqual(en.addOns.map((a) => a.price));
    }
  });

  it("gives every package and add-on translated copy", () => {
    for (const slug of Object.keys(SERVICES)) {
      const en = SERVICES[slug];
      const es = SERVICES_ES[slug];
      for (const [i, pkg] of es.packages.entries()) {
        expect(pkg.features.length, `${slug} package ${i}`).toBeGreaterThan(0);
        expect(pkg.features, `${slug} package ${i}`).not.toEqual(en.packages[i].features);
      }
      for (const [i, addOn] of es.addOns.entries()) {
        expect(addOn.desc, `${slug} add-on ${i}`).not.toBe(en.addOns[i].desc);
      }
    }
  });
});

describe("sitemap", () => {
  /**
   * next-sitemap.config.js is CommonJS and runs under plain node during `postbuild`, so it carries
   * its own copy of the route table rather than importing this one. That copy is exactly the kind
   * of duplication that silently rots, so it is compared here.
   */
  it("carries the same English-to-Spanish table as lib/i18n/config", () => {
    const source = fs.readFileSync("next-sitemap.config.js", "utf8");
    const block = source.match(/const ES_BY_EN = \{([\s\S]*?)\};/);
    expect(block, "ES_BY_EN not found in next-sitemap.config.js").toBeTruthy();

    const pairs: Record<string, string> = {};
    for (const line of block![1].split("\n")) {
      const m = line.match(/"([^"]+)":\s*"([^"]+)"/);
      if (m) pairs[m[1]] = m[2];
    }
    expect(pairs).toEqual(ROUTE_MAP);
  });
});
