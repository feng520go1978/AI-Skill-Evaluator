import assert from "node:assert/strict";
import { test } from "node:test";
import { computeCostUsd } from "../dist/pricing.js";

test("computeCostUsd prices a known model from the table", () => {
  const r = computeCostUsd({ inputTokens: 1_000_000, outputTokens: 500_000, model: "gpt-4o-mini" });
  // 0.15 * 1 + 0.6 * 0.5 = 0.45
  assert.equal(r.costUsd, 0.45);
  assert.equal(r.estimated, false);
  assert.equal(r.matchedPrice, "gpt-4o-mini");
});

test("computeCostUsd strips vendor prefixes and dated suffixes", () => {
  const r = computeCostUsd({ inputTokens: 2_000_000, outputTokens: 0, model: "openai/gpt-4o-20241120" });
  // gpt-4o input: 2.5 * 2 = 5
  assert.equal(r.costUsd, 5);
  assert.equal(r.estimated, false);
});

test("computeCostUsd longest-prefix matches sub-variants", () => {
  const r = computeCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000, model: "claude-sonnet-4-5" });
  // claude-sonnet-4: 3 + 15 = 18
  assert.equal(r.costUsd, 18);
  assert.equal(r.matchedPrice, "claude-sonnet-4");
});

test("computeCostUsd flags unknown models as estimated", () => {
  const r = computeCostUsd({ inputTokens: 1_000_000, outputTokens: 1_000_000, model: "mystery-model-xl" });
  // fallback 1 + 4 = 5
  assert.equal(r.costUsd, 5);
  assert.equal(r.estimated, true);
});

test("computeCostUsd prefers API-reported costs when present", () => {
  const r = computeCostUsd({ apiCostUsd: 0.123456, inputTokens: 999, outputTokens: 999, model: "mystery" });
  assert.equal(r.costUsd, 0.123456);
  assert.equal(r.estimated, false);
});
