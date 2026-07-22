import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default bottom-left position sits directly on top of the business card editor's mobile
  // bottom toolbar (dev-only overlay, but it was blocking clicks on the first tab in local dev).
  devIndicators: {
    position: "top-right",
  },
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
