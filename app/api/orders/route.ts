import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";

const schema = z.object({
  service: z.string().min(1),
  selectedPackage: z.string().min(1),
  selectedAddOns: z.array(z.string()).optional().default([]),
  businessName: z.string().min(1),
  contactInfo: z.string().optional(),
  brandColors: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  cardDesignId: z.string().optional(),
});

export async function POST(req: Request) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { service, selectedPackage, selectedAddOns, quantity, ...config } = parsed.data;

  const product = await db.product.findUnique({ where: { slug: service }, include: { packages: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const packageTier = product.packages.find((p: { name: string; price: number }) => p.name === selectedPackage);
  if (!packageTier) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const order = await db.order.create({
    data: {
      userId: user!.id,
      status: "DRAFT",
      total: packageTier.price * quantity,
      items: {
        create: {
          productId: product.id,
          packageTierId: packageTier.id,
          addOnIds: selectedAddOns,
          quantity,
          price: packageTier.price * quantity,
          config: { ...config, selectedAddOns },
        },
      },
    },
  });

  return NextResponse.json({ orderId: order.id });
}

export async function GET(req: Request) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const orders = await db.order.findMany({
    where: { userId: user!.id },
    include: { items: { include: { product: true, packageTier: true } }, project: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
