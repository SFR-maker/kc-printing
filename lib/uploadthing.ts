import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { sanitizeFileName } from "@/lib/utils";

const f = createUploadthing();

export const ourFileRouter = {
  designFile: f({
    "image/png": { maxFileSize: "32MB" },
    "image/jpeg": { maxFileSize: "32MB" },
    "image/gif": { maxFileSize: "32MB" },
    "application/pdf": { maxFileSize: "32MB" },
    blob: { maxFileSize: "32MB", maxFileCount: 5 },
  })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const user = await db.user.findUnique({ where: { clerkId: metadata.userId } });
      if (!user) return;
      await db.upload.create({
        data: {
          userId: user.id,
          url: file.url,
          fileName: sanitizeFileName(file.name),
          fileType: file.type ?? "application/octet-stream",
          fileSize: file.size,
        },
      });
    }),

  cardAsset: f({
    "image/png": { maxFileSize: "16MB", maxFileCount: 1 },
    "image/jpeg": { maxFileSize: "16MB", maxFileCount: 1 },
    "image/webp": { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      // Anonymous visitors may design before signing in, so uploads here are intentionally not gated on auth.
      // File type is restricted at the route config level (png/jpeg/webp only); server-side MIME sniffing
      // happens again in element-factory validation on the client before the asset is added to the canvas.
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, name: file.name, size: file.size };
    }),

  brandFile: f({
    "image/png": { maxFileSize: "32MB", maxFileCount: 10 },
    "image/jpeg": { maxFileSize: "32MB", maxFileCount: 10 },
    "image/gif": { maxFileSize: "32MB", maxFileCount: 10 },
    "image/bmp": { maxFileSize: "32MB", maxFileCount: 10 },
    "application/pdf": { maxFileSize: "32MB", maxFileCount: 10 },
    // Catches formats browsers don't map to a standard MIME type (TIF, EPS, AI, PSD) — the order
    // form advertises those extensions, and UploadThing routes anything unrecognized here instead
    // of rejecting it outright.
    blob: { maxFileSize: "32MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      // Guest checkout doesn't require an account (see app/api/orders), so brand-file uploads on
      // the order form's Details step must stay unauthenticated too.
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url, name: file.name, size: file.size };
    }),

  portfolioImage: f({ "image/jpeg": { maxFileSize: "8MB" }, "image/png": { maxFileSize: "8MB" }, "image/webp": { maxFileSize: "8MB" } })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      const user = await db.user.findUnique({ where: { clerkId: userId } });
      if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) throw new Error("Forbidden");
      return { userId: user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
