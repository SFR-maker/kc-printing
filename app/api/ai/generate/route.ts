import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/requireAdmin";
import { db } from "@/lib/prisma";
import { generateWithOpenRouter } from "@/lib/openrouter";

const AI_TYPES = [
  "logo_concepts",
  "card_copy",
  "postcard_copy",
  "banner_headline",
  "website_copy",
  "seo_meta",
  "brand_colors",
  "brief_summary",
  "order_summary",
  "proposal",
] as const;

const schema = z.object({
  type: z.enum(AI_TYPES),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

const SYSTEM_PROMPTS: Record<typeof AI_TYPES[number], string> = {
  logo_concepts: "You are a brand identity expert. Generate 3 concise logo concept descriptions for a business. Each concept should describe the symbol, style, color direction, and mood. Keep each concept to 2-3 sentences. No em dashes.",
  card_copy: "You are a copywriter for print materials. Generate professional business card copy including a tagline, key services or title, and contact note. Keep it short and punchy. No em dashes.",
  postcard_copy: "You are a direct mail copywriter. Generate a compelling headline, subheadline, body copy (2-3 sentences), and call to action for a postcard. No em dashes.",
  banner_headline: "You are a banner copywriter. Generate 3 attention-grabbing headline options for a banner. Each should be 5-10 words and create urgency or highlight a benefit. No em dashes.",
  website_copy: "You are a website copywriter. Generate homepage copy including a hero headline, subheadline, value proposition paragraph, and 3 benefit bullets. No em dashes.",
  seo_meta: "You are an SEO specialist. Generate an SEO-optimized page title (under 60 chars) and meta description (under 160 chars) for the given page. No em dashes.",
  brand_colors: "You are a brand designer. Suggest a color palette for a brand with 3-5 colors. For each color provide the hex code, name, and suggested use. No em dashes.",
  brief_summary: "You are a creative director. Summarize a design brief into a concise 3-5 sentence creative direction paragraph. No em dashes.",
  order_summary: "You are an account manager. Write a clear, professional order summary for an admin reviewing a customer design order. No em dashes.",
  proposal: "You are a design studio account executive. Write a compelling project proposal for a web design project. Include overview, proposed solution, timeline, and next steps. No em dashes.",
};

export async function POST(req: Request) {
  const { error, user } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { type, payload } = parsed.data;

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const rateLimitSetting = await db.siteSetting.findUnique({ where: { key: "ai_rate_limit_per_hour" } });
  const limit = parseInt(rateLimitSetting?.value ?? "10", 10);

  const recentCount = await db.aiGeneration.count({
    where: { userId: user!.id, createdAt: { gte: oneHourAgo } },
  });

  if (recentCount >= limit) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in an hour." }, { status: 429 });
  }

  const modelSetting = await db.siteSetting.findUnique({ where: { key: "ai_model" } });
  const model = modelSetting?.value ?? "anthropic/claude-haiku-4-5";

  const systemPrompt = SYSTEM_PROMPTS[type];
  const userPrompt = `Context: ${JSON.stringify(payload)}. Please generate the requested content.`;

  let result;
  try {
    result = await generateWithOpenRouter({ model, systemPrompt, userPrompt });
  } catch {
    result = {
      text: "AI generation is temporarily unavailable. Please try again or contact support.",
      model,
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  await db.aiGeneration.create({
    data: {
      userId: user!.id,
      type: type as "logo_concepts",
      prompt: userPrompt.substring(0, 500),
      response: result.text.substring(0, 2000),
      model: result.model,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    },
  });

  return NextResponse.json({ text: result.text, model: result.model });
}
