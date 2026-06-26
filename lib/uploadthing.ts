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
