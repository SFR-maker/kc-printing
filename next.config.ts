import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfkit loads its built-in font metrics (AFM files) from disk relative to its own package
  // directory at runtime. Bundling it through Turbopack/webpack breaks that relative path
  // resolution (ENOENT on Helvetica.afm), so it must run as a plain, unbundled Node require.
  serverExternalPackages: ["pdfkit", "svg-to-pdfkit"],
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
