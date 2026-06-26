import { db } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminTestimonialActions } from "@/components/admin/AdminTestimonialActions";
import { Star } from "lucide-react";

export default async function AdminTestimonialsPage() {
  const testimonials = await db.testimonial.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-kc-dark">Testimonials</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testimonials.map((t) => (
          <Card key={t.id} className="border-kc-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-kc-dark text-sm">{t.name}</div>
                  {t.company && <div className="text-xs text-kc-muted">{t.role ? `${t.role}, ` : ""}{t.company}</div>}
                </div>
                <div className="flex gap-1.5">
                  {t.approved && <Badge className="bg-kc-sage/20 text-kc-teal border-0 text-xs">Approved</Badge>}
                  {t.featured && <Badge className="bg-kc-yellow/30 text-kc-dark border-0 text-xs">Featured</Badge>}
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-kc-yellow text-kc-yellow" />
                ))}
              </div>
              <p className="text-xs text-kc-muted line-clamp-3">{t.text}</p>
              <AdminTestimonialActions id={t.id} approved={t.approved} featured={t.featured} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
