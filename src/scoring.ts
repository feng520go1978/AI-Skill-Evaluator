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
  capability: 0.35,
  lift: 0.25,
  cost: 0.1,
  speed: 0.1,
  stability: 0.1,
  security: 0.1,
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

export type Verdict = "PASS" | "CAUTION" | "FAIL" | "INCONCLUSIVE";

/** Why a run was judged INCONCLUSIVE (absent when conclusive). */
export type InconclusiveReason =
  | "baseline near-perfect — task too easy for this skill"
  | "task shows no sensitivity to the skill"
  | "insufficient sample size"
  | "effect within noise band — cannot distinguish from run variance";

export interface SkillScore {
  dimensions: {
    capability: number; // 0-100
    lift: number | null; // 0-100, null when inconclusive (displayed as n/a)
    cost: number;
    speed: number;
    stability: number;
    security: number;
  };
  overall: number; // 0-100 weighted
  verdict: Verdict;
  reasons: string[];
  /** "low" when INCONCLUSIVE — scores are advisory only. */
  reliability?: "high" | "low";
  inconclusiveReason?: InconclusiveReason;
  /** True when costUsd was priced locally (unknown model) — surfaced in reports. */
  costEstimated?: boolean;
}

/**
 * Validity pre-checks (Phase 6 §2). Run BEFORE scoring; any hit yields
 * verdict=INCONCLUSIVE with reliability=low. Thresholds calibrated on
 * Phase 5 real-skill data: frontend-design baseline 1.000/Δ0 → I1 hit;
 * tdd baseline 0.889 → correctly below the line.
 */
export function checkInconclusive(args: {
  baselinePassRate?: number; // without_skill mean pass rate
  deltaPassRate?: number; // with − without
  runsPerEval: number;
  evalCount?: number;
}): InconclusiveReason | null {
  // I3 only applies when the caller explicitly reports the sample size;
  // unknown evalCount must not trigger a false "insufficient sample".
  if (args.evalCount !== undefined && args.runsPerEval * args.evalCount < 6) {
    return "insufficient sample size";
  }
  if (
    args.baselinePassRate !== undefined &&
    args.baselinePassRate >= 0.9 &&
    (args.deltaPassRate ?? 0) <= 0.05
  ) {
    return "baseline near-perfect — task too easy for this skill";
  }
  if ((args.deltaPassRate ?? -1) === 0 && args.baselinePassRate !== undefined) {
    // zero delta with zero variance across all runs means no sensitivity at all
    return "task shows no sensitivity to the skill";
  }
  // I4 noise band (Phase 6.2): a small delta measured on an unstable baseline
  // is indistinguishable from run-to-run noise. Band width calibrated on real
  // repeated runs of the same skill+tasks: tdd measured Δ=-11pp then Δ=0pp,
  // so ±10pp would let the -11pp observation through while its own repeat says
  // it was noise — band set to ±0.15 to cover observed cross-run swing.
  if (
    args.baselinePassRate !== undefined &&
    Math.abs(args.deltaPassRate ?? 1) <= 0.15
  ) {
    return "effect within noise band — cannot distinguish from run variance";
  }
  return null;
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
/**
 * Lift score: how much better with_skill is than baseline.
 * Positive: +20pp → full marks. Negative is penalized harder than positive
 * is rewarded — a skill that actively hurts (≤ −20pp) scores 0 AND drags the
 * overall into FAIL territory via capability weighting.
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
  runsPerEval?: number;
  evalCount?: number;
}): SkillScore {
  const w = { ...DEFAULT_WEIGHTS, ...(args.weights ?? {}) };
  const b = { ...DEFAULT_BUDGETS, ...(args.budgets ?? {}) };

  const ws = args.benchmark.run_summary.with_skill;
  const delta = args.benchmark.run_summary.delta;

  // ─── validity pre-check: INCONCLUSIVE gate ──────────────────────────────
  const inconclusive = checkInconclusive({
    baselinePassRate: args.benchmark.run_summary.without_skill?.pass_rate.mean,
    deltaPassRate: delta?.pass_rate,
    runsPerEval: args.runsPerEval ?? 1,
    evalCount: args.evalCount,
  });

  const capability = Math.round(ws.pass_rate.mean * 100);
  const rawLift = scoreLift(delta?.pass_rate);
  const cost = scoreCost(ws.tokens.mean, b);
  const speed = scoreSpeed(ws.time_seconds.mean, b);
  const stability = scoreStability(ws.pass_rate.stddev);
  const sec = scoreSecurity(args.securityFindings ?? []);

  if (inconclusive) {
    return {
      dimensions: { capability, lift: null, cost, speed, stability, security: sec.score },
      overall: round1(
        w.capability * capability + w.cost * cost + w.speed * speed +
          w.stability * stability + w.security * sec.score
      ),
      verdict: "INCONCLUSIVE",
      reasons: [inconclusive],
      reliability: "low",
      inconclusiveReason: inconclusive,
    };
  }

  const lift = rawLift;
  const overall = round1(
    w.capability * capability +
      w.lift * lift +
      w.cost * cost +
      w.speed * speed +
      w.stability * stability +
      w.security * sec.score
  );

  const verdict: Verdict =
    sec.critical || overall <= 50
      ? "FAIL"
      // a skill that measurably hurts baseline by ≥20pp is harmful, not merely
      // mediocre — fail it regardless of high capability on easy tasks
      : (delta?.pass_rate !== undefined && delta.pass_rate <= -0.2) ||
          overall < 70
        ? delta && delta.pass_rate <= -0.3
          ? "FAIL"
          : "CAUTION"
        : "PASS";

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
