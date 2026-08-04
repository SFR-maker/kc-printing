import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-only route indicator badge has no safe corner on narrow viewports — bottom-left sat on
  // the business card editor's mobile toolbar, top-right sits on the order-flow "Continue" button.
  // It doesn't appear in production either way, so just hide it rather than chasing a safe spot.
  devIndicators: false,
  // pdfkit loads its built-in font metrics (AFM files) from disk relative to its own package
  // directory at runtime. Bundling it through Turbopack/webpack breaks that relative path
  // resolution (ENOENT on Helvetica.afm), so it must run as a plain, unbundled Node require.
  serverExternalPackages: ["pdfkit", "svg-to-pdfkit"],
  // lib/business-card/export.ts reads these TTF files at runtime via a computed fs.readFileSync
  // path (for pdfkit.registerFont), which Next's automatic file-tracing can't see since it only
  // follows static require/import calls — without this they'd be missing from the deployed
  // serverless function bundle even though everything works locally.
  outputFileTracingIncludes: {
    "/api/card-designs/export": ["./lib/business-card/fonts-ttf/*.ttf"],
  },
  // Baseline security headers. Vercel already sends HSTS; everything below was absent.
  //
  // CSP is split deliberately. Three directives are ENFORCED because they cannot break a third
  // party that only injects scripts and frames: nothing on this site uses <object>/<embed>, no page
  // sets a <base>, and framing was already denied by X-Frame-Options. The full policy runs
  // REPORT-ONLY, because Clerk, Stripe and UploadThing each inject their own scripts and iframes and
  // a wrong `script-src` takes sign-in and checkout down with it. Watch the reports, then promote.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Editor and order pages must not be frameable - clickjacking on a checkout flow.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Enforced: no plugin content, no <base> hijacking, no framing by other origins.
          {
            key: "Content-Security-Policy",
            value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
          },
          // Report-only: the full policy, so violations surface before anything is blocked.
          {
            key: "Content-Security-Policy-Report-Only",
            value: [
              "default-src 'self'",
              // 'unsafe-inline'/'unsafe-eval' are Next's hydration payload and Clerk's loader.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://js.stripe.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.ufs.sh https://utfs.io https://img.clerk.com https://images.clerk.dev",
              "font-src 'self' data:",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.stripe.com https://*.uploadthing.com https://*.ufs.sh",
              "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "frame-ancestors 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "uploadthing.com" },
      { protocol: "https", hostname: "*.uploadthing.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default nextConfig;
