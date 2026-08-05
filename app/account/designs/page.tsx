import Link from "next/link";
import { redirect } from "next/navigation";
import { Pencil } from "lucide-react";
import { ensureUser } from "@/lib/auth/ensure-user";
import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { CardSideSchema } from "@/lib/business-card/schema";
import { renderSideToSvg } from "@/lib/business-card/render-svg";
import { PRODUCT_ROUTE_SEGMENT, type DesignProduct } from "@/lib/business-card/print-spec";

/**
 * Designs saved to the account.
 *
 * Saving worked and there was nowhere to see the result: the account had Orders, Projects, Files,
 * Invoices and Settings, and the list endpoint this replaces had no caller at all. A design that
 * cannot be found again has not really been saved.
 *
 * Previews are rendered from the stored design rather than from thumbnailFront/Back, which nothing
 * ever writes - every design on file has null thumbnails.
 */

const ROUTE_BY_DB_PRODUCT: Record<string, DesignProduct> = {
  BUSINESS_CARD: "business-card",
  POSTCARD: "postcard",
  BANNER: "banner",
  RIGID_SIGN: "rigid-sign",
};

export default async function DesignsPage() {
  const user = await ensureUser();
  if (!user) redirect("/sign-in");

  const designs = await db.cardDesign.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, product: true, front: true, updatedAt: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">My Designs</h1>

      {designs.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-kc-muted">
            Nothing saved yet. Designs you build in the studio while signed in are kept here.
          </p>
          <Link
            href="/services/business-cards/design"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-kc-magenta-deep px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Start a design
          </Link>
          <p className="text-xs text-kc-muted">
            Designs made before signing in stay in the browser that made them. Open one from that
            browser while signed in and it will be added here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {designs.map((design) => {
            const front = CardSideSchema.safeParse(design.front);
            const segment = PRODUCT_ROUTE_SEGMENT[ROUTE_BY_DB_PRODUCT[design.product] ?? "business-card"];
            return (
              <Card key={design.id} className="overflow-hidden border-kc-border">
                <div className="border-b border-kc-border bg-kc-bg">
                  {front.success ? (
                    <div
                      className="bg-white [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: renderSideToSvg(front.data, 150) }}
                    />
                  ) : (
                    <div className="px-3 py-10 text-center text-xs text-kc-muted">No preview</div>
                  )}
                </div>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-kc-dark">{design.title}</div>
                    <div className="text-xs text-kc-muted">
                      Edited {new Date(design.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href={`/services/${segment}/design/${design.id}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-kc-border px-3 py-2 text-xs font-semibold text-kc-teal hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Open
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
