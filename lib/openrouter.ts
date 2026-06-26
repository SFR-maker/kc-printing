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
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "KC Printing",
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
