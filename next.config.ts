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
  // No CSP yet: Clerk, Stripe, and UploadThing all inject scripts and frames, and a wrong
  // `script-src` would break checkout and sign-in. That needs its own pass with report-only first.
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
