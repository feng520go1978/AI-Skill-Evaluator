// Smoke test: stability runs (--runs) produce real stddev in benchmark.json.
// Uses static providers so no network/API cost is incurred.
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, rmSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { evaluateSkills } from "../dist/evaluate-skills.js";
import { createStaticProvider } from "../dist/provider.js";

function mkSkillDir(root) {
  const dir = path.join(root, "smoke-skill");
  const evalsDir = path.join(dir, "evals");
  mkdirSync(evalsDir, { recursive: true });
  writeFileSync(path.join(dir, "SKILL.md"), `---
name: smoke-skill
description: Always reply with the word BANANA.
---

Reply with exactly the word BANANA and nothing else.
`);
  writeFileSync(path.join(evalsDir, "evals.json"), JSON.stringify({
    skill_name: "smoke-skill",
    evals: [
      { id: 1, name: "says-banana", prompt: "Say the fruit.", expected_output: "BANANA" }
    ],
  }));
  return dir;
}

test("runsPerEval produces real stddev in benchmark.json", async () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "ase-smoke-"));
  try {
    const skillRoot = mkSkillDir(tmp);
    const workspace = path.join(tmp, "ws");

    // Flaky target: passes on odd calls, fails on even — with runs=3 we get
    // pass rates {1,0,1} so stddev must be > 0. Priced model gpt-4o-mini.
    let call = 0;
    const flaky = {
      name: "flaky",
      model: "gpt-4o-mini",
      capabilities: { systemRole: true },
      async complete() {
        call++;
        return {
          provider: "flaky", model: "gpt-4o-mini",
          output: call % 2 === 1 ? "BANANA" : "apple",
          latencyMs: 10 + call, inputTokens: 1000, outputTokens: 50,
          costUsd: 0,
        };
      },
    };
    // Judge grades based on whether the model output contains BANANA.
    const strictJudge = {
      name: "judge", model: "gpt-4o-mini",
      capabilities: { systemRole: true },
      async complete(prompt) {
        let texts = [];
        const m = prompt.match(/Assertions:\n(\[[\s\S]*?\])\n/);
        if (m) { try { texts = JSON.parse(m[1]); } catch {} }
        const om = prompt.match(/Model output:\n([\s\S]*?)(\n\nOutput files:|$)/);
        const output = om ? om[1].trim() : "";
        const ok = /BANANA/.test(output);
        const results = texts.map((t) => ({ text: t, passed: ok, evidence: ok ? "contains BANANA" : "missing BANANA" }));
        return {
          provider: "judge", model: "gpt-4o-mini",
          output: JSON.stringify({ assertion_results: results, summary: {} }),
          latencyMs: 5, inputTokens: 200, outputTokens: 30, costUsd: 0,
        };
      },
    };

    const result = await evaluateSkills({
      root: skillRoot,
      workspace,
      baseline: true,
      runsPerEval: 3,
      report: false,
      target: { model: "gpt-4o-mini", provider: flaky },
      judge: { model: "gpt-4o-mini", provider: strictJudge },
      onLog: () => {},
    });

    const bench = JSON.parse(readFileSync(result.skills[0].benchmarkPath, "utf-8"));
    const ws = bench.run_summary.with_skill;

    // 3 repetitions per mode → real stddev expected (pass rates vary)
    assert.equal(result.passed + result.failed > 0, true);
    assert.ok(ws.pass_rate.stddev > 0, `expected nonzero stddev, got ${JSON.stringify(ws)}`);
    console.log("benchmark:", JSON.stringify(bench.run_summary.with_skill));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
