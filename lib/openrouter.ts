import { APP_URL } from "@/lib/app-url";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

export interface GenerateOptions {
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export interface GenerateResult {
  text: string;
  model: string;
  tokensUsed: number;
  costUsd: number;
}

export async function generateWithOpenRouter(opts: GenerateOptions): Promise<GenerateResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "mock_test_key" || process.env.NODE_ENV === "test") {
    return {
      text: "[AI generation placeholder - add OPENROUTER_API_KEY to enable]",
      model: opts.model ?? "mock",
      tokensUsed: 0,
      costUsd: 0,
    };
  }

  const model = opts.model ?? "anthropic/claude-haiku-4-5";
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": APP_URL,
      "X-Title": "611 Printing",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      max_tokens: opts.maxTokens ?? 500,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
    model: string;
    usage: { total_tokens: number };
  };

  const text = data.choices[0]?.message?.content ?? "";
  const tokensUsed = data.usage?.total_tokens ?? 0;
  const costUsd = tokensUsed * 0.000001;

  return { text, model: data.model ?? model, tokensUsed, costUsd };
}

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
}

export interface GenerateImageResult {
  /** data: URL (e.g. "data:image/png;base64,...") */
  dataUrl: string;
  model: string;
}

const NANO_BANANA_MODEL = "google/gemini-3.1-flash-image";

/**
 * Generates an image via OpenRouter's Gemini image models ("nano banana"). Unlike
 * generateWithOpenRouter, this has no dev/test fallback — callers that need graceful
 * degradation (e.g. a customer-facing feature) should catch and handle failures themselves,
 * since a placeholder image isn't a meaningful fallback the way placeholder text is.
 */
export async function generateImageWithOpenRouter(opts: GenerateImageOptions): Promise<GenerateImageResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const model = opts.model ?? NANO_BANANA_MODEL;
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": APP_URL,
      "X-Title": "611 Printing",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: opts.prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter image error: ${err}`);
  }

  const data = await res.json() as {
    model: string;
    choices: { message: { images?: { image_url: { url: string } }[] } }[];
  };

  const dataUrl = data.choices[0]?.message?.images?.[0]?.image_url?.url;
  if (!dataUrl) throw new Error("OpenRouter returned no image");

  return { dataUrl, model: data.model ?? model };
}
