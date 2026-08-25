// Six-dimension scoring engine for AI-Skill-Evaluator.
//
// Consumes the aggregated BenchmarkJson (with/without skill stats) plus
// per-run grading results and static-analysis findings, and produces a
// weighted 0-100 overall score with a three-tier verdict.
//
// Dimension model (adapted from Evol-ai/SkillCompass, reweighted for
// empirical measurement rather than LLM self-assessment):
//   capability  30% — mean pass rate of with_skill runs (judge-graded)
//   lift        25% — improvement over the without_skill baseline
//   cost        15% — token spend per run, scored against a budget
//   speed       10% — wall-clock seconds per run vs budget
//   stability   15% — 1 − normalized stddev of pass rate across runs
//   security    5%+gate — static analysis findings; Critical forces FAIL

import type { BenchmarkJson } from "./types.js";

export interface SecurityFinding {
  severity: "critical" | "high" | "medium" | "low";
  rule: string;
  detail: string;
}

export interface ScoreWeights {
  capability: number;
  lift: number;
  cost: number;
  speed: number;
  stability: number;
  security: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  capability: 0.3,
  lift: 0.25,
  cost: 0.15,
  speed: 0.1,
  stability: 0.15,
  security: 0.05,
};

/** Scoring budgets — what "good" looks like. Configurable per run. */
export interface ScoreBudgets {
  /** Token spend per with_skill run considered fully acceptable. */
  costTokensMean: number;
  /** Token spend per run at which the cost dimension scores zero. */
  costTokensMax: number;
  /** Wall-clock seconds per run considered fully acceptable. */
  speedSeconds: number;
  /** Seconds per run at which speed scores zero. */
  speedSecondsMax: number;
}

export const DEFAULT_BUDGETS: ScoreBudgets = {
  costTokensMean: 2_000,
  costTokensMax: 50_000,
  speedSeconds: 5,
  speedSecondsMax: 60,
};

export type Verdict = "PASS" | "CAUTION" | "FAIL";

export interface SkillScore {
  dimensions: {
    capability: number; // 0-100
    lift: number;      // 0-100 (null baseline → neutral 50)
    cost: number;
    speed: number;
    stability: number;
    security: number;
  };
  overall: number; // 0-100 weighted
  verdict: Verdict;
  reasons: string[];
  /** True when costUsd was priced locally (unknown model) — surfaced in reports. */
  costEstimated?: boolean;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Lift score: how much better with_skill is than baseline.
 * A +20pp pass-rate delta maps to full marks; negative deltas score low.
 */
function scoreLift(deltaPassRate: number | undefined): number {
  if (deltaPassRate === undefined) return 50; // no baseline run — neutral
  // +0.20 or more → 100; 0 → 40; ≤ −0.10 → 0
  if (deltaPassRate >= 0.2) return 100;
  if (deltaPassRate <= -0.1) return 0;
  if (deltaPassRate >= 0) return Math.round(40 + (deltaPassRate / 0.2) * 60);
  return Math.round(40 * (1 + deltaPassRate / 0.1));
}

function scoreCost(tokensPerRun: number, b: ScoreBudgets): number {
  if (tokensPerRun <= b.costTokensMean) return 100;
  if (tokensPerRun >= b.costTokensMax) return 0;
  // log-ish falloff between comfortable and unacceptable
  const t = clamp01(
    Math.log(tokensPerRun / b.costTokensMean) /
      Math.log(b.costTokensMax / b.costTokensMean)
  );
  return Math.round((1 - t) * 100);
}

function scoreSpeed(secondsPerRun: number, b: ScoreBudgets): number {
  if (secondsPerRun <= b.speedSeconds) return 100;
  if (secondsPerRun >= b.speedSecondsMax) return 0;
  const t = clamp01(
    (secondsPerRun - b.speedSeconds) / (b.speedSecondsMax - b.speedSeconds)
  );
  return Math.round((1 - t) * 100);
}

/** Stability: penalize pass-rate variance across repeated runs. */
function scoreStability(stddevPassRate: number): number {
  // stddev 0 → 100; ≥ 0.25 → 0 (a coin-flip skill is worthless)
  return Math.round(clamp01(1 - stddevPassRate / 0.25) * 100);
}

/** Security: findings-driven; any critical caps at 0 and gates the verdict. */
function scoreSecurity(findings: SecurityFinding[]): { score: number; critical: boolean } {
  if (findings.length === 0) return { score: 100, critical: false };
  const critical = findings.some((f) => f.severity === "critical");
  let penalty = 0;
  for (const f of findings) {
    penalty += f.severity === "critical" ? 100 : f.severity === "high" ? 40 : f.severity === "medium" ? 15 : 5;
  }
  return { score: critical ? 0 : Math.max(0, 100 - penalty), critical };
}

export function scoreSkill(args: {
  benchmark: BenchmarkJson;
  securityFindings?: SecurityFinding[];
  weights?: Partial<ScoreWeights>;
  budgets?: Partial<ScoreBudgets>;
}): SkillScore {
  const w = { ...DEFAULT_WEIGHTS, ...(args.weights ?? {}) };
  const b = { ...DEFAULT_BUDGETS, ...(args.budgets ?? {}) };

  const ws = args.benchmark.run_summary.with_skill;
  const delta = args.benchmark.run_summary.delta;

  const capability = Math.round(ws.pass_rate.mean * 100);
  const lift = scoreLift(delta?.pass_rate);
  const cost = scoreCost(ws.tokens.mean, b);
  const speed = scoreSpeed(ws.time_seconds.mean, b);
  const stability = scoreStability(ws.pass_rate.stddev);
  const sec = scoreSecurity(args.securityFindings ?? []);

  const overall = round1(
    w.capability * capability +
      w.lift * lift +
      w.cost * cost +
      w.speed * speed +
      w.stability * stability +
      w.security * sec.score
  );

  const verdict: Verdict =
    sec.critical || overall < 50 ? "FAIL" : overall < 70 ? "CAUTION" : "PASS";

  const reasons: string[] = [];
  if (capability < 70) reasons.push(`capability low: ${(ws.pass_rate.mean * 100).toFixed(0)}% of judge assertions passed`);
  if (lift < 40 && delta) reasons.push(`weak lift over baseline: ${(delta.pass_rate * 100).toFixed(0)}pp`);
  if (delta && delta.pass_rate < 0) reasons.push("skill made outputs WORSE than baseline — consider uninstalling");
  if (cost < 40) reasons.push(`token-heavy: ${Math.round(ws.tokens.mean)} tokens/run`);
  if (speed < 40) reasons.push(`slow: ${ws.time_seconds.mean.toFixed(1)}s/run`);
  if (stability < 60) reasons.push(`unstable: pass-rate stddev ${ws.pass_rate.stddev.toFixed(2)} across runs`);
  for (const f of args.securityFindings ?? []) reasons.push(`security [${f.severity}] ${f.rule}: ${f.detail}`);
  if (reasons.length === 0) reasons.push("no issues flagged");

  return {
    dimensions: { capability, lift, cost, speed, stability, security: sec.score },
    overall,
    verdict,
    reasons,
  };
}
