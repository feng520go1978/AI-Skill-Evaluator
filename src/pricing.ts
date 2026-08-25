// Pricing table + cost calculator for AI-Skill-Evaluator.
//
// The upstream SDK reads `usage.costs` from the API response, but most
// OpenAI-compatible endpoints do not return it, so costUsd silently stays 0.
// This module computes real USD cost from input/output token counts using a
// local price table. Prices are USD per 1M tokens (blended where tiers exist).
//
// Prices last verified: 2026-08. Unknown models fall back to an explicit
// estimate flag so reports never present a guess as fact.

export interface ModelPrice {
  /** USD per 1M input tokens. */
  inputPerMillion: number;
  /** USD per 1M output tokens. */
  outputPerMillion: number;
}

const PRICES: Record<string, ModelPrice> = {
  // OpenAI
  "gpt-4o": { inputPerMillion: 2.5, outputPerMillion: 10 },
  "gpt-4o-mini": { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  "gpt-4.1": { inputPerMillion: 2, outputPerMillion: 8 },
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-4.1-nano": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  "o3": { inputPerMillion: 2, outputPerMillion: 8 },
  "o4-mini": { inputPerMillion: 1.1, outputPerMillion: 4.4 },
  // Anthropic (via OpenAI-compatible gateways)
  "claude-opus-4": { inputPerMillion: 15, outputPerMillion: 75 },
  "claude-sonnet-4": { inputPerMillion: 3, outputPerMillion: 15 },
  "claude-haiku-4": { inputPerMillion: 0.8, outputPerMillion: 4 },
  // Google (via OpenAI-compatible gateways)
  "gemini-2.5-pro": { inputPerMillion: 1.25, outputPerMillion: 10 },
  "gemini-2.5-flash": { inputPerMillion: 0.3, outputPerMillion: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  // DeepSeek
  "deepseek-chat": { inputPerMillion: 0.27, outputPerMillion: 1.1 },
  "deepseek-reasoner": { inputPerMillion: 0.55, outputPerMillion: 2.19 },
};

export interface CostEstimate {
  costUsd: number;
  /** True when the model was not in the price table and a fallback was used. */
  estimated: boolean;
  matchedPrice?: string;
}

function normalizeModelName(model: string): string {
  const lower = model.toLowerCase();
  // strip vendor prefixes used by gateways ("openai/gpt-4o", "anthropic/claude-...")
  const tail = lower.includes("/") ? lower.slice(lower.lastIndexOf("/") + 1) : lower;
  // strip dated suffixes like "-20241022" / ":latest"
  return tail.replace(/-\d{6,8}$/, "").replace(/:.*$/, "");
}

/** Longest-prefix match so "claude-sonnet-4-5" resolves to "claude-sonnet-4". */
function lookup(model: string): { price: ModelPrice; key: string } | undefined {
  let best: string | undefined;
  for (const key of Object.keys(PRICES)) {
    if ((model === key || model.startsWith(key + "-")) && (best === undefined || key.length > best.length)) {
      best = key;
    }
  }
  return best ? { price: PRICES[best], key: best } : undefined;
}

const FALLBACK_PRICE: ModelPrice = { inputPerMillion: 1, outputPerMillion: 4 };

/**
 * Compute USD cost for one provider call.
 *
 * If the API returned a real cost (`usage.costs`), it wins verbatim.
 * Otherwise we price tokens from the local table; unknown models use a
 * conservative fallback and are flagged `estimated`.
 */
export function computeCostUsd(args: {
  apiCostUsd?: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
}): CostEstimate {
  if (typeof args.apiCostUsd === "number" && args.apiCostUsd > 0) {
    return { costUsd: args.apiCostUsd, estimated: false };
  }
  const hit = lookup(normalizeModelName(args.model));
  if (!hit) {
    const fallback =
      (args.inputTokens / 1_000_000) * FALLBACK_PRICE.inputPerMillion +
      (args.outputTokens / 1_000_000) * FALLBACK_PRICE.outputPerMillion;
    return { costUsd: round6(fallback), estimated: true };
  }
  const cost =
    (args.inputTokens / 1_000_000) * hit.price.inputPerMillion +
    (args.outputTokens / 1_000_000) * hit.price.outputPerMillion;
  return { costUsd: round6(cost), estimated: false, matchedPrice: hit.key };
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
