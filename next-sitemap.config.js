/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || "https://kcprinting.com",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      { userAgent: "*", allow: "/" },
      { userAgent: "*", disallow: ["/admin", "/account", "/api"] },
    ],
  },
  exclude: ["/admin/*", "/account/*", "/api/*", "/sign-in", "/sign-up"],
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
