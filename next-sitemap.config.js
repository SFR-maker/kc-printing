/**
 * Runs from the `postbuild` npm script, which is why vercel.json's buildCommand must be
 * `npm run build` and not a bare `next build` - calling the binary directly skips npm lifecycle
 * scripts, and the site shipped for months with no sitemap.xml and no robots.txt because of it.
 *
 * Do not add explanatory keys to vercel.json. Its schema sets additionalProperties:false, so an
 * unrecognised key (a "_comment", for instance) fails the deployment during validation, before the
 * build even starts.
 *
 * @type {import('next-sitemap').IConfig}
 */
// NEXT_PUBLIC_APP_URL is stored in Vercel with a trailing newline. `new URL()` normalises that away,
// so metadataBase/canonical/og were unaffected, but next-sitemap interpolates the raw string - which
// split every <loc> across two lines and made the whole sitemap invalid. Trim defensively here so a
// stray newline or slash in the env value can never break it again.
const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://611printing.com").trim().replace(/\/+$/, "");

module.exports = {
  siteUrl,
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/admin", "/account", "/api"] },
    ],
  },
  // /success and /cancel are checkout outcomes, not landing pages - they carry no content
  // worth ranking and look like dead ends to anyone arriving from a search result.
  exclude: ["/admin/*", "/account/*", "/api/*", "/sign-in", "/sign-up", "/success", "/cancel"],
  changefreq: "weekly",
  priority: 0.7,
  /**
   * Spanish twins are declared as hreflang alternates on the English entry rather than being left to
   * stand alone.
   *
   * next-sitemap discovers /es/* from the build output and would otherwise emit ten unrelated URLs.
   * Pairing them tells a crawler these are the same pages in two languages, which is what stops the
   * Spanish product page from competing with the English one for the same query.
   *
   * Duplicated from lib/i18n/config rather than imported: this file is CommonJS and runs under plain
   * node during `postbuild`, where a TypeScript ES module cannot be required. A test asserts the two
   * tables agree, so the copy cannot drift unnoticed.
   */
  alternateRefs: [],
  transform: async (config, path) => {
    const ES_BY_EN = {
      "/": "/es",
      "/services": "/es/servicios",
      "/services/business-cards": "/es/servicios/tarjetas-de-presentacion",
      "/services/postcards": "/es/servicios/postales",
      "/services/banners": "/es/servicios/lonas-publicitarias",
      "/services/rigid-signs": "/es/servicios/letreros-rigidos",
      "/services/window-decals": "/es/servicios/calcomanias-para-ventanas",
      "/specials": "/es/especiales",
      "/pricing": "/es/precios",
      "/about": "/es/nosotros",
      "/contact": "/es/contacto",
      "/faq": "/es/preguntas-frecuentes",
      "/portfolio": "/es/portafolio",
    };

    // Spanish URLs are emitted as alternates of their English original, never as entries of their
    // own - listing both would advertise every translated page twice.
    const isSpanish = path === "/es" || path.startsWith("/es/");
    if (isSpanish) return null;

    const priority =
      path === "/" ? 1.0 :
      path.startsWith("/services/") && !path.includes("/order") ? 0.9 :
      path === "/pricing" ? 0.8 :
      path === "/portfolio" ? 0.8 :
      path === "/specials" ? 0.8 :
      path === "/contact" ? 0.8 :
      0.7;

    const es = ES_BY_EN[path];
    return {
      loc: path,
      changefreq: "weekly",
      priority,
      lastmod: new Date().toISOString(),
      alternateRefs: es
        ? [
            { href: `${siteUrl}${path}`, hreflang: "en-US", hrefIsAbsolute: true },
            { href: `${siteUrl}${es}`, hreflang: "es-US", hrefIsAbsolute: true },
            { href: `${siteUrl}${path}`, hreflang: "x-default", hrefIsAbsolute: true },
          ]
        : [],
    };
  },
};
