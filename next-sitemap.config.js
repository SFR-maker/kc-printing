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
const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://kcprinting.com").trim().replace(/\/+$/, "");

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
  transform: async (config, path) => {
    const priority =
      path === "/" ? 1.0 :
      path.startsWith("/services/") && !path.includes("/order") ? 0.9 :
      path === "/pricing" ? 0.8 :
      path === "/portfolio" ? 0.8 :
      path === "/contact" ? 0.8 :
      0.7;
    return { loc: path, changefreq: "weekly", priority, lastmod: new Date().toISOString() };
  },
};
