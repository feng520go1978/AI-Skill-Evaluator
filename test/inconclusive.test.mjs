import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreSkill, checkInconclusive, DEFAULT_WEIGHTS } from "../dist/scoring.js";

function bench(withStats, withoutStats, delta) {
  const run_summary = { with_skill: withStats };
  if (withoutStats) run_summary.without_skill = withoutStats;
  if (delta) run_summary.delta = delta;
  return { run_summary };
}

const goodWith = { pass_rate: { mean: 0.95, stddev: 0.05 }, time_seconds: { mean: 3, stddev: 0.5 }, tokens: { mean: 1500, stddev: 100 } };

test("I1: baseline near-perfect + tiny delta -> INCONCLUSIVE", () => {
  const s = scoreSkill({
    benchmark: bench(goodWith,
      { pass_rate: { mean: 1, stddev: 0 }, time_seconds: { mean: 2, stddev: 0 }, tokens: { mean: 1000, stddev: 0 } },
      { pass_rate: 0, time_seconds: 0, tokens: 0 }),
    runsPerEval: 3,
    evalCount: 3,
  });
  assert.equal(s.verdict, "INCONCLUSIVE");
  assert.equal(s.reliability, "low");
  assert.ok(s.inconclusiveReason.includes("too easy"));
  assert.equal(s.dimensions.lift, null);
});

test("tdd case (base 0.889, delta -11pp) -> INCONCLUSIVE via I4 noise band", () => {
  const s = scoreSkill({
    benchmark: bench(
      { pass_rate: { mean: 0.778, stddev: 0.31 }, time_seconds: { mean: 4, stddev: 0 }, tokens: { mean: 1607, stddev: 100 } },
      { pass_rate: { mean: 0.889, stddev: 0.1 }, time_seconds: { mean: 3, stddev: 0 }, tokens: { mean: 742, stddev: 50 } },
      { pass_rate: -0.111, time_seconds: -1, tokens: -200 }),
    runsPerEval: 3,
    evalCount: 3,
  });
  // Phase 6.2: repeated runs of this skill measured -11pp then 0pp — the
  // signal is within cross-run noise, so the honest verdict is INCONCLUSIVE.
  assert.equal(s.verdict, "INCONCLUSIVE");
  assert.ok(s.inconclusiveReason.includes("noise band"));
});

test("large negative delta (-30pp) still FAILs — real harm is not noise", () => {
  const s = scoreSkill({
    benchmark: bench(
      { pass_rate: { mean: 0.4, stddev: 0.1 }, time_seconds: { mean: 4, stddev: 0 }, tokens: { mean: 1607, stddev: 100 } },
      { pass_rate: { mean: 0.889, stddev: 0.05 }, time_seconds: { mean: 3, stddev: 0 }, tokens: { mean: 742, stddev: 50 } },
      { pass_rate: -0.3, time_seconds: -1, tokens: -200 }),
    runsPerEval: 3,
    evalCount: 3,
  });
  assert.notEqual(s.verdict, "INCONCLUSIVE");
  assert.equal(s.verdict, "FAIL");
});

test("I3: small sample flagged only when evalCount reported", () => {
  assert.equal(checkInconclusive({ baselinePassRate: 0.5, runsPerEval: 2, evalCount: 2 }), "insufficient sample size");
  assert.equal(checkInconclusive({ baselinePassRate: 0.5, runsPerEval: 2 }), null);
});

test("new weights sum to 1", () => {
  const w = Object.values(DEFAULT_WEIGHTS);
  assert.ok(Math.abs(w.reduce((a, b) => a + b, 0) - 1) < 1e-9);
});
