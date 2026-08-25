# Changelog

All notable changes to this project. Format based on [Keep a Changelog](https://keepachangelog.com/); versioning aims for [SemVer](https://semver.org/).

## [0.2.0] - 2026-08-25

### Added
- Six-dimension scoring engine (`capability/lift/cost/speed/stability/security`) → 0–100 overall + verdict
- Verdicts: `PASS` / `CAUTION` / `FAIL` / `INCONCLUSIVE`
- Four INCONCLUSIVE validity gates: baseline near-perfect (I1), zero sensitivity (I2), insufficient sample (I3), effect-within-noise-band (I4)
- Harmful-lift gate: Δ ≤ −20pp forces CAUTION, Δ ≤ −30pp or overall ≤ 50 forces FAIL regardless of other dimensions
- `pricing.ts`: local price table for 15 models; vendor-prefix/date-suffix normalization; unknown models flagged `estimated`; API-reported costs win when present
- Security scanner (`security.ts`): 14 regex rules across secrets / exfiltration / destructive commands / prompt-injection; critical findings gate verdict to FAIL
- Stability testing: `--runs N` repeats per eval; results feed mean/stddev aggregation
- Judge cost accounting: `judge_cost_usd` / `judge_tokens` in timing.json; three-way `evaluation_cost` (skill_cost / eval_overhead / total_eval_cost) in score.json
- CLI: `--runs`, config `runs`, quiet mode for `--log-format silent`

### Changed
- Weights recalibrated: capability .30→.35, cost .15→.10, stability .15→.10, security .05→.10
- `cost_usd` propagated through timing → RunStats → AggStats → benchmark delta (was dropped)
- README rewritten for this fork; package renamed `ai-skill-evaluator`

### Validated
- Three rounds of real-skill testing (4 skills × baseline × runs=3): effective skill stable PASS (+22pp × 3), weak skill converged INCONCLUSIVE, too-easy tasks gated from false highs, negative round caught as FAIL — see `docs/phase62-final-validation-report.md`

## [0.1.0] - 2026-08-25

### Added
- Fork of [agent-skills-eval](https://github.com/darkrishabh/agent-skills-eval) v0.1.1 (MIT by Rishabh Mehan): skill discovery, SKILL.md validation, with/without baseline harness, LLM judge, tool-call assertions, HTML reports, OpenAI-compatible provider
