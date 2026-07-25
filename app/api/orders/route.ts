import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";
import { calculateBusinessCardPrice } from "@/lib/pricing/business-cards";

const bcSpecSchema = z.object({
  sizeId: z.number(),
  paperId: z.number(),
  colorId: z.number(),
  quantity: z.number(),
  rush: z.boolean(),
  roundCorners: z.boolean(),
  manualProof: z.boolean(),
});

const schema = z.object({
  service: z.string().min(1),
  // Optional overall: business cards allow "design it myself" (no package). Enforced as required
  // for every other service below, since those don't have a real print-pricing path yet.
  selectedPackage: z.string().optional(),
  selectedAddOns: z.array(z.string()).optional().default([]),
  businessName: z.string().min(1),
  contactInfo: z.string().optional(),
  brandColors: z.string().optional(),
  notes: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  cardDesignId: z.string().optional(),
  bcSpec: bcSpecSchema.optional(),
});

export async function POST(req: Request) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { service, selectedPackage, selectedAddOns, quantity, bcSpec, ...config } = parsed.data;

  const product = await db.product.findUnique({ where: { slug: service }, include: { packages: true, addOns: true } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const packageTier = selectedPackage ? product.packages.find((p: { name: string; price: number }) => p.name === selectedPackage) : null;
  if (selectedPackage && !packageTier) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const addOnsTotal = selectedAddOns.reduce((sum: number, name: string) => {
    const ao = product.addOns.find((a: { name: string; price: number }) => a.name === name);
    return sum + (ao?.price ?? 0);
  }, 0);

  let printPrice = 0;
  let orderQuantity = quantity;

  if (service === "business-cards") {
    if (!bcSpec) return NextResponse.json({ error: "Missing print specifications" }, { status: 400 });
    const priced = calculateBusinessCardPrice(bcSpec);
    if (!priced.valid) return NextResponse.json({ error: priced.error ?? "Invalid print specifications" }, { status: 400 });
    printPrice = priced.total;
    orderQuantity = bcSpec.quantity;
  } else {
    // Every other service still requires choosing a package — its price is the whole product cost.
    if (!packageTier) return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const total = round2(printPrice + (packageTier?.price ?? 0) + addOnsTotal);

  const order = await db.order.create({
    data: {
      userId: user!.id,
      status: "DRAFT",
      total,
      items: {
        create: {
          productId: product.id,
          packageTierId: packageTier?.id ?? null,
          addOnIds: selectedAddOns,
          quantity: orderQuantity,
          price: total,
          config: { ...config, selectedAddOns, bcSpec: bcSpec ?? null },
        },
      },
    },
  });

  return NextResponse.json({ orderId: order.id });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function GET() {
  const { error, user } = await requireAuth();
  if (error) return error;

  const orders = await db.order.findMany({
    where: { userId: user!.id },
    include: { items: { include: { product: true, packageTier: true } }, project: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}
