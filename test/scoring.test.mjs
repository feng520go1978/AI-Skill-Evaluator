import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreSkill } from "../dist/scoring.js";


function bench(withStats, delta) {
  const run_summary = { with_skill: withStats };
  if (delta) run_summary.delta = delta;
  return { run_summary };
}

test("a strong skill scores PASS", () => {
  const s = scoreSkill({
    benchmark: bench({
      pass_rate: { mean: 0.95, stddev: 0.05 },
      time_seconds: { mean: 3, stddev: 0.5 },
      tokens: { mean: 1500, stddev: 100 },
    }, { pass_rate: 0.25, time_seconds: 1, tokens: 500 }),
  });
  assert.equal(s.verdict, "PASS");
  assert.ok(s.overall >= 70);
});

test("negative lift is flagged as worse-than-baseline", () => {
  const s = scoreSkill({
    benchmark: bench({
      pass_rate: { mean: 0.5, stddev: 0 },
      time_seconds: { mean: 2, stddev: 0 },
      tokens: { mean: 1000, stddev: 0 },
    }, { pass_rate: -0.15, time_seconds: -1, tokens: -200 }),
  });
  assert.ok(s.dimensions.lift < 20);
  assert.ok(s.reasons.some((r) => r.includes("WORSE")));
});

test("unstable skill (high stddev) gets penalized", () => {
  const stable = scoreSkill({ benchmark: bench({ pass_rate: { mean: 0.9, stddev: 0.02 }, time_seconds: { mean: 2, stddev: 0 }, tokens: { mean: 1000, stddev: 0 } }) });
  const flaky = scoreSkill({ benchmark: bench({ pass_rate: { mean: 0.9, stddev: 0.3 }, time_seconds: { mean: 2, stddev: 0 }, tokens: { mean: 1000, stddev: 0 } }) });
  assert.ok(flaky.dimensions.stability < 10);
  assert.ok(flaky.overall < stable.overall);
});

test("critical security finding forces FAIL regardless of score", () => {
  const findings = [
    { severity: "critical", rule: "exfiltration-url", detail: "posts to http://evil.example" },
  ];
  const s = scoreSkill({
    benchmark: bench({ pass_rate: { mean: 1, stddev: 0 }, time_seconds: { mean: 1, stddev: 0 }, tokens: { mean: 500, stddev: 0 } }),
    securityFindings: findings,
  });
  assert.equal(s.verdict, "FAIL");
  assert.equal(s.dimensions.security, 0);
});

test("no baseline → neutral lift (50)", () => {
  const s = scoreSkill({
    benchmark: bench({ pass_rate: { mean: 0.8, stddev: 0 }, time_seconds: { mean: 2, stddev: 0 }, tokens: { mean: 1000, stddev: 0 } }),
  });
  assert.equal(s.dimensions.lift, 50);
});
