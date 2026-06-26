import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AdminUploadsPage() {
  const uploads = await db.upload.findMany({
    include: { user: true },
    orderBy: { uploadedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">File Uploads</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {uploads.map((file) => (
          <Card key={file.id} className="border-kc-border">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-kc-teal/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-kc-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-kc-dark truncate">{file.fileName}</div>
                <div className="text-xs text-kc-muted truncate">{file.user?.email ?? file.userId.slice(-8)}</div>
                <div className="text-xs text-kc-muted">{new Date(file.uploadedAt).toLocaleDateString()}</div>
              </div>
              <Button asChild size="icon" variant="ghost" className="shrink-0 h-7 w-7">
                <a href={file.url} download={file.fileName} target="_blank" rel="noopener noreferrer">
                  <Download className="h-3.5 w-3.5" />
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
        {uploads.length === 0 && <p className="text-kc-muted text-sm col-span-3">No uploads yet.</p>}
      </div>
    </div>
  );
}
