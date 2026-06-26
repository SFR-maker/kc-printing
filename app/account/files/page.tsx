import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function FilesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) redirect("/sign-in");

  const uploads = await db.upload.findMany({
    where: { userId: user.id },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">My Files</h1>
      {uploads.length === 0 ? (
        <p className="text-kc-muted text-sm">No files uploaded yet. Files can be uploaded during the order process or from your project page.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploads.map((file) => (
            <Card key={file.id} className="border-kc-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-kc-teal/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-kc-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-kc-dark truncate">{file.fileName}</div>
                  <div className="text-xs text-kc-muted">
                    {new Date(file.uploadedAt).toLocaleDateString()}
                    {file.fileSize && ` - ${(file.fileSize / 1024 / 1024).toFixed(1)} MB`}
                  </div>
                </div>
                <Button asChild size="icon" variant="ghost" className="shrink-0">
                  <a href={file.url} download={file.fileName} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
